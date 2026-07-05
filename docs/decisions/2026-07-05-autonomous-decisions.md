# Autonomous Run — Decision Log

**Run:** Deadman full autonomous build (architect → orchestrator → report), one Claude Code session,
no human interaction. Started 2026-07-05.

Every open choice under the AUTONOMY CONTRACT is logged here: what was decided, the options considered,
and why. Protocol-recommended defaults are taken first; where the protocol is silent, the brief decides;
where still open, the simpler option that preserves the demo money shot wins. Safety lines
(`conventions.md` §Safety) never bend.

---

## Phase 1 — Architect

### D1. Repo layout: single npm package (not a monorepo/workspaces)
- **Options:** (a) npm/pnpm workspaces monorepo with `@deadman/*` packages; (b) single package with
  module folders under `src/`.
- **Decision:** (b) single package, modules under `src/<subsystem>/`.
- **Why:** The brief requires no package boundaries; a single package is faster to scaffold, has one
  `tsconfig`/`vitest` config, and removes cross-package build ordering. Simpler option, money shot
  unaffected.

### D2. One spec + per-subsystem plans (not one spec per subsystem)
- **Options:** (a) a separate spec+plan per subsystem (literal reading of the decomposition gate); (b)
  one master spec covering the coherent product + one plan file per subsystem.
- **Decision:** (b) — matches the `task-contract.md` §2 manifest example (one `spec`, many
  `subsystems`/plans). The decomposition gate is satisfied by the per-subsystem plan split.
- **Why:** Deadman is one coherent product with internal subsystems, not independent sub-projects. One
  spec keeps the shared domain contract in a single source of truth; plans split the work.

### D3. Demo surface: web dashboard (not a terminal TUI)
- **Options:** (a) terminal/CLI live view (simplest, fully testable); (b) minimal web dashboard
  (HTTP + WebSocket + thin browser view).
- **Decision:** (b) web dashboard, backend-heavy for testability, thin TS frontend built with esbuild.
- **Why:** The money shot is an *on-screen* certificate downgrade for a ≤5-min video — a web view lands
  it far better than a terminal. Robustness is preserved by putting all logic in a headless-testable
  backend and proving the full money shot with a headless end-to-end integration test; the browser is
  eyeball-only, never a gate.

### D4. `@croo-network/sdk` is an edge/optional dependency, not a core one
- **Findings:** `@croo-network/sdk@0.2.1` is published; it depends on `ethers ^6.13.0` + `ws ^8.18.0`.
- **Decision:** Core/mock code never imports the SDK. `LiveCapClient` is built against a local
  structural interface (`SdkAgentClient`) mirroring the documented SDK surface and is unit-tested with a
  fake, fully offline. The real `@croo-network/sdk` is an `optionalDependencies` entry, imported
  dynamically only inside the human-gated live smoke script.
