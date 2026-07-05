# Deadman — cryptoeconomic uptime attestations for AI agents

**Idea-forge brief (Step 0) · CROO Agent Hackathon · 2026-07-05**
Selected from a 51-candidate field (6-lens divergence + bolder-pass) via the buildability-gated weighted
rubric (30/25/25/20, novel-wow), white-space classification against all 62 live rival BUIDLs, a judge's-eye
head-to-head, and an adversarial blocker hunt. Primary sources:
[docs/resources/2026-07-05-croo-hackathon/](../resources/2026-07-05-croo-hackathon/INDEX.md).

## Problem

Agents claim "99.9% uptime" at zero cost of lying: pings and status pages are free to fake and prove
nothing about deadline behavior when real escrowed money is on the line. Buyers about to lock USDC in
escrow against an unknown CAP provider have no unforgeable liveness signal — and the 62-project field
offers none (its trust rivals read order history or run checklist audits; none *manufacture* evidence).

## Solution

Deadman is a liveness oracle that continuously places tiny real escrowed heartbeat orders against
monitored CAP agents and treats every **SLA auto-refund as a cryptoeconomic downtime proof** — money
coming back is unforgeable evidence the agent missed its deadline — then sells the resulting uptime
attestation as its own paid CAP service.

## Must-have demo features (minimum for the money shot)

1. **Heartbeat engine (requester side):** rolling in-flight escrowed heartbeat orders
   (negotiate → auto-accept → `payOrder`) against each monitored target, sharded across 2–3
   team-registered requester agents (serializes `payOrder` per wallet; diversifies the order graph).
   Downtime is keyed **strictly on `order_expired` events + the CAPVault refund tx** (read via public
   RPC) — never on raw refunds, because provider-reject refunds also exist and a healthy-but-declining
   agent must not read as down. "Rolling in-flight" means one paid, undelivered order is always open per
   target, so *any* death lands inside the escrow window and always yields on-chain proof.
2. **Attestation service (provider side):** Deadman itself is a listed, paid CAP agent — any buyer pays
   (e.g. $0.05) and receives a structured-JSON uptime certificate for a target DID in which **every
   downtime incident cites its SLA-refund tx hash on Base**; the certificate's own delivery hash lands
   on-chain like any CAP deliverable.
3. **Live kill-switch dashboard:** monitored targets shown green with their heartbeat streams; presenter
   kills a team-owned target **after `payOrder` locks escrow and before delivery** (this choreography is
   load-bearing — a dead agent that never accepted produces no escrow and no proof); the 1-minute SLA
   lapses, the refund tx lands, and the certificate visibly downgrades citing that tx.

## Target sponsor track(s)

**Data & Verification Agents** (primary) + **Developer Tooling Agents** (secondary — its subjects and
buyers are the other CAP builders). Event allows max 2 tracks per BUIDL.

## Judging criteria (published, verbatim weights)

Technical Execution **30%** (robust CAP integration, reliable A2A interactions, proper payment state
handling; bonus: 10+ real CAP orders during the hackathon) · A2A Composability **25%** (number,
diversity, depth of A2A relationships; CROO supplies aggregated CAP order data to judges) · Innovation
**20%** ("Would this be impossible, or much worse, on a normal API marketplace?") · Usability & Real
Adoption **15%** (path to real users, early organic interactions, retention potential) · Presentation
**10%** (demo clarity, README reproducibility, value-prop crispness; scored at Demo Day).
Anti-sybil reward-eligibility: ≥3 unique counterparty agents, ≥5 unique buyer wallets, no concentrated
self-trade; fake demo or broken CAP integration = hard DQ.
(Source: [event.md](../resources/2026-07-05-croo-hackathon/event.md), extracted verbatim 2026-07-05.)

## Why it wins

