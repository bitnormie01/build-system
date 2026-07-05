# Deadman — Autonomous Full-Build Run Report

**Date:** 2026-07-05 · **Mode:** fully autonomous (architect → orchestrator → report), one Claude Code
session, no human interaction · **Result:** ✅ complete, verified mock-mode product; money shot proven live
through the real HTTP kill-switch.

- **Spec:** [docs/superpowers/specs/2026-07-05-deadman-design.md](../superpowers/specs/2026-07-05-deadman-design.md)
- **Plans:** [docs/superpowers/plans/](../superpowers/plans/) (7 subsystem plans)
- **Manifest:** [docs/superpowers/manifest.json](../superpowers/manifest.json) (32 tasks) · Validator:
  [docs/superpowers/validate.mjs](../superpowers/validate.mjs)
- **Decision log:** [docs/decisions/2026-07-05-autonomous-decisions.md](../decisions/2026-07-05-autonomous-decisions.md)
- **Human hand-off:** [HUMAN_TODO.md](../../HUMAN_TODO.md)

---

## 1. Outcome at a glance

- **31 / 32 tasks built and gate-verified**; **1 human-pending** (`live-artifacts:4`, the live smoke — built
  and type-checked, never run, per the safety envelope).
- **Full `tsc --noEmit`: clean (0 errors).** **Full test suite: 58 tests across 31 files, all passing.**
  Frontend bundles via esbuild.
- **Money shot verified live** (mock mode): started the real dashboard server, killed a target through the
  `POST /api/kill` endpoint, and after the accelerated SLA the target downgraded to **DOWN** citing an
  on-chain-style refund tx (`0xc6db…1fc6e`) while healthy targets stayed healthy — the presenter's exact
  interaction, rehearsable today.
- **Zero safety-line crossings:** no secret values (env NAMES only; the smoke script has 0 hardcoded keys),
  no signed/broadcast tx, no deploy, no funds moved, no live orders, no external submissions.

## 2. What was built (per subsystem)

Single strict-ESM TypeScript package (Node ≥20), 28 source modules + 31 test files under `src/` + `scripts/`.
All product logic is **mode-blind** — it consumes a `CapClient` seam and never branches on mock vs live.

| Subsystem | What it does | Key proof |
|---|---|---|
| **foundation** | Scaffold + the shared domain contracts: `CapClient` seam, `Order`/`CapEvent`/`EventType`, certificate types, `resolveMode`, `.env.example` (names only). | The safety-gate test asserts the 4 `CROO_SDK_KEY_*` vars carry empty values. |
| **mock-cap** | Offline in-memory CAP network: `MockCapService` (full lifecycle negotiate→accept→pay→deliver→CLEAR, SLA-expiry→EXPIRED+refund, provider-reject→refund; six WS events), a controllable `Clock`, `MockCapClient`, `createMockEnvironment`. | 4-scenario state-machine test: alive completes; killed→expiry+refund+`order_expired`; declining→reject+refund+`order_rejected` (NOT expired); non-target waits. |
| **heartbeat** | Requester side: `RequesterShard` (serialized `payOrder`), `TargetMonitor` (rolling one-in-flight), `HeartbeatEngine` (round-robin sharding across 2–3 requesters). | Serialization + exactly-one-in-flight + kill→expiry + sharding tests. |
| **downtime-attestation** | The thesis: `DowntimeDetector` keys downtime **strictly on `order_expired` + refund evidence** (reject-refund is neutral); `AttestationStore`; `buildCertificate`; `AttestationProvider` (Deadman sells certificates). | Load-bearing test: killed target's expiry → 1 incident citing refund tx; declining target's provider-reject → **0** incidents despite a refund. |
| **chain-decode** | Base event decoding: **verbatim CAPCore/CAPVault event ABIs sourced from `cap-contracts`**, `decodeCapLogs` + `findRefundForExpiry`, tested on recorded fixtures (real keccak256 topic hashes). | `findRefundForExpiry(expiry,42)` → refund tx; `findRefundForExpiry(reject,43)` → **null** (thesis at the chain layer). |
| **dashboard-demo** | The single demo view: snapshot projection, HTTP+WS server with kill-switch, thin TS/esbuild browser view, full mock wiring, and the **headless money-shot E2E test**. | E2E: kill a monitored target → in-flight order expires → certificate downgrades to `down` citing `refundTxHash`. Verified again live over HTTP. |
| **live-artifacts** | The live edge (human-gated execution): `LiveCapClient` (SDK adapter, fake-tested offline), `createLiveEnvironment` (dynamic non-literal SDK import — SDK never loads on the mock path), the human-gated live smoke, the register-agents runbook. | Adapter maps an SDK `OrderExpired` → `order_expired` `CapEvent` with `refundTxHash`; live env tested with an injected fake. |

