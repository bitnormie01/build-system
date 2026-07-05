# heartbeat Implementation Plan

**Goal:** The requester-side heartbeat engine: rolling in-flight escrowed orders (negotiate → pay) against
each monitored target, with `payOrder` serialized per requester wallet and targets sharded across 2–3
requester agents.
**Architecture:** `RequesterShard` wraps one `CapClient` (one requester DID) and serializes `payOrder`
through a promise queue. `TargetMonitor` keeps exactly one paid, undelivered order open per target
(reopening on resolution). `HeartbeatEngine` round-robins targets across shards and runs a monitor each.
All product code is mode-blind (consumes only `CapClient`); tests drive it through the mock environment.
**Tech Stack:** TypeScript ^5.6 (strict, NodeNext), vitest ^2.1.
**Source spec:** docs/superpowers/specs/2026-07-05-deadman-design.md

> **ESM rule:** relative imports carry `.js`; `import type` for types; never `as any`. Never a secret value.

---

### Task 1: Requester shard (serialized payOrder)

**Files:**
- Create: `src/heartbeat/requester-shard.ts`
- Test:   `src/heartbeat/requester-shard.test.ts`

**Depends on:** foundation Task 2, foundation Task 3
**Effort:** medium
**Provides:** `RequesterShard`
**Requires:** `CapClient`, `Did`, `Negotiation`, `PayResult`

- [ ] **Step 1: Write the failing test**
      The `payOrder` on a real CROO wallet is not concurrency-safe, so a shard MUST serialize pays. This
      test proves a second `pay` never enters `payOrder` until the first resolves.
      ```ts
      import { test, expect } from 'vitest';
      import { RequesterShard } from './requester-shard.js';
      import type { CapClient } from '../domain/cap-client.js';

      async function flush(): Promise<void> {
        for (let i = 0; i < 5; i++) await Promise.resolve();
      }

      test('pay calls serialize per shard (never two concurrent payOrder)', async () => {
        let active = 0;
        let maxActive = 0;
        const gates: Array<() => void> = [];
        const client = {
          payOrder(orderId: string) {
            active += 1;
            maxActive = Math.max(maxActive, active);
            return new Promise<{ orderId: string; escrowLocked: boolean }>((resolve) => {
              gates.push(() => {
                active -= 1;
                resolve({ orderId, escrowLocked: true });
              });
            });
          },
        } as unknown as CapClient;

        const shard = new RequesterShard('did:req', client);
        const p1 = shard.pay('o1');
        const p2 = shard.pay('o2');
        await flush();
        expect(gates).toHaveLength(1);      // only the first pay has started
        gates[0]?.();
        await p1;
        await flush();
        expect(gates).toHaveLength(2);      // the second pay starts only after the first resolves
        gates[1]?.();
        await p2;
        expect(maxActive).toBe(1);
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/heartbeat/requester-shard.test.ts`
      Expected: FAIL — cannot find module `./requester-shard.js`
- [ ] **Step 3: Implement the shard**
      Upstream: `CapClient` (from `src/domain/cap-client.ts`) has
      `negotiateOrder(req): Promise<Negotiation>` and `payOrder(orderId): Promise<PayResult>`;
      `Negotiation` has `{ id; requesterDid; providerDid; amountUsdc; slaMinutes; status }`.
      ```ts
      import type { CapClient, Negotiation, PayResult } from '../domain/cap-client.js';
      import type { Did } from '../domain/types.js';

      export class RequesterShard {
        private queue: Promise<unknown> = Promise.resolve();

        constructor(readonly did: Did, readonly client: CapClient) {}

        negotiate(providerDid: Did, amountUsdc: string, slaMinutes: number): Promise<Negotiation> {
          return this.client.negotiateOrder({ requesterDid: this.did, providerDid, amountUsdc, slaMinutes });
        }

        pay(orderId: string): Promise<PayResult> {
          const run = this.queue.then(() => this.client.payOrder(orderId));
          this.queue = run.then(
            () => undefined,
            () => undefined,
          );
          return run;
        }
      }
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/heartbeat/requester-shard.test.ts`
      Expected: PASS — "1 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(heartbeat): requester shard with serialized payOrder`

---

### Task 2: Target monitor (rolling in-flight)

**Files:**
- Create: `src/heartbeat/target-monitor.ts`
- Test:   `src/heartbeat/target-monitor.test.ts`

**Depends on:** Task 1, mock-cap Task 1, mock-cap Task 6, foundation Task 2, foundation Task 3
**Effort:** high
**Provides:** `TargetMonitor`, `MonitorState`, `MonitorConfig`
**Requires:** `RequesterShard`, `createMockEnvironment`, `ManualClock`, `CapEvent`, `EventType`, `OrderStatus`, `CapEventStream`, `Did`

