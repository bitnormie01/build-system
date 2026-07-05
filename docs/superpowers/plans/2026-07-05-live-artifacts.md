# live-artifacts Implementation Plan

**Goal:** Build the live-mode edge — `LiveCapClient` (the `@croo-network/sdk` adapter), `createLiveEnvironment`,
the human-gated live smoke script, and the register-agents runbook — so the live run is a config flip a
human performs. All code is written and type-checked offline; nothing here places a real order in the build.
**Architecture:** `LiveCapClient` implements `CapClient` against a local structural `SdkAgentClient`
interface (never a static SDK import), so it is unit-tested with a fake, fully offline. `createLiveEnvironment`
dynamic-imports the real SDK via a non-literal specifier (so the mock path never loads it) and exposes
`control: null`. `scripts/live-smoke.ts` is `human_gate` — it is built and type-checked but NEVER run by the
build.
**Tech Stack:** TypeScript ^5.6 (strict, NodeNext), vitest ^2.1, ethers ^6.13, `@croo-network/sdk` (optional).
**Source spec:** docs/superpowers/specs/2026-07-05-deadman-design.md

> **ESM rule:** relative imports carry `.js`; `import type` for types; never `as any`. Never a secret value —
> env var NAMES only. **The real SDK field names are verified during the live smoke (HUMAN_TODO); the
> `SdkAgentClient` interface here is the documented best-effort shape and is the single place to reconcile.**

---

### Task 1: SDK structural interface + event-type mapping

**Files:**
- Create: `src/live/sdk-agent-client.ts`
- Test:   `src/live/sdk-agent-client.test.ts`

**Depends on:** foundation Task 2
**Effort:** medium
**Provides:** `SdkAgentClient`, `SdkStream`, `SdkEvent`, `SdkOrder`, `SdkNegotiation`, `SdkNegotiateRequest`, `SdkAcceptResult`, `SdkPayResult`, `SdkDeliverResult`, `mapSdkEventType`
**Requires:** `EventType`

- [ ] **Step 1: Write the failing test**
      ```ts
      import { test, expect } from 'vitest';
      import { mapSdkEventType } from './sdk-agent-client.js';
      import { EventType } from '../domain/types.js';

      test('normalizes SDK event type spellings to our wire EventType', () => {
        expect(mapSdkEventType('OrderExpired')).toBe(EventType.OrderExpired);
        expect(mapSdkEventType('order_expired')).toBe(EventType.OrderExpired);
        expect(mapSdkEventType('ORDER_PAID')).toBe(EventType.OrderPaid);
        expect(mapSdkEventType('NegotiationCreated')).toBe(EventType.NegotiationCreated);
        expect(mapSdkEventType('something_else')).toBeNull();
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/live/sdk-agent-client.test.ts`
      Expected: FAIL — cannot find module `./sdk-agent-client.js`
