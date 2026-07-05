# downtime-attestation Implementation Plan

**Goal:** Detect downtime strictly from `order_expired` + its refund evidence (never a raw refund), maintain
per-target uptime state, build the structured-JSON uptime certificate that cites each incident's refund tx,
and run Deadman's provider side that sells those certificates.
**Architecture:** `DowntimeDetector` subscribes to a `CapEventStream` and updates an `AttestationStore`
(completed → uptime; expired → a downtime incident citing `refundTxHash`; rejected → neutral, NOT downtime).
`buildCertificate` projects the store into an `UptimeCertificate`. `AttestationProvider` accepts buyer
negotiations for Deadman's DID and delivers the certificate for the requested target.
**Tech Stack:** TypeScript ^5.6 (strict, NodeNext), vitest ^2.1.
**Source spec:** docs/superpowers/specs/2026-07-05-deadman-design.md

> **ESM rule:** relative imports carry `.js`; `import type` for types; never `as any`. Never a secret value.

---

### Task 1: Attestation store

**Files:**
- Create: `src/attestation/attestation-store.ts`
- Test:   `src/attestation/attestation-store.test.ts`

**Depends on:** foundation Task 2, foundation Task 4
**Effort:** medium
**Provides:** `AttestationStore`, `TargetRecord`
**Requires:** `DowntimeIncident`, `Did`, `OrderStatus`

- [ ] **Step 1: Write the failing test**
      ```ts
      import { test, expect } from 'vitest';
      import { AttestationStore } from './attestation-store.js';

      test('completed heartbeats count toward uptime; no incidents', () => {
        const store = new AttestationStore();
        store.recordCompleted('did:t');
        store.recordCompleted('did:t');
        const rec = store.get('did:t');
        expect(rec?.totalHeartbeats).toBe(2);
        expect(rec?.completedHeartbeats).toBe(2);
        expect(rec?.incidents ?? []).toHaveLength(0);
        expect(rec?.lastResolvedStatus).toBe('completed');
      });

      test('expiry records a downtime incident citing the refund tx', () => {
        const store = new AttestationStore();
        store.recordCompleted('did:t');
        store.recordDowntime('did:t', { orderId: 'o2', expiredAt: 50, refundTxHash: '0xrefund', slaMinutes: 1 });
        const rec = store.get('did:t');
        expect(rec?.totalHeartbeats).toBe(2);
        expect(rec?.completedHeartbeats).toBe(1);
        expect(rec?.incidents).toHaveLength(1);
        expect(rec?.incidents[0]?.refundTxHash).toBe('0xrefund');
        expect(rec?.lastResolvedStatus).toBe('expired');
      });

      test('a provider-reject is neutral: not downtime, not counted against uptime', () => {
        const store = new AttestationStore();
        store.recordCompleted('did:t');
        store.recordRejected('did:t');
        const rec = store.get('did:t');
        expect(rec?.totalHeartbeats).toBe(1);           // reject not added to total
        expect(rec?.incidents ?? []).toHaveLength(0);   // reject is NOT downtime
        expect(rec?.lastResolvedStatus).toBe('rejected');
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/attestation/attestation-store.test.ts`
      Expected: FAIL — cannot find module `./attestation-store.js`