## 3. Full task table

Legend: **PASS** = built by an executor subagent, gate re-run and verified by the orchestrator, committed.
**human-pending** = artifact built + type-checked, live execution deferred to a human (safety).
Retries used: **0 executor-miss retries** across all 32 tasks. One **plan-bug fix** (see §5) triggered a
single re-dispatch of `chain-decode:1`.

| Task | Title | Gate | Result | Retries |
|---|---|---|---|---|
| foundation:1 | Scaffold the package | `vitest run src/smoke.test.ts` | PASS | 0 |
| foundation:2 | Domain order & event types | `vitest run src/domain/types.test.ts` | PASS | 0 |
| foundation:3 | CapClient seam interface | `vitest run src/domain/cap-client.test.ts` | PASS | 0 |
| foundation:4 | Uptime certificate types | `vitest run src/domain/certificate.test.ts` | PASS | 0 |
| foundation:5 | Mode resolver | `vitest run src/config/mode.test.ts` | PASS | 0 |
| foundation:6 | Environment template (env NAMES only) | `vitest run src/config/env-example.test.ts` | PASS | 0 |
| mock-cap:1 | Controllable clock | `vitest run src/cap/clock.test.ts` | PASS | 0 |
| mock-cap:2 | Id & hash factory | `vitest run src/cap/ids.test.ts` | PASS | 0 |
| mock-cap:3 | Scoped event bus | `vitest run src/cap/event-bus.test.ts` | PASS | 0 |
| mock-cap:4 | Mock CAP service (lifecycle state machine) | `vitest run src/cap/mock-service.test.ts` | PASS | 0 |
| mock-cap:5 | MockCapClient | `vitest run src/cap/mock-client.test.ts` | PASS | 0 |
| mock-cap:6 | Mock environment & control surface | `vitest run src/cap/environment.test.ts` | PASS | 0 |
| heartbeat:1 | Requester shard (serialized payOrder) | `vitest run src/heartbeat/requester-shard.test.ts` | PASS | 0 |
| heartbeat:2 | Target monitor (rolling in-flight) | `vitest run src/heartbeat/target-monitor.test.ts` | PASS | 0 |
| heartbeat:3 | Heartbeat engine (sharding + aggregation) | `vitest run src/heartbeat/heartbeat-engine.test.ts` | PASS | 0 |
| downtime-attestation:1 | Attestation store | `vitest run src/attestation/attestation-store.test.ts` | PASS | 0 |
| downtime-attestation:2 | Downtime detector (expiry-keyed) — thesis | `vitest run src/attestation/downtime-detector.test.ts` | PASS | 0 |
| downtime-attestation:3 | Certificate builder | `vitest run src/attestation/certificate-builder.test.ts` | PASS | 0 |
| downtime-attestation:4 | Attestation provider (sells certificates) | `vitest run src/attestation/attestation-provider.test.ts` | PASS | 0 |
| chain-decode:1 | Sourced ABIs & canonical addresses | `vitest run src/chain/addresses.test.ts` | PASS | 1 (plan-bug re-dispatch) |
| chain-decode:2 | Recorded log fixtures | `vitest run src/chain/fixtures/fixtures.test.ts` | PASS | 0 |
| chain-decode:3 | Log decoder & refund-for-expiry correlation | `vitest run src/chain/decode.test.ts` | PASS | 0 |
| dashboard-demo:1 | Dashboard snapshot projection | `vitest run src/dashboard/snapshot.test.ts` | PASS | 0 |
| dashboard-demo:2 | Dashboard HTTP + WebSocket server | `vitest run src/dashboard/server.test.ts` | PASS | 0 |
| dashboard-demo:3 | Browser view (renderState + shell) | `vitest run src/dashboard/view/app.test.ts` | PASS | 0 |
| dashboard-demo:4 | Demo system wiring + money-shot E2E | `vitest run src/dashboard/demo-system.test.ts` | PASS | 0 |
| dashboard-demo:5 | Real-time demo entrypoint | `vitest run src/dashboard/main.test.ts` | PASS | 0 |
| live-artifacts:1 | SDK structural interface + event-type mapping | `vitest run src/live/sdk-agent-client.test.ts` | PASS | 0 |
| live-artifacts:2 | LiveCapClient (SDK adapter) | `vitest run src/live/live-cap-client.test.ts` | PASS | 0 |
| live-artifacts:3 | Live environment (dynamic SDK import) | `vitest run src/live/live-environment.test.ts` | PASS | 0 |
| live-artifacts:4 | Live smoke script (HUMAN-GATED) | `tsc --noEmit` | **human-pending** | 0 |
| live-artifacts:5 | Register-agents runbook | `vitest run src/live/register-runbook.test.ts` | PASS | 0 |