- [ ] **Step 3: Implement the interface + mapper**
      Upstream: `EventType` (const object, from `src/domain/types.ts`) with values `negotiation_created`,
      `order_created`, `order_paid`, `order_completed`, `order_rejected`, `order_expired`.
      ```ts
      import { EventType } from '../domain/types.js';

      export interface SdkNegotiateRequest {
        providerId: string;
        amount: string;
        slaMinutes: number;
        requirements?: string;
      }
      export interface SdkNegotiation { id: string; status: string; }
      export interface SdkAcceptResult { orderId: string; }
      export interface SdkPayResult { orderId: string; }
      export interface SdkDeliverResult { orderId: string; deliveryHash: string; }
      export interface SdkOrder {
        id: string;
        status: string;
        negotiationId?: string;
        requesterId?: string;
        providerId?: string;
        amount?: string;
        slaMinutes?: number;
        requirements?: string | null;
        createdAt?: number;
        paidAt?: number | null;
        resolvedAt?: number | null;
        deliveryHash?: string | null;
        refundTxHash?: string | null;
      }
      export interface SdkEvent {
        type: string;
        orderId?: string;
        negotiationId?: string;
        requesterId?: string;
        providerId?: string;
        status?: string;
        slaMinutes?: number;
        refundTxHash?: string;
        deliveryHash?: string;
        timestamp?: number;
      }
      export interface SdkStream {
        on(type: string, cb: (e: SdkEvent) => void): void;
        onAny(cb: (e: SdkEvent) => void): void;
        close(): void;
      }
      export interface SdkAgentClient {
        negotiateOrder(req: SdkNegotiateRequest): Promise<SdkNegotiation>;
        acceptNegotiation(negotiationId: string): Promise<SdkAcceptResult>;
        rejectNegotiation(negotiationId: string, reason: string): Promise<void>;
        payOrder(orderId: string): Promise<SdkPayResult>;
        deliverOrder(orderId: string, req: unknown): Promise<SdkDeliverResult>;
        rejectOrder(orderId: string, reason: string): Promise<void>;
        getOrder(orderId: string): Promise<SdkOrder>;
        listOrders(opts?: unknown): Promise<SdkOrder[]>;
        getDelivery(orderId: string): Promise<unknown>;
        connectWebSocket(): Promise<SdkStream>;
      }

      export function mapSdkEventType(raw: string): EventType | null {
        switch (raw.toLowerCase().replace(/[^a-z]/g, '')) {
          case 'negotiationcreated': return EventType.NegotiationCreated;
          case 'ordercreated': return EventType.OrderCreated;
          case 'orderpaid': return EventType.OrderPaid;
          case 'ordercompleted': return EventType.OrderCompleted;
          case 'orderrejected': return EventType.OrderRejected;
          case 'orderexpired': return EventType.OrderExpired;
          default: return null;
        }
      }
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/live/sdk-agent-client.test.ts`
      Expected: PASS — "1 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(live): SDK structural interface + event-type mapping`

---

### Task 2: LiveCapClient (SDK adapter)

**Files:**
- Create: `src/live/live-cap-client.ts`
- Test:   `src/live/live-cap-client.test.ts`

**Depends on:** Task 1, foundation Task 2, foundation Task 3
**Effort:** high
**Provides:** `LiveCapClient`
**Requires:** `SdkAgentClient`, `SdkStream`, `SdkEvent`, `SdkOrder`, `mapSdkEventType`, `CapClient`, `CapEventStream`, `NegotiateRequest`, `Negotiation`, `NegotiationStatus`, `AcceptResult`, `PayResult`, `DeliverRequest`, `DeliverResult`, `Delivery`, `ListOrdersOpts`, `Order`, `OrderStatus`, `CapEvent`, `EventType`, `Did`, `OrderId`, `NegotiationId`, `TxHash`

- [ ] **Step 1: Write the failing test**
      ```ts
      import { test, expect } from 'vitest';
      import { LiveCapClient } from './live-cap-client.js';
      import type { SdkAgentClient, SdkEvent, SdkStream } from './sdk-agent-client.js';
      import type { CapEvent } from '../domain/types.js';

      class FakeSdk implements SdkAgentClient {
        calls: string[] = [];
        private anyCbs: Array<(e: SdkEvent) => void> = [];
        async negotiateOrder(req: { providerId: string }) { this.calls.push('negotiate:' + req.providerId); return { id: 'n1', status: 'accepted' }; }
        async acceptNegotiation(id: string) { this.calls.push('accept:' + id); return { orderId: 'o1' }; }
        async rejectNegotiation() {}
        async payOrder(orderId: string) { this.calls.push('pay:' + orderId); return { orderId }; }
        async deliverOrder(orderId: string) { this.calls.push('deliver:' + orderId); return { orderId, deliveryHash: '0xdead' }; }
        async rejectOrder() {}
        async getOrder(orderId: string) { return { id: orderId, status: 'expired', providerId: 'did:prov', refundTxHash: '0xrefund' }; }
        async listOrders() { return []; }
        async getDelivery(orderId: string) { return { orderId, deliveryHash: '0xdead', payload: {} }; }
        async connectWebSocket(): Promise<SdkStream> {
          const cbs = this.anyCbs;
          return { on() {}, onAny: (cb) => { cbs.push(cb); }, close() {} };
        }
        emit(e: SdkEvent) { for (const cb of this.anyCbs) cb(e); }
      }

      test('maps CapClient calls to the SDK and maps SDK events back to CapEvents', async () => {
        const sdk = new FakeSdk();
        const client = new LiveCapClient(sdk, 'did:self');
        const neg = await client.negotiateOrder(
          { requesterDid: 'did:self', providerDid: 'did:prov', amountUsdc: '0.01', slaMinutes: 1 });
        expect(sdk.calls).toContain('negotiate:did:prov');
        expect(neg.providerDid).toBe('did:prov');
        expect(neg.status).toBe('accepted');
        await client.payOrder('o1');
        expect(sdk.calls).toContain('pay:o1');

        const order = await client.getOrder('o1');
        expect(order.status).toBe('expired');
        expect(order.refundTxHash).toBe('0xrefund');

        const stream = await client.connectWebSocket();
        const seen: CapEvent[] = [];
        stream.onAny((e) => seen.push(e));
        sdk.emit({ type: 'OrderExpired', orderId: 'o1', providerId: 'did:prov',
          requesterId: 'did:self', status: 'expired', refundTxHash: '0xrefund', slaMinutes: 1 });
        expect(seen[0]?.type).toBe('order_expired');
        expect(seen[0]?.refundTxHash).toBe('0xrefund');
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/live/live-cap-client.test.ts`
      Expected: FAIL — cannot find module `./live-cap-client.js`