- [ ] **Step 1: Write the failing test**
      ```ts
      import { test, expect } from 'vitest';
      import { ManualClock } from '../cap/clock.js';
      import { createMockEnvironment } from '../cap/environment.js';
      import { RequesterShard } from './requester-shard.js';
      import { TargetMonitor } from './target-monitor.js';

      async function flush(): Promise<void> {
        for (let i = 0; i < 50; i++) await Promise.resolve();
      }

      test('keeps exactly one in-flight paid order and reopens on completion', async () => {
        const clock = new ManualClock();
        const env = createMockEnvironment({ clock, msPerSlaMinute: 1000, autoDeliverMs: 100 });
        env.control?.registerTarget('did:t');
        const shard = new RequesterShard('did:req', env.forAgent('did:req'));
        const monitor = new TargetMonitor(shard, 'did:t', { amountUsdc: '0.01', slaMinutes: 1 });
        await monitor.start();
        await flush();
        const first = monitor.getState().inFlightOrderId;
        expect(first).not.toBeNull();
        clock.advance(150);         // auto-deliver completes the first heartbeat
        await flush();
        const second = monitor.getState().inFlightOrderId;
        expect(second).not.toBeNull();
        expect(second).not.toBe(first);
        expect(monitor.getState().resolved).toBe(1);
        monitor.stop();
      });

      test('kill → in-flight order expires; monitor records expiry and reopens', async () => {
        const clock = new ManualClock();
        const env = createMockEnvironment({ clock, msPerSlaMinute: 1000, autoDeliverMs: 100 });
        env.control?.registerTarget('did:t');
        const shard = new RequesterShard('did:req', env.forAgent('did:req'));
        const monitor = new TargetMonitor(shard, 'did:t', { amountUsdc: '0.01', slaMinutes: 1 });
        await monitor.start();
        await flush();
        env.control?.killTarget('did:t');
        clock.advance(1200);        // auto-deliver no-ops (dead), SLA expires
        await flush();
        expect(monitor.getState().lastStatus).toBe('expired');
        monitor.stop();
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/heartbeat/target-monitor.test.ts`
      Expected: FAIL — cannot find module `./target-monitor.js`
- [ ] **Step 3: Implement the monitor**
      Upstream: `RequesterShard` has `readonly did`, `readonly client: CapClient`,
      `negotiate(providerDid, amountUsdc, slaMinutes): Promise<Negotiation>`, `pay(orderId): Promise<PayResult>`.
      `CapEvent` has `{ type; orderId; negotiationId; requesterDid; providerDid; status; ... }`.
      `EventType.OrderCreated/OrderCompleted/OrderExpired/OrderRejected` are the wire names.
      `CapClient.connectWebSocket(): Promise<CapEventStream>`; `CapEventStream.onAny(handler)`, `.close()`;
      `CapClient.listOrders(opts?)` returns `Order[]`.
      ```ts
      import type { RequesterShard } from './requester-shard.js';
      import { EventType } from '../domain/types.js';
      import type { CapEvent, OrderStatus, Did } from '../domain/types.js';
      import type { CapEventStream } from '../domain/cap-client.js';

      export interface MonitorConfig {
        amountUsdc: string;
        slaMinutes: number;
      }

      export interface MonitorState {
        targetDid: Did;
        inFlightOrderId: string | null;
        lastStatus: OrderStatus | 'none';
        resolved: number;
      }

      export class TargetMonitor {
        private readonly state: MonitorState;
        private stream: CapEventStream | null = null;
        private running = false;
        private readonly pending = new Set<string>();

        constructor(
          private readonly shard: RequesterShard,
          readonly targetDid: Did,
          private readonly cfg: MonitorConfig,
        ) {
          this.state = { targetDid, inFlightOrderId: null, lastStatus: 'none', resolved: 0 };
        }

        async start(): Promise<void> {
          this.running = true;
          this.stream = await this.shard.client.connectWebSocket();
          this.stream.onAny((e) => this.onEvent(e));
          await this.openNext();
        }

        private onEvent(e: CapEvent): void {
          if (e.providerDid !== this.targetDid) return;
          if (e.type === EventType.OrderCreated && e.negotiationId !== null && this.pending.has(e.negotiationId)) {
            this.pending.delete(e.negotiationId);
            this.state.inFlightOrderId = e.orderId;
            void this.shard.pay(e.orderId).catch(() => undefined);
            return;
          }
          if (e.orderId !== this.state.inFlightOrderId) return;
          if (
            e.type === EventType.OrderCompleted ||
            e.type === EventType.OrderExpired ||
            e.type === EventType.OrderRejected
          ) {
            this.state.lastStatus = e.status;
            this.state.resolved += 1;
            this.state.inFlightOrderId = null;
            if (this.running) void this.openNext();
          }
        }

        private async openNext(): Promise<void> {
          if (!this.running) return;
          const neg = await this.shard.negotiate(this.targetDid, this.cfg.amountUsdc, this.cfg.slaMinutes);
          const created = (
            await this.shard.client.listOrders({ requesterDid: this.shard.did, providerDid: this.targetDid })
          ).find((o) => o.negotiationId === neg.id && o.status === 'created');
          if (created) {
            this.state.inFlightOrderId = created.id;
            await this.shard.pay(created.id);
          } else {
            this.pending.add(neg.id);
          }
        }

        getState(): MonitorState {
          return { ...this.state };
        }

        stop(): void {
          this.running = false;
          this.stream?.close();
        }
      }
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/heartbeat/target-monitor.test.ts`
      Expected: PASS — "2 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(heartbeat): rolling in-flight target monitor`