- **Why:** The offline mock build (every gate) must never block on the SDK installing, versioning, or
  connecting. `optionalDependencies` installs it when possible (for the human's live run) but a failure
  is non-fatal. Keeps product logic mode-blind and the mock path hermetic.

### D5. Chain library: ethers v6 (not viem)
- **Options:** (a) viem; (b) ethers v6.
- **Decision:** (b) `ethers ^6.13.0` for `keccak256` (mock delivery/refund hashes, certificate hashing)
  and event-log decoding (`Interface.parseLog`) in the chain-decode module.
- **Why:** The SDK already uses ethers v6, so aligning avoids a second chain lib and any version skew;
  ethers is a rock-solid always-installable direct dependency, so the mock build depends on it safely
  (never on the SDK). `TxHash` is defined locally as `` `0x${string}` `` (no viem `Hex` needed).

### D6. Real CAPCore/CAPVault event ABIs pulled from source (top residual risk eliminated)
- **Action:** Fetched `contracts/interfaces/ICAPCore.sol` and `ICAPVault.sol` from
  `github.com/CROO-Network/cap-contracts` (main, 2026-07-05). Extracted verbatim events:
  CAPCore `OrderExpired(uint256 indexed orderId)`, `OrderRejected(uint256 indexed orderId, address
  rejectedBy, string reason)`, `OrderCreated/Paid/Delivered/Cleared/Approved`, `FundExecutionMarked`;
  CAPVault `EscrowLocked`, `PaymentReleased`, `EscrowRefunded(uint256 indexed orderId, address
  requestor, uint256 amount)`.
- **Decision:** chain-decode is ABI-file-driven using these **sourced** signatures; fixtures are
  hand-built consistent with them; decoder logic is generic (ABI + logs → typed events).
- **Why:** The architect kit flags guessed addresses/signatures as the top residual risk. Sourcing the
  verbatim ABIs removes it. It also mechanically confirms the thesis: both expiry and provider-reject
  emit `EscrowRefunded`, so downtime MUST key on `OrderExpired`, never the raw refund. A code comment +
  a HUMAN_TODO note still ask a human to re-verify the on-chain ABI before the live run (belt-and-suspenders).

### D7. Controllable clock; demo-accelerated mock SLA, real 1-min SLA live
- **Decision:** An injectable `Clock` (`SystemClock` real, `ManualClock` test/demo). Mock SLA-expiry is
  scheduled via the clock so tests advance time deterministically. The mock SLA is configurable
  (default demo value ~10 s for a snappy video); the brief's real 1-minute SLA applies in live mode.
- **Why:** Deterministic, offline, fast gates; a rehearsable ≤15 s money shot without waiting a real
  minute on stage. Semantics (paid→expired→refund→cert-cites-tx) are identical to live.

### D8. Plain string ID aliases (not branded types)
- **Decision:** `type OrderId = string`, `type Did = string`, etc. `TxHash = \`0x${string}\``.
- **Why:** Branded types add constructor ceremony that stateless executors can get wrong across task
  boundaries; the safety win is small for a hackathon. Simpler option, fewer drift modes.

### D9. `EventType` = the 6 brief-specified wire events only
- **Decision:** `negotiation_created, order_created, order_paid, order_completed, order_rejected,
  order_expired` as a `const` object + union type (erasable, no TS `enum`).
- **Why:** The mock-first requirement names exactly these six. YAGNI on the SDK's extra negotiation
  events; `const`-object avoids `enum` pitfalls under strict ESM.

### D10. Deadline planning target: 2026-07-09 23:59 UTC+8
- **Decision:** Plan to the earlier of the two conflicting published deadlines (timeline graphic Jul 9;
  platform countdown Jul 12), per the kickoff and `event.md` conflict note.
- **Why:** Planning to the earlier date is safe under either interpretation. Confirming the true deadline
  with the host is a HUMAN_TODO item.

### D11. Tooling: vitest (tests), tsx (run scripts/demo), esbuild (frontend bundle)
- **Decision:** `vitest` for all gates; `tsx` to run TS entrypoints (`demo`, live smoke) without a
  compile step; `esbuild` to bundle the browser frontend TS → one ESM file served by the dashboard.
- **Why:** Standard, fast, offline. Node 22.21 is present (≥20 ✓). Avoids a heavyweight build pipeline.

### D12. Amendment: subagent effort → model mapping (Agent tool has no `effort` param)
- **Finding:** In this environment the Agent tool exposes a `model` parameter (`opus|sonnet|haiku|fable`)
  but **no `effort` parameter**, unlike the orchestrator skill's assumption
  (`task-contract.md` §6 / orchestrator SKILL "set the subagent's effort").
- **Decision:** Map each task's `**Effort:**` to a model: `high`/`xhigh` → **opus**; `low`/`medium` →
  **sonnet**; reviewer/gate subagents → **opus**. `effort` stays a first-class field in the plans and
  manifest (the contract requires it and Stage-4 validates it); it drives model selection at dispatch
  instead of a CLI/effort flag. I (Opus) re-run every gate and review every diff regardless of executor model.
- **Why:** Preserves the contract's effort semantics (budget/capability throttle) with the tool surface
  actually available. Sonnet for routine TDD tasks is fast and capable; opus for genuinely subtle/
  security-sensitive work. Logged as a Stage-2/3/4 amendment per the autonomy contract.

### Stage-gate amendment invoked: autonomous approval (Stage 2)
- Per the run's Stage-2 amendment, user approval is delegated. The design is presented in-session; a
  spec-reviewer subagent checks the written spec against the brief (money shot intact, out-of-scope
  honored, mock-first requirements encoded, no external blockers). Self-approve on a clean review; fix +
  re-review otherwise (max 2 cycles).
- **Outcome (cycle 1):** spec-reviewer (opus) returned **Approved** — all five brief-conformance gates
  PASS, safety airtight, money shot intact, out-of-scope honored. Two advisory (non-blocking)
  recommendations were incorporated because they remove real downstream ambiguity:
  1. Added `rejectOrder(orderId, reason): Promise<void>` to the `CapClient` interface (spec §6, foundation
     Task 3) — a real SDK method; it is the trigger the §7.4 reject≠downtime negative test needs.
  2. Specified the kill mechanism (spec §7.2): the mock's auto-deliver **re-checks target liveness at fire
     time**, so `killTarget` only flips a flag and a kill after escrow-lock reliably yields a refund proof;
     no timer cancellation required.
  Self-approved on the clean review + brief conformance. No second cycle needed.

### Stage 3 outcome — seven executor-ready plans
- Decomposed into 32 bite-sized TDD tasks across 7 subsystem plans (foundation 6, mock-cap 6, heartbeat 3,
  downtime-attestation 4, chain-decode 3, dashboard-demo 5, live-artifacts 5). Single-export-name
  provides/requires tokens (unique project-wide) so the Stage-4 validator resolves them by exact match.
- **chain-decode de-risked empirically:** fetched the verbatim CAPCore/CAPVault event ABIs from
  cap-contracts (D6), then used ethers 6.17 in the scratchpad to compute real keccak256 topic0 hashes +
  ABI-encoded fixtures and to verify `findRefundForExpiry(expiry,42)` → refund tx and
  `findRefundForExpiry(reject,43)` → null. The plan ships those exact recorded fixtures — no guessed hashes.

### Stage 4 outcome — reviews, manifest, mechanical validation
- **Plan-document-reviewer (task-contract §4) dispatched per plan** (7 opus subagents). **All 7 Approved,
  zero blocking issues.** Two non-blocking observations, both already sound: (a) `selectCapClient` (spec
  §5/§7.2) is superseded by the `createMockEnvironment`/`createLiveEnvironment` composition-root pattern
  (spec §6, already reconciled); (b) `TargetMonitor`'s order_created/pending branch is belt-and-suspenders
  for live mode (harmless in mock). Reviewers independently re-derived the money-shot timing and
  reproduced the chain decoder + a `tsc --noEmit` compile of a mirror project — no fixes required.
- **Manifest generated by projection, not by hand:** `docs/superpowers/validate.mjs` parses the plan
  grammar (§1), projects `docs/superpowers/manifest.json`, and runs all 5 Stage-4 checks mechanically.
  First run caught one real bookkeeping bug (mock-cap:5 required foundation:2 domain types but listed only
  foundation:3 in Depends-on) — fixed; re-run: **all 5 checks pass** (clean parse + valid DAG single-rooted
  at foundation:1; zero unmatched requires char-for-char; projection equality by construction; Effort on
  every task; `human_gate:true` only on live-artifacts:4, the live smoke). Effort mix: 10 low / 14 medium /
  8 high.

---

## Phase 2 — Orchestrator (build) outcome

- **Execution strategy (amendment):** dispatched executor subagents in parallel for disjoint-file ready
  tasks, but kept orchestrator **verification strictly serial** — every gate re-run one at a time by the
  orchestrator (Opus) as the authoritative check, explicit-path commits per task, and periodic full
  `tsc --noEmit` + full-suite baselines on a clean tree. tsc-gated tasks (pure-type files, live smoke) used a
  scoped `tsc | grep <file>` self-check while other executors were mid-build; the orchestrator ran the full
  `tsc` after the tree settled. Rationale: parallelism cut wall-clock without risking concurrent-tsc/tree
  races, since the authoritative gate is always the orchestrator's serial re-run.
- **Effort→model:** low/medium tasks → sonnet; high tasks (mock-service, LiveCapClient, target-monitor,
  detector, provider, server, money-shot E2E) → opus. All 32 gates re-verified by Opus regardless.
- **Plan bug found + fixed (1 retry total):** chain-decode JSON imports needed `with { type: 'json' }` under
  NodeNext — caught by the orchestrator's periodic full `tsc` (vitest/esbuild masked it). Routed to the
  architect seat: plan fixed, manifest re-validated (statuses preserved), `chain-decode:1` re-dispatched.
- **human_gate handling:** `live-artifacts:4` (live smoke) built + type-checked by a normal executor, its
  live execution recorded as `human-pending` and routed to HUMAN_TODO.md; never run. Downstream depended
  only on the mock seam, so nothing blocked.
- **Result:** 31/32 done + 1 human-pending; full `tsc` clean; 58 tests passing; frontend builds; **money
  shot verified live** by driving `POST /api/kill` against the running demo server (killed target → DOWN
  citing refund tx `0xc6db…1fc6e`; healthy + declining targets unaffected).

## Phase 3 — reports

- Wrote [docs/reports/2026-07-05-autonomous-run-report.md](../reports/2026-07-05-autonomous-run-report.md)
  and [HUMAN_TODO.md](../../HUMAN_TODO.md). No live action taken; run stops here.