- [ ] **Step 3: Implement the adapter**
      Upstream: `CapClient` (from `src/domain/cap-client.ts`) and its request/result types; `Order`/`CapEvent`
      (from `src/domain/types.ts`); `SdkAgentClient`/`SdkStream`/`SdkEvent`/`SdkOrder`/`mapSdkEventType`
      (from `./sdk-agent-client.ts`). The SDK's `deliverOrder(orderId, req)` takes two args;
      `TxHash` is `` `0x${string}` ``.
      ```ts
      import type {
        SdkAgentClient, SdkStream, SdkEvent, SdkOrder,
      } from './sdk-agent-client.js';
      import { mapSdkEventType } from './sdk-agent-client.js';
      import type {
        CapClient, CapEventStream, NegotiateRequest, Negotiation, NegotiationStatus, AcceptResult,
        PayResult, DeliverRequest, DeliverResult, Delivery, ListOrdersOpts,
      } from '../domain/cap-client.js';
      import type { Order, OrderStatus, CapEvent, Did, OrderId, NegotiationId, TxHash } from '../domain/types.js';

      function normalize(s: string): string {
        return s.toLowerCase().replace(/[^a-z]/g, '');
      }
      function mapOrderStatus(s: string): OrderStatus {
        switch (normalize(s)) {
          case 'paid': return 'paid';
          case 'completed': return 'completed';
          case 'rejected': return 'rejected';
          case 'expired': return 'expired';
          default: return 'created';
        }
      }
      function mapNegStatus(s: string): NegotiationStatus {
        switch (normalize(s)) {
          case 'accepted': return 'accepted';
          case 'rejected': return 'rejected';
          case 'expired': return 'expired';
          default: return 'pending';
        }
      }
      function mapSdkOrder(o: SdkOrder): Order {
        return {
          id: o.id,
          negotiationId: o.negotiationId ?? '',
          requesterDid: o.requesterId ?? '',
          providerDid: o.providerId ?? '',
          amountUsdc: o.amount ?? '0',
          slaMinutes: o.slaMinutes ?? 0,
          status: mapOrderStatus(o.status),
          requirements: o.requirements ?? null,
          createdAt: o.createdAt ?? 0,
          paidAt: o.paidAt ?? null,
          resolvedAt: o.resolvedAt ?? null,
          deliveryHash: (o.deliveryHash ?? null) as TxHash | null,
          refundTxHash: (o.refundTxHash ?? null) as TxHash | null,
        };
      }
      function toCapEvent(raw: SdkEvent): CapEvent | null {
        const type = mapSdkEventType(raw.type);
        if (type === null) return null;
        return {
          type,
          orderId: raw.orderId ?? '',
          negotiationId: raw.negotiationId ?? null,
          requesterDid: raw.requesterId ?? '',
          providerDid: raw.providerId ?? '',
          status: mapOrderStatus(raw.status ?? 'created'),
          slaMinutes: raw.slaMinutes ?? 0,
          refundTxHash: (raw.refundTxHash ?? null) as TxHash | null,
          deliveryHash: (raw.deliveryHash ?? null) as TxHash | null,
          timestamp: raw.timestamp ?? 0,
        };
      }

      class SdkEventStreamAdapter implements CapEventStream {
        private readonly typed = new Map<CapEvent['type'], Set<(e: CapEvent) => void>>();
        private readonly anyHandlers = new Set<(e: CapEvent) => void>();

        constructor(private readonly stream: SdkStream) {
          stream.onAny((raw) => {
            const mapped = toCapEvent(raw);
            if (!mapped) return;
            for (const h of [...this.anyHandlers]) h(mapped);
            const hs = this.typed.get(mapped.type);
            if (hs) for (const h of [...hs]) h(mapped);
          });
        }
        on(type: CapEvent['type'], handler: (e: CapEvent) => void): void {
          let hs = this.typed.get(type);
          if (!hs) { hs = new Set(); this.typed.set(type, hs); }
          hs.add(handler);
        }
        onAny(handler: (e: CapEvent) => void): void { this.anyHandlers.add(handler); }
        close(): void { this.stream.close(); }
      }

      export class LiveCapClient implements CapClient {
        constructor(private readonly sdk: SdkAgentClient, private readonly selfDid: Did) {}

        async negotiateOrder(req: NegotiateRequest): Promise<Negotiation> {
          const n = await this.sdk.negotiateOrder({
            providerId: req.providerDid, amount: req.amountUsdc, slaMinutes: req.slaMinutes,
            requirements: req.requirements,
          });
          return {
            id: n.id, requesterDid: req.requesterDid, providerDid: req.providerDid,
            amountUsdc: req.amountUsdc, slaMinutes: req.slaMinutes, status: mapNegStatus(n.status),
          };
        }
        async acceptNegotiation(negotiationId: NegotiationId): Promise<AcceptResult> {
          const r = await this.sdk.acceptNegotiation(negotiationId);
          return { orderId: r.orderId, negotiationId };
        }
        rejectNegotiation(negotiationId: NegotiationId, reason: string): Promise<void> {
          return this.sdk.rejectNegotiation(negotiationId, reason);
        }
        async payOrder(orderId: OrderId): Promise<PayResult> {
          const r = await this.sdk.payOrder(orderId);
          return { orderId: r.orderId, escrowLocked: true };
        }
        async deliverOrder(req: DeliverRequest): Promise<DeliverResult> {
          const r = await this.sdk.deliverOrder(req.orderId, req.payload);
          return { orderId: r.orderId, deliveryHash: r.deliveryHash as TxHash };
        }
        rejectOrder(orderId: OrderId, reason: string): Promise<void> {
          return this.sdk.rejectOrder(orderId, reason);
        }
        async getOrder(orderId: OrderId): Promise<Order> {
          return mapSdkOrder(await this.sdk.getOrder(orderId));
        }
        async listOrders(opts?: ListOrdersOpts): Promise<Order[]> {
          return (await this.sdk.listOrders(opts)).map(mapSdkOrder);
        }
        async getDelivery(orderId: OrderId): Promise<Delivery> {
          const d = (await this.sdk.getDelivery(orderId)) as { deliveryHash?: string; payload?: unknown };
          return { orderId, deliveryHash: (d.deliveryHash ?? '0x') as TxHash, payload: d.payload ?? null };
        }
        async connectWebSocket(): Promise<CapEventStream> {
          return new SdkEventStreamAdapter(await this.sdk.connectWebSocket());
        }
        close(): Promise<void> {
          return Promise.resolve();
        }
      }
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/live/live-cap-client.test.ts`
      Expected: PASS — "1 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(live): LiveCapClient SDK adapter (fake-tested, offline)`