- [ ] **Step 3: Implement the store**
      Upstream: `DowntimeIncident` (from `src/domain/certificate.ts`) is
      `{ orderId; expiredAt; refundTxHash; slaMinutes }`; `OrderStatus` is
      `'created'|'paid'|'completed'|'rejected'|'expired'`.
      ```ts
      import type { DowntimeIncident } from '../domain/certificate.js';
      import type { Did, OrderStatus } from '../domain/types.js';

      export interface TargetRecord {
        targetDid: Did;
        totalHeartbeats: number;
        completedHeartbeats: number;
        incidents: DowntimeIncident[];
        lastResolvedStatus: OrderStatus | 'none';
      }

      export class AttestationStore {
        private readonly records = new Map<Did, TargetRecord>();

        private ensure(did: Did): TargetRecord {
          let rec = this.records.get(did);
          if (!rec) {
            rec = { targetDid: did, totalHeartbeats: 0, completedHeartbeats: 0, incidents: [],
              lastResolvedStatus: 'none' };
            this.records.set(did, rec);
          }
          return rec;
        }

        recordCompleted(did: Did): void {
          const rec = this.ensure(did);
          rec.totalHeartbeats += 1;
          rec.completedHeartbeats += 1;
          rec.lastResolvedStatus = 'completed';
        }

        recordDowntime(did: Did, incident: DowntimeIncident): void {
          const rec = this.ensure(did);
          rec.totalHeartbeats += 1;
          rec.incidents.push(incident);
          rec.lastResolvedStatus = 'expired';
        }

        recordRejected(did: Did): void {
          const rec = this.ensure(did);
          rec.lastResolvedStatus = 'rejected';
        }

        get(did: Did): TargetRecord | undefined {
          const rec = this.records.get(did);
          return rec ? { ...rec, incidents: [...rec.incidents] } : undefined;
        }

        listTargets(): Did[] {
          return [...this.records.keys()];
        }
      }
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/attestation/attestation-store.test.ts`
      Expected: PASS — "3 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(attestation): per-target uptime store`

---

### Task 2: Downtime detector (expiry-keyed) — the thesis test

**Files:**
- Create: `src/attestation/downtime-detector.ts`
- Test:   `src/attestation/downtime-detector.test.ts`

**Depends on:** Task 1, mock-cap Task 1, mock-cap Task 6, foundation Task 2, foundation Task 3
**Effort:** high
**Provides:** `DowntimeDetector`
**Requires:** `AttestationStore`, `CapEventStream`, `CapEvent`, `EventType`, `Did`, `createMockEnvironment`, `ManualClock`

- [ ] **Step 1: Write the failing test**
      This is the load-bearing correctness test for the whole product: a killed target's expiry becomes a
      downtime incident (with the refund tx), while a declining target's provider-reject — which ALSO emits
      a refund — is NOT recorded as downtime.
      ```ts
      import { test, expect } from 'vitest';
      import { ManualClock } from '../cap/clock.js';
      import { createMockEnvironment } from '../cap/environment.js';
      import { AttestationStore } from './attestation-store.js';
      import { DowntimeDetector } from './downtime-detector.js';

      async function flush(): Promise<void> {
        for (let i = 0; i < 50; i++) await Promise.resolve();
      }

      test('records downtime on expiry but NOT on provider-reject (a refund alone is not downtime)', async () => {
        const clock = new ManualClock();
        const env = createMockEnvironment({ clock, msPerSlaMinute: 1000, autoDeliverMs: 100 });
        env.control?.registerTarget('did:dead');
        env.control?.registerTarget('did:declining', { rejectAfterPay: true });
        const store = new AttestationStore();
        const detector = new DowntimeDetector(store);
        const req = env.forAgent('did:req');
        detector.attach(await req.connectWebSocket());

        const n1 = await req.negotiateOrder(
          { requesterDid: 'did:req', providerDid: 'did:dead', amountUsdc: '0.01', slaMinutes: 1 });
        const o1 = (await req.listOrders({ providerDid: 'did:dead' })).find((o) => o.negotiationId === n1.id);
        await req.payOrder(o1?.id ?? '');
        env.control?.killTarget('did:dead');
        clock.advance(1200);
        await flush();

        const n2 = await req.negotiateOrder(
          { requesterDid: 'did:req', providerDid: 'did:declining', amountUsdc: '0.01', slaMinutes: 1 });
        const o2 = (await req.listOrders({ providerDid: 'did:declining' })).find((o) => o.negotiationId === n2.id);
        await req.payOrder(o2?.id ?? '');
        clock.advance(150);
        await flush();

        expect(store.get('did:dead')?.incidents ?? []).toHaveLength(1);
        expect(store.get('did:dead')?.incidents[0]?.refundTxHash).toMatch(/^0x/);
        expect(store.get('did:declining')?.incidents ?? []).toHaveLength(0);
        expect(store.get('did:declining')?.lastResolvedStatus).toBe('rejected');
      });

      test('completed heartbeats are recorded as uptime', async () => {
        const clock = new ManualClock();
        const env = createMockEnvironment({ clock, msPerSlaMinute: 1000, autoDeliverMs: 100 });
        env.control?.registerTarget('did:alive');
        const store = new AttestationStore();
        new DowntimeDetector(store).attach(await env.forAgent('did:req').connectWebSocket());
        const req = env.forAgent('did:req');
        const n = await req.negotiateOrder(
          { requesterDid: 'did:req', providerDid: 'did:alive', amountUsdc: '0.01', slaMinutes: 1 });
        const o = (await req.listOrders({ providerDid: 'did:alive' })).find((x) => x.negotiationId === n.id);
        await req.payOrder(o?.id ?? '');
        clock.advance(150);
        await flush();
        expect(store.get('did:alive')?.completedHeartbeats).toBe(1);
        expect(store.get('did:alive')?.incidents ?? []).toHaveLength(0);
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/attestation/downtime-detector.test.ts`
      Expected: FAIL — cannot find module `./downtime-detector.js`