---

### Task 3: Heartbeat engine (sharding + aggregation)

**Files:**
- Create: `src/heartbeat/heartbeat-engine.ts`
- Test:   `src/heartbeat/heartbeat-engine.test.ts`

**Depends on:** Task 1, Task 2, mock-cap Task 1, mock-cap Task 6, foundation Task 2
**Effort:** medium
**Provides:** `HeartbeatEngine`, `EngineTarget`
**Requires:** `RequesterShard`, `TargetMonitor`, `MonitorState`, `createMockEnvironment`, `ManualClock`, `Did`

- [ ] **Step 1: Write the failing test**
      ```ts
      import { test, expect } from 'vitest';
      import { ManualClock } from '../cap/clock.js';
      import { createMockEnvironment } from '../cap/environment.js';
      import { RequesterShard } from './requester-shard.js';
      import { HeartbeatEngine } from './heartbeat-engine.js';

      async function flush(): Promise<void> {
        for (let i = 0; i < 50; i++) await Promise.resolve();
      }

      test('round-robins targets across shards and keeps each in flight', async () => {
        const clock = new ManualClock();
        const env = createMockEnvironment({ clock, msPerSlaMinute: 1000, autoDeliverMs: 100 });
        for (const t of ['did:t0', 'did:t1', 'did:t2']) env.control?.registerTarget(t);
        const shardA = new RequesterShard('did:reqA', env.forAgent('did:reqA'));
        const shardB = new RequesterShard('did:reqB', env.forAgent('did:reqB'));
        const engine = new HeartbeatEngine([shardA, shardB]);
        await engine.start([
          { did: 'did:t0', amountUsdc: '0.01', slaMinutes: 1 },
          { did: 'did:t1', amountUsdc: '0.01', slaMinutes: 1 },
          { did: 'did:t2', amountUsdc: '0.01', slaMinutes: 1 },
        ]);
        await flush();
        expect(engine.getStates()).toHaveLength(3);
        for (const s of engine.getStates()) expect(s.inFlightOrderId).not.toBeNull();
        const bOrders = await env.forAgent('did:reqB').listOrders({ requesterDid: 'did:reqB' });
        expect(bOrders.every((o) => o.providerDid === 'did:t1')).toBe(true);
        const aOrders = await env.forAgent('did:reqA').listOrders({ requesterDid: 'did:reqA' });
        expect(new Set(aOrders.map((o) => o.providerDid))).toEqual(new Set(['did:t0', 'did:t2']));
        engine.stop();
      });

      test('throws when constructed with no shards', () => {
        expect(() => new HeartbeatEngine([])).toThrow(/shard/);
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/heartbeat/heartbeat-engine.test.ts`
      Expected: FAIL — cannot find module `./heartbeat-engine.js`
- [ ] **Step 3: Implement the engine**
      Upstream: `RequesterShard` (`did`, `client`, `negotiate`, `pay`); `TargetMonitor` constructor
      `(shard, targetDid, { amountUsdc, slaMinutes })`, `start(): Promise<void>`, `getState(): MonitorState`,
      `stop(): void`; `MonitorState` `{ targetDid; inFlightOrderId; lastStatus; resolved }`.
      ```ts
      import type { RequesterShard } from './requester-shard.js';
      import { TargetMonitor } from './target-monitor.js';
      import type { MonitorState } from './target-monitor.js';
      import type { Did } from '../domain/types.js';

      export interface EngineTarget {
        did: Did;
        amountUsdc: string;
        slaMinutes: number;
      }

      export class HeartbeatEngine {
        private readonly monitors: TargetMonitor[] = [];

        constructor(private readonly shards: RequesterShard[]) {
          if (shards.length === 0) {
            throw new Error('HeartbeatEngine needs at least one requester shard');
          }
        }

        async start(targets: EngineTarget[]): Promise<void> {
          let i = 0;
          for (const t of targets) {
            const shard = this.shards[i % this.shards.length];
            i += 1;
            if (!shard) continue;
            const monitor = new TargetMonitor(shard, t.did, {
              amountUsdc: t.amountUsdc,
              slaMinutes: t.slaMinutes,
            });
            this.monitors.push(monitor);
            await monitor.start();
          }
        }

        getStates(): MonitorState[] {
          return this.monitors.map((m) => m.getState());
        }

        stop(): void {
          for (const m of this.monitors) m.stop();
        }
      }
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/heartbeat/heartbeat-engine.test.ts`
      Expected: PASS — "2 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(heartbeat): sharded heartbeat engine`