---

### Task 3: Live environment (dynamic SDK import; control null)

**Files:**
- Create: `src/live/live-environment.ts`
- Test:   `src/live/live-environment.test.ts`

**Depends on:** Task 1, Task 2, mock-cap Task 6, foundation Task 2, foundation Task 3
**Effort:** high
**Provides:** `createLiveEnvironment`, `LiveEnvironmentConfig`
**Requires:** `SdkAgentClient`, `LiveCapClient`, `CapEnvironment`, `CapClient`, `Did`

- [ ] **Step 1: Write the failing test**
      The test injects a fake SDK factory, so it never imports the real SDK — fully offline.
      ```ts
      import { test, expect } from 'vitest';
      import { createLiveEnvironment } from './live-environment.js';
      import type { SdkAgentClient } from './sdk-agent-client.js';

      const fakeSdk = { payOrder: async () => ({ orderId: 'o' }) } as unknown as SdkAgentClient;

      test('builds a LiveCapClient per agent from its key; control is null in live mode', async () => {
        const env = await createLiveEnvironment({
          agentKeys: { 'did:a': 'key-a', 'did:b': 'key-b' },
          sdkFactory: () => fakeSdk,
        });
        expect(env.control).toBeNull();
        expect(typeof env.forAgent('did:a').payOrder).toBe('function');
      });

      test('throws for an agent with no configured key', async () => {
        const env = await createLiveEnvironment({ agentKeys: {}, sdkFactory: () => fakeSdk });
        expect(() => env.forAgent('did:missing')).toThrow(/key/i);
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/live/live-environment.test.ts`
      Expected: FAIL — cannot find module `./live-environment.js`