- [ ] **Step 3: Implement the detector**
      Upstream: `CapEventStream.on(type, handler)`; `CapEvent` carries
      `{ type; orderId; providerDid; status; slaMinutes; refundTxHash; timestamp; ... }`;
      `EventType.OrderCompleted/OrderExpired/OrderRejected` are the wire names; `AttestationStore` has
      `recordCompleted(did)`, `recordDowntime(did, incident)`, `recordRejected(did)`.
      **Downtime is keyed on `order_expired` ONLY** — `order_rejected` (which also refunds) is neutral.
      ```ts
      import type { AttestationStore } from './attestation-store.js';
      import type { CapEventStream } from '../domain/cap-client.js';
      import { EventType } from '../domain/types.js';

      export class DowntimeDetector {
        constructor(private readonly store: AttestationStore) {}

        attach(stream: CapEventStream): void {
          stream.on(EventType.OrderCompleted, (e) => {
            this.store.recordCompleted(e.providerDid);
          });
          stream.on(EventType.OrderExpired, (e) => {
            if (e.refundTxHash === null) return; // an expiry without refund evidence is not counted
            this.store.recordDowntime(e.providerDid, {
              orderId: e.orderId,
              expiredAt: e.timestamp,
              refundTxHash: e.refundTxHash,
              slaMinutes: e.slaMinutes,
            });
          });
          stream.on(EventType.OrderRejected, (e) => {
            this.store.recordRejected(e.providerDid); // provider-reject refund is NOT downtime
          });
        }
      }
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/attestation/downtime-detector.test.ts`
      Expected: PASS — "2 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(attestation): expiry-keyed downtime detector`

---

### Task 3: Certificate builder

**Files:**
- Create: `src/attestation/certificate-builder.ts`
- Test:   `src/attestation/certificate-builder.test.ts`

**Depends on:** Task 1, foundation Task 2, foundation Task 4
**Effort:** medium
**Provides:** `buildCertificate`
**Requires:** `AttestationStore`, `UptimeCertificate`, `UptimeStatus`, `DowntimeIncident`, `Did`