## 4. Auto-decisions & amendments

All decisions with options-considered and rationale are in
[docs/decisions/2026-07-05-autonomous-decisions.md](../decisions/2026-07-05-autonomous-decisions.md).
Headlines: single npm package (D1); one spec + per-subsystem plans (D2); web dashboard for the money shot
(D3); `@croo-network/sdk` as an edge/optional dependency, never on the mock path (D4); ethers v6 aligned
with the SDK (D5); **real CAPCore/CAPVault event ABIs sourced from `cap-contracts` — top residual risk
eliminated** (D6); controllable clock + accelerated mock SLA, real 1-min SLA live (D7); plan string ID
aliases (D8); the six brief-specified WS events (D9); plan to the earlier deadline (D10); vitest/tsx/esbuild
tooling (D11).

**Amendments invoked (logged):**
- **D12 — subagent effort → model mapping.** The Agent tool here exposes a `model` parameter, not `effort`,
  so each task's `**Effort:**` drove model choice (`high`/`xhigh` → opus; `low`/`medium` → sonnet; reviewers
  → opus). Effort stayed a first-class, Stage-4-validated field. The orchestrator (Opus) re-ran every gate
  regardless of executor model.
- **Stage-2 gate:** delegated approval via an opus spec-reviewer subagent + brief-conformance checks →
  Approved; two sound recommendations folded in (`rejectOrder` on `CapClient`; the kill mechanism =
  auto-deliver re-checks liveness at fire time).
- **Stage-4 gate:** one plan-document-reviewer subagent per plan (all 7 **Approved**); manifest generated by
  projection and validated mechanically (all 5 checks) by `validate.mjs`, which was hardened mid-run to
  preserve task statuses across regeneration.
- **Execution strategy:** parallel executor dispatch for disjoint-file tasks with **strictly serial
  orchestrator verification** (each gate re-run one at a time — authoritative), explicit-path commits, and
  periodic full-`tsc` + full-suite baselines on a clean tree. tsc-gated tasks used a scoped self-check
  during parallel build; the orchestrator ran the full `tsc` after the tree settled.

## 5. Failures left open

**None.** Every task is built and verified; `live-artifacts:4` is `human-pending` by design (its purpose is
a live action). One issue was found and fixed during the build:

- **Plan bug — JSON imports under NodeNext.** The chain-decode plan imported ABI/fixture JSON without the
  `with { type: 'json' }` attribute. vitest (esbuild) accepted it, but the orchestrator's project-wide
  `tsc --noEmit` hygiene check caught it (`TS1543`). Per the doctrine this was routed back to the architect
  seat: the plan was fixed, the manifest re-validated, and `chain-decode:1` re-dispatched — the one retry in
  the run. This is exactly why vitest gates are paired with periodic full `tsc`.

## 6. Run the mock demo end-to-end (today, no keys/funds/network)

```bash
cd <repo>                       # this repository
npm install                     # installs deps (optional @croo-network/sdk may warn — harmless)
npm test                        # 58 tests across 31 files — all green, fully offline
npm run typecheck               # tsc --noEmit — clean
npm run demo                    # builds the frontend, starts the dashboard on http://localhost:4000
#   → open the URL, watch heartbeats stream green, click **Kill** on "did:kill-target",
#     and after the accelerated SLA (~8s) watch it flip to DOWN citing the refund tx hash.
#     (The "did:declining" target stays healthy — its reject-refunds are NOT downtime.)
```

The headless proof of the same money shot is the gate
`npx vitest run src/dashboard/demo-system.test.ts`. To go live later, see [HUMAN_TODO.md](../../HUMAN_TODO.md)
— it is a single `DEADMAN_MODE=live` config flip plus the human-only registration/funding steps.

## 7. Repo state

- **Branch:** `main` (canonical) · pushed to `origin/main`.
- **HEAD at report time:** `0c087c5`.
- **Run commits:** 44 (architect artifacts, 32 task commits incl. 1 plan-bug fix + re-dispatch, and
  orchestration/manifest chore commits). Task commits use each plan's Step-5 message; artifacts/chores are
  conventional commits. Full list: `git log --oneline b3e22c9..HEAD`.
- **Tests:** 58 passing / **tsc:** clean / **frontend:** builds.
