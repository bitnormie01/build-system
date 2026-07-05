# Deadman — Design Spec

**Cryptoeconomic uptime attestations for CAP agents · the SLA auto-refund is the unforgeable downtime proof**

**Date:** 2026-07-05 · **Status:** Approved (autonomous run — spec-reviewer gate + brief conformance)
**Source brief:** [docs/idea-forge/2026-07-05-deadman-brief.md](../../idea-forge/2026-07-05-deadman-brief.md)
**Resource pack:** [docs/resources/2026-07-05-croo-hackathon/](../../resources/2026-07-05-croo-hackathon/INDEX.md)

---

## 1. Constraints (verbatim from brief/kickoff — non-negotiable)

- **Chain:** Base Mainnet (Chain ID 8453) via the CROO CAP SDK only. **No custom smart contracts.**
- **Runtime:** Node.js ≥ 20, **TypeScript strict + ESM**, `@croo-network/sdk`.
- **Deadline (planning target):** 2026-07-09 23:59 UTC+8 (earlier of two conflicting published dates;
  confirm-with-host is a HUMAN_TODO). Platform countdown says 2026-07-12 14:30.
- **Target tracks:** Data & Verification Agents (primary) + Developer Tooling Agents (secondary).
- **Safety (hard lines):** no secret values anywhere (env var NAMES only); never sign/broadcast a tx;
  never deploy; never move funds; never place live CAP orders; never submit to external platforms.
  Human-gated reality is *prepared and mocked*, never executed.

## 2. Executive summary

Deadman continuously places tiny **real escrowed heartbeat orders** against monitored CAP agents and
treats every **SLA auto-refund as a cryptoeconomic downtime proof** — money coming back is unforgeable
evidence the agent missed its deadline — then sells the resulting **uptime attestation** as its own paid
CAP service, in which every downtime incident cites its SLA-refund tx hash on Base.

The entire product is built **mock-first**: one `CapClient` seam with two implementations
(`MockCapClient` default, `LiveCapClient` via the SDK), selected only by `DEADMAN_MODE`. All product
logic is mode-blind. Every test/gate runs fully offline (no keys, no funds, no network). Live-mode
artifacts exist but their execution is human-gated: flipping `DEADMAN_MODE=live` and running the smoke
script is a config change the human performs, not the build.

## 3. Scope

### In scope (the money shot + its two tracks)
1. **Heartbeat engine (requester side)** — rolling in-flight escrowed heartbeats, sharded across 2–3
   requester agents, `payOrder` serialized per wallet.
2. **Attestation service (provider side)** — Deadman is a listed paid CAP agent; buyers pay and receive a
   structured-JSON uptime certificate whose every downtime incident cites its `EscrowRefunded` tx hash.
3. **Live kill-switch dashboard** — one web view; targets green with heartbeat streams; kill flips a
   target after escrow locks and before delivery; SLA lapses; refund lands; certificate downgrades citing
   that tx.
4. **Base event decoding** — CAPCore/CAPVault event ABIs (sourced), tested on recorded fixtures.
5. **Live-mode artifacts** — `LiveCapClient`, live smoke script, register-agents runbook, `.env.example`
   (env NAMES only) — all human-gated for execution.

### Out of scope (verbatim from brief — the reviewer enforces this)
- Auto-failover / backup-hiring on downtime (attestations only).
- Non-CAP monitoring (HTTP pings, status pages).
- Quality/schema/reputation scoring beyond liveness.
- Custom smart contracts (CAP SDK surface + read-only RPC only).
- CROOExchange / agent trading, token issuance, any mobile/Telegram UI.
- Any dashboard beyond the single demo view.

## 4. The mock-first contract (how human-gated reality stays mocked)

This section is the spec's spine. Every item below is a hard requirement the plans MUST encode.

- **One seam, two impls, env-selected.** `CapClient` is the only interface product logic knows.
  `MockCapClient` (default) and `LiveCapClient` (SDK) both implement it. `selectCapClient()` reads
  `DEADMAN_MODE` (`mock` | `live`, default `mock`) and returns the right one. **No product module imports
  either impl directly or branches on the mode** — they receive a `CapClient`.