- [ ] **Step 1: Write the failing test**
      ```ts
      import { test, expect } from 'vitest';
      import { AttestationStore } from './attestation-store.js';
      import { buildCertificate } from './certificate-builder.js';

      test('healthy certificate when there are no incidents', () => {
        const store = new AttestationStore();
        store.recordCompleted('did:t');
        const cert = buildCertificate('did:t', 'did:deadman', store, 100);
        expect(cert.status).toBe('healthy');
        expect(cert.uptimeRatio).toBe(1);
        expect(cert.downtimeIncidents).toHaveLength(0);
        expect(cert.issuerDid).toBe('did:deadman');
        expect(cert.schemaVersion).toBe('1.0');
      });

      test('down certificate cites the refund tx of the latest expiry', () => {
        const store = new AttestationStore();
        store.recordCompleted('did:t');
        store.recordDowntime('did:t', { orderId: 'o2', expiredAt: 50, refundTxHash: '0xrefund', slaMinutes: 1 });
        const cert = buildCertificate('did:t', 'did:deadman', store, 100);
        expect(cert.status).toBe('down');
        expect(cert.totalHeartbeats).toBe(2);
        expect(cert.completedHeartbeats).toBe(1);
        expect(cert.uptimeRatio).toBe(0.5);
        expect(cert.downtimeIncidents[0]?.refundTxHash).toBe('0xrefund');
      });

      test('degraded certificate after recovery from a past incident', () => {
        const store = new AttestationStore();
        store.recordDowntime('did:t', { orderId: 'o1', expiredAt: 10, refundTxHash: '0xr', slaMinutes: 1 });
        store.recordCompleted('did:t');
        const cert = buildCertificate('did:t', 'did:deadman', store, 100);
        expect(cert.status).toBe('degraded');
      });

      test('unknown target yields a healthy, evidence-free certificate', () => {
        const cert = buildCertificate('did:unknown', 'did:deadman', new AttestationStore(), 100);
        expect(cert.status).toBe('healthy');
        expect(cert.totalHeartbeats).toBe(0);
        expect(cert.uptimeRatio).toBe(1);
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/attestation/certificate-builder.test.ts`
      Expected: FAIL — cannot find module `./certificate-builder.js`
- [ ] **Step 3: Implement the builder**
      Upstream: `AttestationStore.get(did): TargetRecord | undefined` where `TargetRecord` is
      `{ targetDid; totalHeartbeats; completedHeartbeats; incidents: DowntimeIncident[]; lastResolvedStatus }`.
      `UptimeCertificate` (from `src/domain/certificate.ts`) is
      `{ schemaVersion: '1.0'; targetDid; issuerDid; issuedAt; windowStart; windowEnd; totalHeartbeats;
      completedHeartbeats; downtimeIncidents; uptimeRatio; status }`; `UptimeStatus` is
      `'healthy'|'degraded'|'down'`.
      ```ts
      import type { AttestationStore } from './attestation-store.js';
      import type { UptimeCertificate, UptimeStatus } from '../domain/certificate.js';
      import type { Did } from '../domain/types.js';

      export function buildCertificate(
        targetDid: Did,
        issuerDid: Did,
        store: AttestationStore,
        now: number,
      ): UptimeCertificate {
        const rec = store.get(targetDid);
        const total = rec?.totalHeartbeats ?? 0;
        const completed = rec?.completedHeartbeats ?? 0;
        const incidents = rec?.incidents ?? [];
        const last = rec?.lastResolvedStatus ?? 'none';
        const uptimeRatio = total === 0 ? 1 : completed / total;
        let status: UptimeStatus;
        if (last === 'expired') status = 'down';
        else if (incidents.length > 0) status = 'degraded';
        else status = 'healthy';
        return {
          schemaVersion: '1.0',
          targetDid,
          issuerDid,
          issuedAt: now,
          windowStart: 0,
          windowEnd: now,
          totalHeartbeats: total,
          completedHeartbeats: completed,
          downtimeIncidents: incidents,
          uptimeRatio,
          status,
        };
      }
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/attestation/certificate-builder.test.ts`
      Expected: PASS — "4 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(attestation): uptime certificate builder`

---

### Task 4: Attestation provider (Deadman sells certificates)

**Files:**
- Create: `src/attestation/attestation-provider.ts`
- Test:   `src/attestation/attestation-provider.test.ts`

**Depends on:** Task 1, Task 3, mock-cap Task 1, mock-cap Task 6, foundation Task 2, foundation Task 3, foundation Task 4
**Effort:** high
**Provides:** `AttestationProvider`
**Requires:** `AttestationStore`, `buildCertificate`, `CapClient`, `CapEventStream`, `EventType`, `Did`, `UptimeCertificate`, `createMockEnvironment`, `ManualClock`