- [ ] **Step 3: Implement the live environment**
      Upstream: `CapEnvironment` (from `src/cap/environment.ts`) is
      `{ forAgent(did): CapClient; control: MockControl | null; close(): Promise<void> }`;
      `LiveCapClient(sdk, selfDid)`; `SdkAgentClient`. The real SDK is loaded via a **non-literal import
      specifier** so neither `tsc` nor the mock path resolves it.
      ```ts
      import type { Did } from '../domain/types.js';
      import type { CapClient } from '../domain/cap-client.js';
      import type { CapEnvironment } from '../cap/environment.js';
      import type { SdkAgentClient } from './sdk-agent-client.js';
      import { LiveCapClient } from './live-cap-client.js';

      export interface LiveEnvironmentConfig {
        agentKeys: Record<Did, string>;
        baseUrl?: string;
        wsUrl?: string;
        rpcUrl?: string;
        sdkFactory?: (apiKey: string) => SdkAgentClient;
      }

      async function defaultSdkFactory(
        config: LiveEnvironmentConfig,
      ): Promise<(apiKey: string) => SdkAgentClient> {
        const spec = '@croo-network/sdk';
        const mod = (await import(spec)) as {
          AgentClient: new (cfg: unknown, apiKey: string) => unknown;
        };
        const cfg = {
          baseURL: config.baseUrl ?? 'https://api.croo.network',
          wsURL: config.wsUrl ?? 'wss://api.croo.network/ws',
          rpcURL: config.rpcUrl,
        };
        return (apiKey: string): SdkAgentClient =>
          new mod.AgentClient(cfg, apiKey) as unknown as SdkAgentClient;
      }

      export async function createLiveEnvironment(config: LiveEnvironmentConfig): Promise<CapEnvironment> {
        const factory = config.sdkFactory ?? (await defaultSdkFactory(config));
        const clients = new Map<Did, CapClient>();
        return {
          forAgent: (did: Did): CapClient => {
            let client = clients.get(did);
            if (!client) {
              const apiKey = config.agentKeys[did];
              if (!apiKey) throw new Error(`No API key configured for agent ${did}`);
              client = new LiveCapClient(factory(apiKey), did);
              clients.set(did, client);
            }
            return client;
          },
          control: null,
          close: () => Promise.resolve(),
        };
      }
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/live/live-environment.test.ts`
      Expected: PASS — "2 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(live): createLiveEnvironment (dynamic SDK import, control null)`

---

### Task 4: Live smoke script (HUMAN-GATED — built and type-checked, never run)

**Files:**
- Create: `scripts/live-smoke.ts`