- **Local mock CAP service — full lifecycle, offline.** `MockCapService` is an in-memory model of the
  CAP network emulating: negotiate → accept (`createOrder`) → `payOrder` (escrow lock) → `deliverOrder`
  (keccak256 delivery hash) → CLEAR; **SLA-expiry → EXPIRED with auto-refund**; **provider-reject →
  refund**; and it emits the six WebSocket events `negotiation_created`, `order_created`, `order_paid`,
  `order_completed`, `order_rejected`, `order_expired`. It models **monitored targets** as
  providers with a controllable liveness flag (alive targets auto-accept + auto-deliver; killed targets
  do not deliver → their paid orders expire at SLA and auto-refund). Every gate runs against it with no
  keys, no funds, no network.
- **Downtime keyed strictly on expiry, never raw refunds.** The detector records a downtime incident
  **only** on `order_expired` (+ its correlated refund tx as the proof). `order_rejected` (provider-reject
  refund) is **not** downtime — even though both emit `EscrowRefunded` on-chain. This is enforced by an
  explicit test.
- **Rolling in-flight escrow.** For each target, exactly one paid, undelivered heartbeat order is open at
  all times; on resolution the engine immediately opens the next — so any death lands inside an escrow
  window and always yields a refund proof.
- **Base event decoding on fixtures.** The chain module decodes CAPCore
  `0xaD46f1Eba2fe9cBB689D2874a52039192F2ac821` and CAPVault
  `0x33ECdcC8dD32330ec5a62AB1986F25ED5B5D170d` logs using ABI fragments sourced from
  `github.com/CROO-Network/cap-contracts` (§7.5), tested on recorded fixtures — never live RPC in any gate.
- **Live artifacts, human-gated execution.** `LiveCapClient`, `scripts/live-smoke.ts`, the
  register-agents runbook, and `.env.example` (env NAMES only:
  `CROO_SDK_KEY_DEADMAN`, `CROO_SDK_KEY_REQUESTER_1`, `CROO_SDK_KEY_REQUESTER_2`, `CROO_SDK_KEY_TARGET`,
  `BASE_RPC_URL`, `DEADMAN_MODE`) are built and type-checked, but every task that would run them live is
  `human_gate: true`.
- **Rehearsable money shot in mock.** `npm run demo` runs the whole system + dashboard in mock mode with a
  working kill-switch; the live run is a later config flip.

## 5. Architecture & subsystem decomposition

Single npm package, modules under `src/<subsystem>/`, colocated `*.test.ts`. Seven subsystems, one plan
each. The dependency DAG (subsystem level):

```
foundation ─┬─► mock-cap ─┬─► heartbeat ───────────┐
            │             ├─► downtime-attestation ─┼─► dashboard-demo
            │             └─► live-artifacts        │
            └─► chain-decode ───────────────────────┘ (chain-decode feeds live refund evidence + dev tooling)
```

| Subsystem | Responsibility | Depends on |
|---|---|---|
| **foundation** | Scaffold (package.json, tsconfig strict+ESM, vitest, .gitignore, .env.example); domain types; `CapClient` interface; env/mode config. | — |
| **mock-cap** | `MockCapService` (offline lifecycle state machine + controllable clock + event bus + target liveness), `MockCapClient`, `selectCapClient()` factory. | foundation |
| **heartbeat** | `RequesterShard` (per-wallet serialized `payOrder`), `HeartbeatScheduler` (target→shard assignment), `HeartbeatEngine` (rolling in-flight). | foundation, mock-cap |
| **downtime-attestation** | `DowntimeDetector` (expiry-keyed), `AttestationStore` (per-target uptime state + incidents), `buildCertificate`, `AttestationProvider` (Deadman sells certificates). | foundation, mock-cap |
| **chain-decode** | Sourced CAPCore/CAPVault event ABIs + `decodeCapLogs` + fixtures; extracts the `EscrowRefunded` tx for an expired order. | foundation |
| **dashboard-demo** | Dashboard server (HTTP + WS + kill-switch endpoint), thin TS frontend (esbuild), full mock-mode wiring, headless end-to-end money-shot test. | foundation, mock-cap, heartbeat, downtime-attestation |
| **live-artifacts** | `LiveCapClient` (SDK adapter, tested with a fake), `scripts/live-smoke.ts`, register-agents runbook, wiring `.env.example`. | foundation, mock-cap |

## 6. Domain model (the load-bearing contracts — `src/domain/`)

These signatures are authored here and pasted verbatim into plans' `Provides:`/`Requires:`. **Every
cross-task interface below is character-for-character the manifest's resolution key.**

```ts
// src/domain/types.ts
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
  refundTxHash: TxHash | null;
  deliveryHash: TxHash | null;
  timestamp: number;
}
```