**White space:** unlike the crowded trust cluster (CROO Reputation Oracle, Trust Lab, Veritas Fides,
VERIDEX, CAP Sentinel — all reading existing order history or running checklist audits), Deadman
*manufactures fresh, unforgeable evidence*: no project among the 62 touches the SLA-auto-refund
primitive as a product mechanism. **Head-to-head** (vs Flow Forensics, the closest shape, and CROO
Reputation Oracle, the closest value prop): wins **Technical Execution (30%)** — its core mechanic runs
the order → deadline → auto-refund state transition on every heartbeat, and each heartbeat is a real
CAP order so the 10+-orders bonus is met mechanically within hours, not aspirationally; wins
**Innovation (20%)** on the judges' own published test — a normal marketplace has no escrowed SLA
refunds, so "a status page can lie, a refund tx cannot" cannot exist there; ties A2A Composability
(breadth-vs-depth standoff with Attestr.CROO's 5-agent mesh) with no clear loss anywhere.

## Demo money shot (~15 seconds)

Presenter kills a monitored agent live on stage → the in-flight $0.01 heartbeat's SLA hits zero → the
CAPVault auto-refund tx lands on Base → the target's uptime certificate downgrades on-screen, citing
that refund hash as the incident record. *An unplugged process becomes an on-chain fact with a tx hash.*

## Out of scope (explicit)

- **Auto-failover / backup-hiring** on downtime (a different candidate's product; attestations only).
- **Non-CAP monitoring** (HTTP pings, status pages) — CAP escrowed orders only; that IS the thesis.
- **Quality/schema/reputation scoring** beyond liveness (ProbeStamp/Reputation-Oracle territory).
- **Custom smart contracts** — CAP SDK surface only (plus read-only RPC and, as fallback, the
  permissionless expiration call; see feasibility).
- **CROOExchange / agent trading** (not publicly available), token issuance, any mobile/Telegram UI.
- Any dashboard beyond the single demo view.

## Feasibility notes for the architect (primitives, not design)

Transcribed from [sponsors/croo.md](../resources/2026-07-05-croo-hackathon/sponsors/croo.md) (fetched
2026-07-05); full detail there.

- **Network:** Base Mainnet (Chain ID 8453), protocol v2, ERC-4337 EntryPoint v0.7, AA = Biconomy
  NexusFactory (CREATE2). Gas fully sponsored via Paymaster (PIMLICO) — no ETH needed for CAP flows.
- **Contracts (verbatim):** CAPCore `0xaD46f1Eba2fe9cBB689D2874a52039192F2ac821` (state; order lifecycle
  NEGOTIATION→LOCK→DELIVER→CLEAR; also `expireAndRefund` transition) · CAPVault
  `0x33ECdcC8dD32330ec5a62AB1986F25ED5B5D170d` (funds; escrow lock/release/refund; only callable by
  CAPCore) · CROOValidationModule `0xfCc7eefd6D22bC6a4F35B467928ecAF738d0B3b8`. Source:
  https://github.com/CROO-Network/cap-contracts (open source — pull event ABIs from here for RPC log
  decoding; contracts may be unverified on Basescan, so decode locally).
- **Payment token:** USDC on Base `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.
- **SDK (Node 18+):** `npm install @croo-network/sdk`. Env: `CROO_API_URL=https://api.croo.network`,
  `CROO_WS_URL=wss://api.croo.network/ws`, `CROO_SDK_KEY=croo_sk_...` (per agent; Dashboard-issued,
  shown once), optional `BASE_RPC_URL` (default `https://mainnet.base.org`). Key methods:
  `negotiateOrder(req)` / `acceptNegotiation(id)` / `rejectNegotiation(id, reason)` (dual-sig
  `createOrder` fires on accept) · `payOrder(orderId)` (auto-handles USDC approve; escrow locks; SLA
  countdown starts) · `deliverOrder(orderId, req)` (keccak256 of deliverable written on-chain) ·
  `getOrder` / `listOrders` / `getDelivery`. WebSocket: `connectWebSocket()` +
  `EventType.{OrderCreated,OrderPaid,OrderCompleted,OrderRejected,OrderExpired,NegotiationCreated,...}`.
  Errors: `APIError` + `isInsufficientBalance` etc. Examples: `examples/provider.ts`,
  `examples/requester.ts` in https://github.com/CROO-Network/node-sdk.
- **Order-state facts the product depends on (verbatim-derived):** SLA timeout → `expired` → escrow
  auto-refunded to Requester; provider-reject from `paid` → refund (so **downtime detection must key on
  `order_expired`, never on "a refund happened"**); "There are two on-chain expiration windows. After
  timeout, **anyone can trigger expiration processing**" — fallback if the platform sweeper lags: call
  the expiration path directly against CAPCore (needs one gas-funded EOA, ~$2 ETH on Base; only
  non-sponsored action in the build).
- **Hard gotchas:** `payOrder` is NOT concurrency-safe per wallet — serialize per requester agent, shard
  across 2–3 registered requester agents to scale heartbeats. One active WebSocket per API key. Deposit
  USDC to each requester agent's **AA Wallet Address** (Dashboard → Configure), never the
  Controller/Executor address. Service creation/config (price, **SLA minutes — minimum granularity is
  minutes, set in Dashboard, not editable via SDK**) is Dashboard-manual; SDK is runtime-only; no SDK
  withdraw; no SDK service-discovery (monitored targets are onboarded explicitly — fine for this
  product, it's subscription-based by design).
- **Anti-sybil / demand plan (day-1 externals to request):** (1) Dashboard-register ~4 agents manually
  (Deadman provider, 2 heartbeat requesters, 1 kill-target with 1-minute SLA) — API keys shown once;
  (2) deposit small USDC (≈$10 total) to requester AA wallets; (3) recruit ≥2 partner teams as monitored
  targets — the pitch is trivial: **targets get paid real USDC per heartbeat** — plus ≥5 external wallets
  to buy attestations before judging (Discord office hours / Ask-Question board). Heartbeats to partner
  targets also dilute the self-trade footprint.
- **Demo-choreography constraint (correctness, not staging):** the refund proof only exists for orders
  that died between `payOrder` and `deliverOrder` — kill the target *after* escrow locks. Rehearse real
  lapse-to-refund latency on mainnet beforehand; pre-stage one in-flight order before presenting.

---

*Hand-off: paste the architect kickoff block (below, in the session log / INVOKE_ARCHITECT format) into a
fresh session. The architect plans from this committed brief + the resource pack as the single source of
truth.*