**Depends on:** Task 3, chain-decode Task 1, chain-decode Task 3, foundation Task 5
**Effort:** medium
**Provides:** `scripts/live-smoke.ts`
**Requires:** `createLiveEnvironment`, `findRefundForExpiry`, `RawLog`, `CAP_VAULT_ADDRESS`, `resolveMode`

> **Manifest:** this task is `human_gate: true`. The executor writes the script and the gate type-checks it;
> the orchestrator NEVER runs it (it places real CAP orders and moves USDC). Its live execution is a
> HUMAN_TODO item.

- [ ] **Step 1: Write the smoke script**
      Upstream: `resolveMode(env): 'mock'|'live'`; `createLiveEnvironment({ agentKeys, rpcUrl, ... }): Promise<CapEnvironment>`;
      `findRefundForExpiry(logs: RawLog[], orderId): TxHash | null`; `RawLog` is `{ topics; data; transactionHash }`;
      `CAP_VAULT_ADDRESS` is the vault address. Env var NAMES only (no values).
      ```ts
      // scripts/live-smoke.ts — HUMAN-GATED. Places REAL CAP orders and moves REAL USDC.
      // Prereqs (see docs/runbooks/register-agents.md): agents registered, AA wallets funded, .env filled,
      // DEADMAN_MODE=live. Run with: npm run live:smoke
      import { JsonRpcProvider } from 'ethers';
      import { resolveMode } from '../src/config/mode.js';
      import { createLiveEnvironment } from '../src/live/live-environment.js';
      import { findRefundForExpiry } from '../src/chain/decode.js';
      import type { RawLog } from '../src/chain/decode.js';
      import { CAP_VAULT_ADDRESS } from '../src/chain/addresses.js';

      function requireEnv(name: string): string {
        const value = process.env[name];
        if (!value || value.length === 0) throw new Error(`Missing required env var ${name}`);
        return value;
      }
      function sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      async function main(): Promise<void> {
        if (resolveMode(process.env) !== 'live') {
          console.error('Refusing to run: set DEADMAN_MODE=live (this places REAL orders and moves USDC).');
          process.exitCode = 1;
          return;
        }
        const rpcUrl = process.env.BASE_RPC_URL ?? 'https://mainnet.base.org';
        const env = await createLiveEnvironment({
          agentKeys: {
            'did:deadman': requireEnv('CROO_SDK_KEY_DEADMAN'),
            'did:req1': requireEnv('CROO_SDK_KEY_REQUESTER_1'),
            'did:target': requireEnv('CROO_SDK_KEY_TARGET'),
          },
          rpcUrl,
        });
        const requester = env.forAgent('did:req1');

        console.log('1) Negotiating a $0.01 heartbeat to did:target (1-minute SLA)…');
        const neg = await requester.negotiateOrder(
          { requesterDid: 'did:req1', providerDid: 'did:target', amountUsdc: '0.01', slaMinutes: 1 });
        await sleep(5000);
        const created = (await requester.listOrders({ requesterDid: 'did:req1', providerDid: 'did:target' }))
          .find((o) => o.negotiationId === neg.id);
        if (!created) throw new Error('Order was not created — did the target agent accept the negotiation?');

        console.log('2) Paying (escrow locks). DO NOT deliver from the target.', created.id);
        await requester.payOrder(created.id);

        console.log('3) Waiting past the 1-minute SLA for auto-expiry + CAPVault refund…');
        await sleep(90000);
        const order = await requester.getOrder(created.id);
        console.log('   Order status:', order.status, '(expected: expired)');

        const provider = new JsonRpcProvider(rpcUrl);
        const latest = await provider.getBlockNumber();
        const logs = await provider.getLogs({
          address: CAP_VAULT_ADDRESS, fromBlock: latest - 5000, toBlock: latest,
        });
        const raw: RawLog[] = logs.map((l) => ({
          topics: [...l.topics], data: l.data, transactionHash: l.transactionHash,
        }));
        const decodedRefund = findRefundForExpiry(raw, Number(order.id) || 0);

        console.log('4) Refund tx (from order):', order.refundTxHash ?? '(none)');
        console.log('   Refund tx (decoded from CAPVault logs):', decodedRefund ?? '(verify orderId correlation live)');
        const proof = order.refundTxHash ?? decodedRefund;
        console.log('   Basescan:', proof ? `https://basescan.org/tx/${proof}` : 'n/a');
        console.log('   ⇒ Put this tx hash in the demo/README as the certificate incident proof.');
        await env.close();
      }

      main().catch((err: unknown) => {
        console.error(err);
        process.exitCode = 1;
      });
      ```
- [ ] **Step 2: Type-check the script**   # <-- GATE (never executed)
      Run: `npx tsc --noEmit`
      Expected: PASS — no type errors (the script is NOT run; it is human-gated).
- [ ] **Step 3: Commit (kernel-performed — no agent runs this)**
      Message: `feat(live): human-gated live smoke script`

---

### Task 5: Register-agents runbook

**Files:**
- Create: `docs/runbooks/register-agents.md`
- Test:   `src/live/register-runbook.test.ts`

**Depends on:** foundation Task 1
**Effort:** low
**Provides:** `register-agents.md`
**Requires:** (none)

- [ ] **Step 1: Write the failing test**
      ```ts
      import { test, expect } from 'vitest';
      import { readFileSync } from 'node:fs';

      const doc = readFileSync(new URL('../../docs/runbooks/register-agents.md', import.meta.url), 'utf8');

      test('runbook covers the four agents, AA-wallet funding, and the key env names', () => {
        expect(doc).toContain('Deadman');
        expect(doc).toContain('requester');
        expect(doc).toContain('kill-target');
        expect(doc).toContain('AA Wallet');
        expect(doc).toContain('CROO_SDK_KEY_DEADMAN');
        expect(doc).toContain('DEADMAN_MODE=live');
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/live/register-runbook.test.ts`
      Expected: FAIL — ENOENT `register-agents.md`
- [ ] **Step 3: Write the runbook**
      `docs/runbooks/register-agents.md`:
      ```markdown
      # Runbook — register Deadman's agents and fund them (live mode)

      All steps below are performed by a **human** on agent.croo.network. The autonomous build never
      does any of this. Keys are shown once — store them in `.env` (never commit real values).

      ## 1. Register four agents (My Agents → Register Agent)
      - **Deadman** — the provider that sells uptime certificates. Configure a Service: name "Deadman Uptime
        Attestation", price ~$0.05, Deliverable type Schema, 1–5 skill tags (e.g. `verification`, `uptime`).
      - **requester 1** and **requester 2** — the heartbeat requesters (payOrder is serialized per wallet,
        so two wallets scale heartbeats).
      - **kill-target** — a throwaway agent with a service that has a **1-minute SLA** (Dashboard → Configure
        → SLA minutes = 1). This is the agent you kill on stage.

      Each registration creates an ERC-4337 **AA Wallet**, a DID, and an API key (`croo_sk_...`, shown once).

      ## 2. Put the keys in `.env` (copy from `.env.example`; NAMES already there)
      - `CROO_SDK_KEY_DEADMAN`, `CROO_SDK_KEY_REQUESTER_1`, `CROO_SDK_KEY_REQUESTER_2`, `CROO_SDK_KEY_TARGET`
      - `BASE_RPC_URL` (optional; defaults to https://mainnet.base.org)
      - `DEADMAN_MODE=live`

      ## 3. Fund the requester AA wallets
      Deposit small USDC (~$10 total across the two requesters) to each requester's **AA Wallet Address**
      (Dashboard → Configure) — **NOT** the Controller/Executor address. Gas is sponsored (no ETH needed).

      ## 4. Run the live smoke
      `DEADMAN_MODE=live npm run live:smoke` — it places one real heartbeat, forces an SLA expiry, and prints
      the CAPVault refund tx hash + a Basescan link. Verify the refund on Basescan; that tx hash is the
      certificate's incident proof.

      ## 5. Recruit counterparties (reward-eligibility)
      ≥3 unique counterparty agents and ≥5 unique buyer wallets, no concentrated self-trade. Pitch partner
      teams: their agents get paid real USDC per heartbeat.
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/live/register-runbook.test.ts`
      Expected: PASS — "1 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `docs(live): register-agents runbook`