```ts
// src/domain/cap-client.ts
import type {
  Did, OrderId, NegotiationId, TxHash, Order, OrderStatus, CapEvent, EventType,
} from './types.js';

export interface NegotiateRequest {
  requesterDid: Did;
  providerDid: Did;
  amountUsdc: string;
  slaMinutes: number;
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
  getOrder(orderId: OrderId): Promise<Order>;
  listOrders(opts?: ListOrdersOpts): Promise<Order[]>;
  getDelivery(orderId: OrderId): Promise<Delivery>;
  connectWebSocket(): Promise<CapEventStream>;
  close(): Promise<void>;
}
```

```ts
// src/domain/certificate.ts
import type { Did, OrderId, TxHash } from './types.js';

export interface DowntimeIncident {
  orderId: OrderId;
  expiredAt: number;
  refundTxHash: TxHash;   // the unforgeable proof — CAPVault EscrowRefunded tx
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

**Mode selection (`src/config/`):**
```ts
// src/config/mode.ts
export type DeadmanMode = 'mock' | 'live';
export function resolveMode(env: NodeJS.ProcessEnv): DeadmanMode; // default 'mock'; throws on invalid
```

`selectCapClient` (mock-cap) returns a `CapClient` per the resolved mode; the live branch constructs
`LiveCapClient` and is the only place the SDK is touched.

## 7. Per-subsystem design

### 7.1 foundation
Scaffolds the package and defines every shared contract in §6 (each type in its own focused file with a
colocated test asserting the shape/const values compile and behave). `.env.example` lists **only env var
names**. `resolveMode` parses `DEADMAN_MODE`. Gate style: `npx vitest run <file>` and `npx tsc --noEmit`.

### 7.2 mock-cap
`ManualClock`/`SystemClock` implementing a small `Clock` interface (`now()`, `setTimer(cb, ms)`,
`advance(ms)` on the manual one). `MockCapService` holds orders/negotiations, a target registry with
liveness, an event listener bus, and a deterministic tx-hash generator (`keccak256` of a counter+salt via
ethers, typed `TxHash`). Lifecycle:
- `negotiateOrder` → creates a `pending` negotiation, emits `negotiation_created`; if the provider is a
  registered **alive** target, the service **auto-accepts** (creates a `created` order, emits
  `order_created`). A killed target still auto-accepts (acceptance ≠ delivery) so the kill choreography
  (kill *after* escrow locks) is what produces the refund proof.
- `payOrder` → `paid`, sets `paidAt`, emits `order_paid`, **schedules SLA expiry** at `slaMinutes` via the
  clock. If the provider is an alive target, schedules an auto-`deliverOrder` shortly after pay.
- `deliverOrder` → `completed`, sets `deliveryHash` (keccak256 of payload), emits `order_completed`,
  cancels the pending SLA timer.
- SLA timer fires while still `paid` → `expired`, sets `refundTxHash` (a generated CAPVault refund tx
  hash), emits `order_expired`.
- `rejectNegotiation`/`rejectOrder`-from-paid → `rejected`, sets `refundTxHash`, emits `order_rejected`.
Control surface (NOT on `CapClient`): `registerTarget(did, {alive})`, `killTarget(did)`,
`reviveTarget(did)`, `advanceClock(ms)`. `MockCapClient(service, selfDid)` is a per-agent view over the
shared service. `selectCapClient(deps)` returns the mode-appropriate client.

### 7.3 heartbeat
`RequesterShard` wraps one `CapClient` (one requester wallet) and serializes `payOrder` through an
internal promise queue (never two concurrent pays per wallet). `HeartbeatScheduler` round-robins targets
across 2–3 shards. `HeartbeatEngine` keeps **one in-flight paid order per target**: negotiate → wait for
`order_created` → pay; on `order_completed`/`order_expired`/`order_rejected` for that target, open the
next. Exposes current in-flight state for the dashboard. Tests use `MockCapService` + `ManualClock`:
assert exactly-one-in-flight, serialized pays, and reopen-on-resolve.

### 7.4 downtime-attestation
`DowntimeDetector` subscribes to a `CapEventStream`: on `order_expired` → record a `DowntimeIncident`
(with `refundTxHash`); on `order_completed` → count a good heartbeat; on `order_rejected` → **ignore for
downtime** (retryable, not a signal). `AttestationStore` aggregates per-target totals + incidents.
`buildCertificate(targetDid, issuerDid, store, now)` → `UptimeCertificate` (status: `healthy` no
incidents, `degraded` some, `down` if the latest heartbeat is currently expired). `AttestationProvider`
plays Deadman's provider side over a `CapClient`: on `negotiation_created` for its own DID →
`acceptNegotiation`; on `order_paid` → `deliverOrder` with the certificate as the schema payload (its
keccak256 delivery hash lands on-chain like any CAP deliverable). The **critical test**: a rejected order
that emitted a refund produces **zero** downtime incidents.

### 7.5 chain-decode
ABI fragments (sourced verbatim 2026-07-05 from `cap-contracts/interfaces`, main):

```
// CAPCore  0xaD46f1Eba2fe9cBB689D2874a52039192F2ac821 (ICAPCore.sol)
event OrderCreated(uint256 indexed orderId, address indexed requestor, address indexed provider, uint256 budget, address paymentToken, uint256 deliveryWindow, string serviceId, bool isFundOrder, bool needEvaluation, bytes fundParams)
event OrderPaid(uint256 indexed orderId)
event OrderDelivered(uint256 indexed orderId, bytes deliveryData, uint256 deliveredAt)
event OrderCleared(uint256 indexed orderId, bytes deliveryData)
event OrderRejected(uint256 indexed orderId, address rejectedBy, string reason)
event OrderExpired(uint256 indexed orderId)
// CAPVault 0x33ECdcC8dD32330ec5a62AB1986F25ED5B5D170d (ICAPVault.sol)
event EscrowLocked(uint256 indexed orderId, address token, uint256 amount)
event PaymentReleased(uint256 indexed orderId, address provider, uint256 providerAmount, address treasury, uint256 platformFee)
event EscrowRefunded(uint256 indexed orderId, address requestor, uint256 amount)
```

`decodeCapLogs(logs)` uses ethers `Interface.parseLog` to decode a raw log array into typed events.
`findRefundForExpiry(logs, orderId)` returns the `EscrowRefunded` tx hash for an **expired** order — and
returns `null` when the order was `OrderRejected` (proving the raw-refund-is-not-downtime rule at the
chain layer too). Tested purely on recorded JSON fixtures. A source comment + HUMAN_TODO ask a human to
re-verify the on-chain ABI before the live run.

### 7.6 dashboard-demo
`DashboardServer` (Node `http` + `ws`): serves `index.html` + the esbuild bundle; exposes `GET /api/state`
(targets, in-flight heartbeats, certificates) and `POST /api/kill` / `POST /api/revive` (drive the mock's
`killTarget`/`reviveTarget`); pushes state deltas over WS on every `CapEvent`. Frontend `src/dashboard/view/app.ts`
holds a pure `renderState(state) → string` (unit-tested, no DOM) plus a tiny bootstrap that injects it and
opens the WS. `src/dashboard/main.ts` (`npm run demo`) wires `MockCapService` + engine + detector + store +
provider + server and registers demo targets/buyers. **Headless money-shot integration test**: register a
target, run a heartbeat to `paid`, `killTarget`, advance the clock past SLA, assert `order_expired` fired,
a downtime incident was recorded, and the rebuilt certificate is `down` and cites the `refundTxHash` — the
whole thesis proven with no browser.

### 7.7 live-artifacts
`SdkAgentClient` — a local structural interface mirroring the documented SDK surface (`negotiateOrder`,
`acceptNegotiation`, `rejectNegotiation`, `payOrder`, `deliverOrder`, `getOrder`, `listOrders`,
`getDelivery`, `connectWebSocket`). `LiveCapClient(sdk: SdkAgentClient, selfDid)` maps `CapClient` →
SDK calls and SDK events → `CapEvent`; **unit-tested against a fake `SdkAgentClient`, fully offline**.
`scripts/live-smoke.ts` dynamically imports `@croo-network/sdk`, builds `LiveCapClient`s from env keys, and
runs one heartbeat + one forced SLA-expiry + prints the refund tx — **`human_gate: true`, never run by the
build**. `docs/runbooks/register-agents.md` is the Dashboard registration + funding runbook. `.env.example`
(names only) is finalized here.

## 8. Data flow — the money shot (mock, identical semantics to live)

1. `HeartbeatEngine` negotiates a $0.01 heartbeat to target T → mock auto-accepts → `order_created`.
2. Engine `payOrder` → escrow locks → `order_paid` → SLA timer armed. One in-flight order now open on T.
3. Presenter clicks **Kill** → `POST /api/kill` → `killTarget(T)`; T will no longer deliver.
4. Clock passes `slaMinutes` with the order still `paid` → mock emits `order_expired` + sets the CAPVault
   `refundTxHash`.
5. `DowntimeDetector` records the incident citing `refundTxHash`; `AttestationStore` updates.
6. `AttestationProvider` re-issues the certificate → status flips to `down`, incident cites the tx.
7. Dashboard WS pushes the new state → the target card goes red and the certificate JSON on-screen shows
   the incident with its refund tx hash. *An unplugged process becomes an on-chain fact with a tx hash.*

## 9. Error handling
- SDK/network/`APIError` live only behind `LiveCapClient`; the mock never throws network errors.
- `payOrder` concurrency is structurally prevented per wallet by `RequesterShard`'s queue.
- `insufficient_balance` and other live faults surface in the live smoke only (human-gated); the smoke
  prints actionable guidance (fund the AA wallet). No secret ever appears in logs.
- Invalid `DEADMAN_MODE` throws at startup with a clear message.
- Dashboard WS disconnects auto-reconnect client-side; server tolerates zero clients.

## 10. Testing strategy
- **Every gate is `npx vitest run <file>` or `npx tsc --noEmit`, fully offline.** No gate touches the
  network, a key, or a chain.
- TDD per task: failing test → confirm fail → minimal impl → confirm pass.
- Determinism via `ManualClock` (SLA expiry is `advanceClock`, never a real wait).
- The **headless end-to-end money-shot test** (§7.6) is the strongest gate — it proves the product thesis
  without a browser or a chain.
- Live artifacts are gated by offline unit tests (fakes) + `tsc`; their live execution is human-gated.

## 11. Live-mode artifacts & human gates
Human-gated tasks (execution only — the artifacts are built and type-checked by the pool):
- Running `scripts/live-smoke.ts` (uses keys, places real orders, moves USDC).
- Registering agents / funding AA wallets / listing on the Agent Store / filing the BUIDL / recording the
  video / recruiting counterparties.
These go to HUMAN_TODO.md; downstream build tasks depend only on the mock seam, so nothing hard-blocks.

## 12. Risks & mitigations
- **SDK surface drift** (docs vs real 0.2.1) → `LiveCapClient` is isolated behind `SdkAgentClient` and
  fake-tested; a mismatch is a one-file fix at the live edge, never in product logic. HUMAN_TODO: verify
  during the live smoke.
- **Real event ABI drift** → ABIs are sourced (§7.5) not guessed; decoder is ABI-file-driven so a
  corrected fragment is a data change. HUMAN_TODO: re-verify on-chain before live decoding.
- **Deadline conflict** → plan to the earlier date; HUMAN_TODO: confirm with host.
- **Browser fragility** → all logic is headless-tested; the browser view is eyeball-only, never a gate.

## 13. Deployment / demo
- **Mock demo (today, rehearsable):** `npm install` → `npm run demo` → open the dashboard → click Kill →
  watch the certificate downgrade. Also `npm test` proves every gate offline.
- **Live flip (human, later):** register agents + fund AA wallets (runbook) → fill `.env` from
  `.env.example` → `DEADMAN_MODE=live npm run live:smoke` → verify on Basescan → record the live kill.

## 14. Mock-first requirements conformance checklist (for the spec-reviewer)
- [x] One `CapClient` seam; `MockCapClient` default + `LiveCapClient`; env-only selection; mode-blind logic. (§4, §6, §7.2, §7.7)
- [x] Local mock CAP service: full lifecycle (negotiate→accept→pay→deliver→CLEAR), SLA-expiry→EXPIRED+refund, provider-reject→refund, all six WS events; every gate offline. (§4, §7.2)
- [x] Downtime keyed strictly on `order_expired` + refund evidence; provider-reject is NOT downtime; rolling in-flight escrow. (§4, §7.3, §7.4)
- [x] Base event decoding for CAPCore/CAPVault against sourced ABIs, tested on fixtures (not live RPC). (§7.5)
- [x] Live artifacts exist but human-gated: smoke script, register runbook, `.env.example` (names only, exact set). (§4, §7.7, §11)
- [x] Dashboard runs fully in mock, kill-switch demo included; money shot rehearsable end-to-end today; live run is a config flip. (§7.6, §8, §13)
- [x] Out-of-scope list honored. (§3)
