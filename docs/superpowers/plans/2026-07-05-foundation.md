# foundation Implementation Plan

**Goal:** Scaffold the strict-ESM TypeScript package and define every shared domain contract (the
`CapClient` seam, order/event types, certificate types, mode config) that all other subsystems build on.
**Architecture:** A single npm package (`type: module`, NodeNext). `src/domain/` holds the load-bearing
types; `src/config/` resolves `DEADMAN_MODE`. No runtime behavior beyond the mode resolver and the
`EventType` constant — this subsystem is the interface source of truth.
**Tech Stack:** TypeScript ^5.6 (strict, NodeNext), vitest ^2.1, tsx ^4.19, esbuild ^0.24, ethers ^6.13,
ws ^8.18, `@croo-network/sdk` ^0.2 (optionalDependency), Node ≥ 20.
**Source spec:** docs/superpowers/specs/2026-07-05-deadman-design.md

> **ESM rule (applies to every task):** relative imports MUST carry a `.js` extension (NodeNext), e.g.
> `import type { Order } from './types.js';`. Use `import type` for type-only imports. Never `as any`
> (use `as unknown as T`). Never put a secret value in any file — env var NAMES only.

---

### Task 1: Scaffold the package

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.gitattributes`
- Create: `package-lock.json`
- Test:   `src/smoke.test.ts`

**Effort:** low
**Provides:** `package.json`, `tsconfig.json`, `vitest.config.ts`
**Requires:** (none)

- [ ] **Step 1: Create the scaffold files**
      `package.json`:
      ```json
      {
        "name": "deadman",
        "version": "0.1.0",
        "private": true,
        "type": "module",
        "engines": { "node": ">=20" },
        "scripts": {
          "test": "vitest run",
          "typecheck": "tsc --noEmit",
          "build:view": "esbuild src/dashboard/view/app.ts --bundle --format=esm --outfile=src/dashboard/public/app.js",
          "demo": "npm run build:view && tsx src/dashboard/main.ts",
          "live:smoke": "tsx scripts/live-smoke.ts"
        },
        "dependencies": {
          "ethers": "^6.13.0",
          "ws": "^8.18.0"
        },
        "optionalDependencies": {
          "@croo-network/sdk": "^0.2.1"
        },
        "devDependencies": {
          "@types/node": "^22.0.0",
          "@types/ws": "^8.5.0",
          "esbuild": "^0.24.0",
          "tsx": "^4.19.0",
          "typescript": "^5.6.0",
          "vitest": "^2.1.0"
        }
      }
      ```
      `tsconfig.json`:
      ```json
      {
        "compilerOptions": {
          "target": "ES2022",
          "module": "NodeNext",
          "moduleResolution": "NodeNext",
          "strict": true,
          "skipLibCheck": true,
          "forceConsistentCasingInFileNames": true,
          "resolveJsonModule": true,
          "noEmit": true,
          "types": ["node"]
        },
        "include": ["src", "scripts"],
        "exclude": ["node_modules", "dist", "src/dashboard/view"]
      }
      ```
      `vitest.config.ts`:
      ```ts
      import { defineConfig } from 'vitest/config';

      export default defineConfig({
        test: {
          include: ['src/**/*.test.ts'],
          environment: 'node',
        },
      });
      ```
      `.gitignore`:
      ```gitignore
      node_modules/
      dist/
      coverage/
      .env
      .env.local
      src/dashboard/public/app.js
      *.log
      ```
      `.gitattributes`:
      ```gitattributes
      * text=auto eol=lf
      ```
      `src/smoke.test.ts`:
      ```ts
      import { test, expect } from 'vitest';

      test('vitest runs offline', () => {
        expect(1 + 1).toBe(2);
      });
      ```
- [ ] **Step 2: Install dependencies**
      Run: `npm install`
      Expected: dependencies installed; `package-lock.json` created (optionalDependency
      `@croo-network/sdk` may warn but must not fail the install).
- [ ] **Step 3: Run the smoke test**   # <-- GATE
      Run: `npx vitest run src/smoke.test.ts`
      Expected: PASS — "1 passed"
- [ ] **Step 4: Commit (kernel-performed — no agent runs this)**
      Message: `chore(foundation): scaffold strict-ESM TypeScript package`

---

### Task 2: Domain order & event types

**Files:**
- Create: `src/domain/types.ts`
- Test:   `src/domain/types.test.ts`

**Depends on:** Task 1
**Effort:** low
**Provides:** `Did`, `OrderId`, `NegotiationId`, `TxHash`, `OrderStatus`, `EventType`, `Order`, `CapEvent`
**Requires:** (none)

- [ ] **Step 1: Write the failing test**
      ```ts
      import { test, expect } from 'vitest';
      import { EventType } from './types.js';
      import type { Order, CapEvent } from './types.js';

      test('EventType holds the six CAP wire event names', () => {
        expect(EventType.NegotiationCreated).toBe('negotiation_created');
        expect(EventType.OrderCreated).toBe('order_created');
        expect(EventType.OrderPaid).toBe('order_paid');
        expect(EventType.OrderCompleted).toBe('order_completed');
        expect(EventType.OrderRejected).toBe('order_rejected');
        expect(EventType.OrderExpired).toBe('order_expired');
        expect(Object.values(EventType)).toHaveLength(6);
      });

      test('Order and CapEvent shapes accept a valid value', () => {
        const order: Order = {
          id: 'o1', negotiationId: 'n1', requesterDid: 'did:req', providerDid: 'did:prov',
          amountUsdc: '0.01', slaMinutes: 1, status: 'paid', requirements: null, createdAt: 1, paidAt: 2,
          resolvedAt: null, deliveryHash: null, refundTxHash: null,
        };
        const event: CapEvent = {
          type: EventType.OrderExpired, orderId: 'o1', negotiationId: 'n1',
          requesterDid: 'did:req', providerDid: 'did:prov', status: 'expired',
          slaMinutes: 1, refundTxHash: '0xabc', deliveryHash: null, timestamp: 3,
        };
        expect(order.status).toBe('paid');
        expect(event.type).toBe('order_expired');
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/domain/types.test.ts`
      Expected: FAIL — cannot find module `./types.js`
- [ ] **Step 3: Create the types**
      ```ts
      export type Did = string;
      export type OrderId = string;
      export type NegotiationId = string;
      export type TxHash = `0x${string}`;

      export type OrderStatus = 'created' | 'paid' | 'completed' | 'rejected' | 'expired';

      export const EventType = {
        NegotiationCreated: 'negotiation_created',
        OrderCreated: 'order_created',
        OrderPaid: 'order_paid',
        OrderCompleted: 'order_completed',
        OrderRejected: 'order_rejected',
        OrderExpired: 'order_expired',
      } as const;
      export type EventType = (typeof EventType)[keyof typeof EventType];

      export interface Order {
        id: OrderId;
        negotiationId: NegotiationId;
        requesterDid: Did;
        providerDid: Did;
        amountUsdc: string;
        slaMinutes: number;
        status: OrderStatus;
        requirements: string | null;
        createdAt: number;
        paidAt: number | null;
        resolvedAt: number | null;
        deliveryHash: TxHash | null;
        refundTxHash: TxHash | null;
      }

      export interface CapEvent {
        type: EventType;
        orderId: OrderId;
        negotiationId: NegotiationId | null;
        requesterDid: Did;
        providerDid: Did;
        status: OrderStatus;
        slaMinutes: number;
        refundTxHash: TxHash | null;
        deliveryHash: TxHash | null;
        timestamp: number;
      }
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/domain/types.test.ts`
      Expected: PASS — "2 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(foundation): domain order and event types`

---

### Task 3: CapClient seam interface

**Files:**
- Create: `src/domain/cap-client.ts`
- Test:   `src/domain/cap-client.test.ts`

**Depends on:** Task 2
**Effort:** low
**Provides:** `CapClient`, `CapEventStream`, `NegotiateRequest`, `Negotiation`, `NegotiationStatus`, `AcceptResult`, `PayResult`, `DeliverRequest`, `DeliverResult`, `Delivery`, `ListOrdersOpts`
**Requires:** `Did`, `OrderId`, `NegotiationId`, `TxHash`, `OrderStatus`, `EventType`, `Order`, `CapEvent`

- [ ] **Step 1: Write the failing test**
      This test constructs a fully-typed stub implementing `CapClient`, proving the interface is complete
      and implementable. (The upstream `Order`/`CapEvent`/`OrderStatus`/`EventType`/id types from Task 2
      are imported from `./types.js`.)
      ```ts
      import { test, expect } from 'vitest';
      import type { CapClient, CapEventStream } from './cap-client.js';

      const stream: CapEventStream = { on() {}, onAny() {}, close() {} };

      const stub: CapClient = {
        async negotiateOrder(req) {
          return { id: 'n1', requesterDid: req.requesterDid, providerDid: req.providerDid,
            amountUsdc: req.amountUsdc, slaMinutes: req.slaMinutes, status: 'pending' };
        },
        async acceptNegotiation(negotiationId) { return { orderId: 'o1', negotiationId }; },
        async rejectNegotiation() {},
        async payOrder(orderId) { return { orderId, escrowLocked: true }; },
        async deliverOrder(req) { return { orderId: req.orderId, deliveryHash: '0xdead' }; },
        async rejectOrder() {},
        async getOrder(orderId) {
          return { id: orderId, negotiationId: 'n1', requesterDid: 'did:req', providerDid: 'did:prov',
            amountUsdc: '0.01', slaMinutes: 1, status: 'created', requirements: null, createdAt: 0,
            paidAt: null, resolvedAt: null, deliveryHash: null, refundTxHash: null };
        },
        async listOrders() { return []; },
        async getDelivery(orderId) { return { orderId, deliveryHash: '0xdead', payload: {} }; },
        async connectWebSocket() { return stream; },
        async close() {},
      };

      test('CapClient stub exposes the full method surface', () => {
        for (const m of ['negotiateOrder','acceptNegotiation','rejectNegotiation','payOrder',
          'deliverOrder','rejectOrder','getOrder','listOrders','getDelivery','connectWebSocket','close'] as const) {
          expect(typeof stub[m]).toBe('function');
        }
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/domain/cap-client.test.ts`
      Expected: FAIL — cannot find module `./cap-client.js`
- [ ] **Step 3: Create the interface**
      ```ts
      import type {
        Did, OrderId, NegotiationId, TxHash, Order, OrderStatus, CapEvent, EventType,
      } from './types.js';

      export interface NegotiateRequest {
        requesterDid: Did;
        providerDid: Did;
        amountUsdc: string;
        slaMinutes: number;
        requirements?: string;
      }
      export type NegotiationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';
      export interface Negotiation {
        id: NegotiationId;
        requesterDid: Did;
        providerDid: Did;
        amountUsdc: string;
        slaMinutes: number;
        status: NegotiationStatus;
      }
      export interface AcceptResult { orderId: OrderId; negotiationId: NegotiationId; }
      export interface PayResult { orderId: OrderId; escrowLocked: boolean; }
      export interface DeliverRequest { orderId: OrderId; payload: unknown; }
      export interface DeliverResult { orderId: OrderId; deliveryHash: TxHash; }
      export interface Delivery { orderId: OrderId; deliveryHash: TxHash; payload: unknown; }
      export interface ListOrdersOpts { requesterDid?: Did; providerDid?: Did; status?: OrderStatus; }

      export interface CapEventStream {
        on(type: EventType, handler: (event: CapEvent) => void): void;
        onAny(handler: (event: CapEvent) => void): void;
        close(): void;
      }

      export interface CapClient {
        negotiateOrder(req: NegotiateRequest): Promise<Negotiation>;
        acceptNegotiation(negotiationId: NegotiationId): Promise<AcceptResult>;
        rejectNegotiation(negotiationId: NegotiationId, reason: string): Promise<void>;
        payOrder(orderId: OrderId): Promise<PayResult>;
        deliverOrder(req: DeliverRequest): Promise<DeliverResult>;
        rejectOrder(orderId: OrderId, reason: string): Promise<void>;
        getOrder(orderId: OrderId): Promise<Order>;
        listOrders(opts?: ListOrdersOpts): Promise<Order[]>;
        getDelivery(orderId: OrderId): Promise<Delivery>;
        connectWebSocket(): Promise<CapEventStream>;
        close(): Promise<void>;
      }
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/domain/cap-client.test.ts`
      Expected: PASS — "1 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(foundation): CapClient seam interface`

---

### Task 4: Uptime certificate types

**Files:**
- Create: `src/domain/certificate.ts`
- Test:   `src/domain/certificate.test.ts`

**Depends on:** Task 2
**Effort:** low
**Provides:** `UptimeCertificate`, `DowntimeIncident`, `UptimeStatus`
**Requires:** `Did`, `OrderId`, `TxHash`

- [ ] **Step 1: Write the failing test**
      ```ts
      import { test, expect } from 'vitest';
      import type { UptimeCertificate, DowntimeIncident } from './certificate.js';

      test('certificate accepts a downgraded value citing a refund tx', () => {
        const incident: DowntimeIncident = {
          orderId: 'o1', expiredAt: 100, refundTxHash: '0xrefund', slaMinutes: 1,
        };
        const cert: UptimeCertificate = {
          schemaVersion: '1.0', targetDid: 'did:prov', issuerDid: 'did:deadman', issuedAt: 200,
          windowStart: 0, windowEnd: 200, totalHeartbeats: 5, completedHeartbeats: 4,
          downtimeIncidents: [incident], uptimeRatio: 0.8, status: 'down',
        };
        expect(cert.status).toBe('down');
        expect(cert.downtimeIncidents[0]?.refundTxHash).toBe('0xrefund');
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/domain/certificate.test.ts`
      Expected: FAIL — cannot find module `./certificate.js`
- [ ] **Step 3: Create the types**
      ```ts
      import type { Did, OrderId, TxHash } from './types.js';

      export interface DowntimeIncident {
        orderId: OrderId;
        expiredAt: number;
        refundTxHash: TxHash;
        slaMinutes: number;
      }

      export type UptimeStatus = 'healthy' | 'degraded' | 'down';

      export interface UptimeCertificate {
        schemaVersion: '1.0';
        targetDid: Did;
        issuerDid: Did;
        issuedAt: number;
        windowStart: number;
        windowEnd: number;
        totalHeartbeats: number;
        completedHeartbeats: number;
        downtimeIncidents: DowntimeIncident[];
        uptimeRatio: number;
        status: UptimeStatus;
      }
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/domain/certificate.test.ts`
      Expected: PASS — "1 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(foundation): uptime certificate types`

---

### Task 5: Mode resolver

**Files:**
- Create: `src/config/mode.ts`
- Test:   `src/config/mode.test.ts`

**Depends on:** Task 1
**Effort:** low
**Provides:** `DeadmanMode`, `resolveMode`
**Requires:** (none)

- [ ] **Step 1: Write the failing test**
      ```ts
      import { test, expect } from 'vitest';
      import { resolveMode } from './mode.js';

      test('defaults to mock when DEADMAN_MODE is unset', () => {
        expect(resolveMode({})).toBe('mock');
      });
      test('accepts mock and live', () => {
        expect(resolveMode({ DEADMAN_MODE: 'mock' })).toBe('mock');
        expect(resolveMode({ DEADMAN_MODE: 'live' })).toBe('live');
      });
      test('throws on an invalid mode', () => {
        expect(() => resolveMode({ DEADMAN_MODE: 'staging' })).toThrow(/DEADMAN_MODE/);
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/config/mode.test.ts`
      Expected: FAIL — cannot find module `./mode.js`
- [ ] **Step 3: Write the resolver**
      ```ts
      export type DeadmanMode = 'mock' | 'live';

      export function resolveMode(env: NodeJS.ProcessEnv): DeadmanMode {
        const raw = env.DEADMAN_MODE;
        if (raw === undefined || raw === '') return 'mock';
        if (raw === 'mock' || raw === 'live') return raw;
        throw new Error(`Invalid DEADMAN_MODE: ${raw} (expected "mock" or "live")`);
      }
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/config/mode.test.ts`
      Expected: PASS — "3 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(foundation): DEADMAN_MODE resolver`

---

### Task 6: Environment template (env NAMES only — safety gate)

**Files:**
- Create: `.env.example`
- Test:   `src/config/env-example.test.ts`

**Depends on:** Task 1
**Effort:** low
**Provides:** `.env.example`
**Requires:** (none)

- [ ] **Step 1: Write the failing test**
      The test enforces the safety rule: the four `CROO_SDK_KEY_*` secrets must appear with an EMPTY value
      (names only), and all six required variables must be present.
      ```ts
      import { test, expect } from 'vitest';
      import { readFileSync } from 'node:fs';

      const text = readFileSync(new URL('../../.env.example', import.meta.url), 'utf8');
      const lines = text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
      const map = new Map(lines.map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i), l.slice(i + 1)] as const;
      }));

      test('lists all six required variables', () => {
        for (const name of ['CROO_SDK_KEY_DEADMAN','CROO_SDK_KEY_REQUESTER_1','CROO_SDK_KEY_REQUESTER_2',
          'CROO_SDK_KEY_TARGET','BASE_RPC_URL','DEADMAN_MODE']) {
          expect(map.has(name)).toBe(true);
        }
      });
      test('secret keys carry NO value (env names only)', () => {
        for (const name of ['CROO_SDK_KEY_DEADMAN','CROO_SDK_KEY_REQUESTER_1','CROO_SDK_KEY_REQUESTER_2',
          'CROO_SDK_KEY_TARGET']) {
          expect(map.get(name)).toBe('');
        }
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/config/env-example.test.ts`
      Expected: FAIL — ENOENT `.env.example`
- [ ] **Step 3: Create the template**
      ```dotenv
      # Deadman environment — copy to .env and fill locally. NEVER commit real values.
      # Mode selector: "mock" (default, fully offline) or "live" (uses the CROO CAP SDK).
      DEADMAN_MODE=mock

      # Base RPC (public endpoint; override if you use a private provider).
      BASE_RPC_URL=https://mainnet.base.org

      # CROO SDK API keys (croo_sk_...). Dashboard-issued, shown once. Names only here — fill in .env.
      CROO_SDK_KEY_DEADMAN=
      CROO_SDK_KEY_REQUESTER_1=
      CROO_SDK_KEY_REQUESTER_2=
      CROO_SDK_KEY_TARGET=
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/config/env-example.test.ts`
      Expected: PASS — "2 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(foundation): .env.example with env names only`