- [ ] **Step 1: Write the failing test**
      ```ts
      import { test, expect } from 'vitest';
      import { ManualClock } from '../cap/clock.js';
      import { createMockEnvironment } from '../cap/environment.js';
      import { AttestationStore } from './attestation-store.js';
      import { AttestationProvider } from './attestation-provider.js';
      import type { UptimeCertificate } from '../domain/certificate.js';

      async function flush(): Promise<void> {
        for (let i = 0; i < 50; i++) await Promise.resolve();
      }

      test('sells an uptime certificate: accept the buyer, deliver the cert for the requested target', async () => {
        const clock = new ManualClock();
        const env = createMockEnvironment({ clock });
        const store = new AttestationStore();
        store.recordDowntime('did:target',
          { orderId: 'ox', expiredAt: 5, refundTxHash: '0xrefund', slaMinutes: 1 });
        const provider = new AttestationProvider(env.forAgent('did:deadman'), 'did:deadman', store, () => 100);
        await provider.start();

        const buyer = env.forAgent('did:buyer');
        const neg = await buyer.negotiateOrder({
          requesterDid: 'did:buyer', providerDid: 'did:deadman', amountUsdc: '0.05',
          slaMinutes: 1, requirements: 'did:target',
        });
        await flush();
        const order = (await buyer.listOrders({ requesterDid: 'did:buyer' })).find((o) => o.negotiationId === neg.id);
        await buyer.payOrder(order?.id ?? '');
        await flush();

        const delivery = await buyer.getDelivery(order?.id ?? '');
        const cert = delivery.payload as UptimeCertificate;
        expect(cert.targetDid).toBe('did:target');
        expect(cert.status).toBe('down');
        expect(cert.downtimeIncidents[0]?.refundTxHash).toBe('0xrefund');
        expect(delivery.deliveryHash).toMatch(/^0x/);
        provider.stop();
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/attestation/attestation-provider.test.ts`
      Expected: FAIL — cannot find module `./attestation-provider.js`
- [ ] **Step 3: Implement the provider**
      Upstream: `CapClient` has `connectWebSocket()`, `acceptNegotiation(id)`, `getOrder(id)`,
      `deliverOrder({ orderId, payload })`. `CapEvent` has `{ type; orderId; negotiationId; providerDid; ... }`.
      `EventType.NegotiationCreated/OrderPaid`. `Order.requirements` holds the requested target DID.
      `buildCertificate(targetDid, issuerDid, store, now): UptimeCertificate`.
      ```ts
      import type { AttestationStore } from './attestation-store.js';
      import { buildCertificate } from './certificate-builder.js';
      import type { CapClient, CapEventStream } from '../domain/cap-client.js';
      import { EventType } from '../domain/types.js';
      import type { Did } from '../domain/types.js';

      export class AttestationProvider {
        private stream: CapEventStream | null = null;

        constructor(
          private readonly client: CapClient,
          private readonly selfDid: Did,
          private readonly store: AttestationStore,
          private readonly now: () => number,
        ) {}

        async start(): Promise<void> {
          this.stream = await this.client.connectWebSocket();
          this.stream.on(EventType.NegotiationCreated, (e) => {
            if (e.providerDid !== this.selfDid || e.negotiationId === null) return;
            void this.client.acceptNegotiation(e.negotiationId).catch(() => undefined);
          });
          this.stream.on(EventType.OrderPaid, (e) => {
            if (e.providerDid !== this.selfDid) return;
            void this.deliverCertificate(e.orderId).catch(() => undefined);
          });
        }

        private async deliverCertificate(orderId: string): Promise<void> {
          const order = await this.client.getOrder(orderId);
          const targetDid = order.requirements ?? '';
          const cert = buildCertificate(targetDid, this.selfDid, this.store, this.now());
          await this.client.deliverOrder({ orderId, payload: cert });
        }

        stop(): void {
          this.stream?.close();
        }
      }
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/attestation/attestation-provider.test.ts`
      Expected: PASS — "1 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(attestation): Deadman attestation provider (sells certificates)`
