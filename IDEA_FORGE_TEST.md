# Idea Forge — cold-session test record

This skill is authored, not coded — there is no vitest suite. Its real test is **how a cold session
behaves with it.** So each scenario below was run by a **fresh subagent** (fresh context = a different
session's thinking) given **only** `idea-forge/SKILL.md` + `references/ideation-rubric.md` +
`references/web3-seed-pack.md` and a filled-in scenario, instructed to read nothing else and run end
to end. The five inputs were pre-supplied (no human to answer prompts). The briefs below are the
**actual, verbatim** output of those cold runs — this is how you judge the skill across sessions.

> **Note (post-adaptation):** these transcripts predate the Claude-Code-native adaptation, so their
> architect hand-off blocks still show the old external-pool `EXECUTION TARGET` ("stateless
> multi-account pool … do NOT offer same-session execution"). They are kept verbatim as a historical
> record; the **current** hand-off is native-default — see `prompts/INVOKE_ARCHITECT.md` and
> `idea-forge/SKILL.md` Step 4.

## Acceptance criteria (scored per run)

1. Elicits the five inputs before generating (pre-supplied in test; confirmed back).
2. Diverges to ≥20 varied candidates (not 3 safe ones) and runs the CoT bolder-pass.
3. Converges via the explicit weighted rubric with feasibility highest — not "which do you like?".
4. Ends in exactly one scoped brief with all required fields — never a list.
5. Emits the brief in the architect's expected input format and offers the hand-off.
6. Self-contained: a cold session with only the skill + scenario produces a valid brief.

---

## Scenario A — Web3 (your domain)

**Setup:** ETHGlobal-style Web3 hackathon · DeFi main track + "Best DeFi on L2" bounty · 36h, solo + AI
· Solidity/DeFi + TypeScript · `novel-wow`.

| # | Criterion | Result | Evidence |
|---|-----------|:------:|----------|
| 1 | Five inputs before generating | ✅ | "INPUTS CONFIRMED" line echoed all five before any candidate. |
| 2 | ≥20 varied + bolder-pass | ✅ | **22** candidates across ~10 distinct seeds (KYA, sealed-bid markets, invariant guards, intents, stablecoin pay, hooks, options…); a labelled **BOLDER-PASS** rewrote **8** generic ones before→after (e.g. yield dashboard → live "solvency X-ray" exploit scanner). |
| 3 | Rubric convergence, feasibility highest | ✅ | Feasibility-gate knockouts first, then a weighted table (Feas ×35 · WOW ×25 · Fit ×20 · Novelty ×20), then a top-3 scope pressure-test that **re-scored** #11 (4→3) on a hidden oracle/hook dep. No preference question. |
| 4 | Exactly one brief, all fields | ✅ | "AgentGate" brief with Problem / Solution / Must-have features / Track(s) / Why novel / Money shot / Out-of-scope. |
| 5 | Architect format + hand-off offer | ✅ | "Hand this to the architect?" + filled PROJECT / DOCS / CONSTRAINTS / EXECUTION TARGET block. |
| 6 | Self-contained | ✅ | Read only the 3 files; produced a valid brief + hand-off from the SKILL's embedded template. |

**Convergence behaved as designed:** the live perp funding-rate arb bot (novel, but its money shot
depends on live markets it can't control) was **knocked out as the rubric's "novel-but-un-demoable"
trap**, and the winner was the *demoable-bold* KYA vault — the rubric's worked-example archetype.

### Actual final brief (verbatim)

> **Title:** AgentGate — a Know-Your-Agent–gated DeFi lending vault on an L2.
>
> - **Problem:** Autonomous trading/borrowing agents are flooding DeFi, but lending vaults can't tell
>   a credentialed, accountable agent from an anonymous drain-and-run bot — so they either
>   over-collateralize everyone or get exploited. There's no on-chain "Know-Your-Agent" gate that lets
>   a vault lend to *verified* agents only.
> - **Solution (one line):** A lending vault on an L2 that lets only agents holding a valid on-chain
>   Know-Your-Agent (KYA) credential borrow, gating access at the contract level.
> - **Must-have demo features (2–3):** (1) A **KYA registry** contract that issues/holds an agent
>   credential (self-issued EIP-712 attestation → on-chain registry; no external KYC service). (2) A
>   **lending vault** that checks the borrower's KYA credential on `borrow()` and reverts for the
>   uncredentialed. (3) A **TypeScript demo harness** driving two bots — one credentialed, one not —
>   against the live testnet/L2.
> - **Target sponsor track(s):** DeFi main track + "Best DeFi on L2" sponsor bounty (deploy the vault
>   + registry on the L2).
> - **Why it's novel:** It operationalizes a16z's "Know-Your-Agent" thesis as an *enforced borrowing
>   gate* — credentialing as a DeFi access-control primitive, not a dashboard or a wrapper. Fresh
>   angle, not a me-too vault.
> - **Demo money shot (~15 s):** An **unverified** bot calls `borrow()` and is rejected on screen; a
>   **KYA-credentialed** bot calls the same function and the loan executes — rejection → approval,
>   live, in one continuous take.
> - **Out of scope (explicit):** No ZK/FHE or confidential balances; no real third-party KYC/identity
>   provider or sponsor API; no cross-chain/bridge; no price oracle or liquidation engine (fixed-ratio
>   collateral on a testnet); no yield strategy, no rebalancing, no front-end beyond what's needed to
>   show the two-bot money shot; no mainnet funds.

### Actual architect hand-off (verbatim)

```
You are the ARCHITECT for this build. Load and follow architect/SKILL.md (and its references/).
Do not write product code. Your only deliverables are: an approved spec, executor-ready plan
documents, and docs/superpowers/manifest.json.

PROJECT: A lending vault on an L2 that lets only agents holding a valid on-chain Know-Your-Agent (KYA) credential borrow, gating access at the contract level.

DOCS: docs/idea-forge/2026-06-01-agentgate-kya-vault-brief.md, https://ethglobal.com/events

CONSTRAINTS: EVM L2 (deploy registry + vault on the target L2 for the "Best DeFi on L2" bounty), Solidity (latest stable, e.g. ^0.8.x) + TypeScript (Node LTS) for the demo harness, hard deadline 36 hours from kickoff (solo + AI), team = solo + AI. Target track(s): DeFi main track + "Best DeFi on L2" sponsor bounty. Must land the demo money shot within the time-box: an uncredentialed bot's borrow() is rejected and a KYA-credentialed bot's borrow() succeeds, live on screen. Out of scope: no ZK/FHE or confidential balances; no third-party KYC/identity provider or sponsor API; no cross-chain/bridge; no price oracle or liquidation engine (fixed-ratio collateral on testnet); no yield/rebalancing; no front-end beyond the two-bot demo; no mainnet funds.

EXECUTION TARGET: a stateless, multi-account agent pool coordinated by a separate orchestrator. Every
task must be self-contained per references/task-contract.md — paste upstream signatures into each
task, declare Provides/Requires, and give exactly one gate command per task. Do NOT offer
same-session subagent execution; stop at the reviewed manifest.
```

**Scenario A: 6/6 PASS.**

---

## Scenario B — off-domain control (general AI hackathon)

**Setup:** "AI Builders Weekend" (general AI, **no Web3**) · Best use of LLMs + Best developer tool ·
24h, solo + AI · Python + TS/React full-stack, LLM APIs · `safe-feasible`. Purpose: confirm the skill
isn't secretly Web3-only and that the rubric adapts.

| # | Criterion | Result | Evidence |
|---|-----------|:------:|----------|
| 1 | Five inputs before generating | ✅ | "INPUTS CONFIRMED" echoed all five. |
| 2 | ≥20 varied + bolder-pass | ✅ | **Did NOT use the web3 pack** — built an **AI-domain** seed list (agents, RAG, structured-output, evals, prompt-mgmt, codegen, multimodal, cost-routing, observability…) and crossed it the same way. **22** candidates; **8** bolder-pass rewrites before→after. |
| 3 | Rubric convergence, feasibility highest | ✅ | **Adapted** the axes to the event's published criteria (Usefulness/Technical/Creativity/Demo) while **keeping feasibility the highest weight**; applied the `safe-feasible` ±5 nudge; 17-row weighted table; top-3 pressure-test re-scored #1 (4→3) on hidden GitHub-CI dependency. No preference question. |
| 4 | Exactly one brief, all fields | ✅ | "TypeSafe LLM" brief with all seven fields. |
| 5 | Architect format + hand-off offer | ✅ | "Hand this to the architect?" + filled PROJECT / DOCS / CONSTRAINTS / EXECUTION TARGET. |
| 6 | Self-contained | ✅ | Read only the 3 files; valid brief + hand-off. |

**The control worked:** the skill adapted out of Web3 cleanly (the seed pack correctly deferred to
event-derived seeds for a non-Web3 event), the rubric re-mapped to the event's criteria, and
feasibility-first still fired — the flashier Prompt-CI tool lost because its money shot depended on
external GitHub CI plumbing, while the self-healing client (one interface, runs on local fixtures) won.

### Actual final brief (verbatim)

> **Title:** TypeSafe LLM — a self-healing typed client for LLM JSON output
>
> - **Problem:** Developers building on LLM APIs constantly get JSON that *almost* matches their
>   schema — a missing field, a stringified number, an extra key — and it crashes parsers in
>   production at random. The usual fix is brittle hand-rolled retry/try-catch glue around every call,
>   which is tedious to write and silently fragile.
> - **Solution (one line):** A drop-in TypeScript/Python client that takes your Zod/Pydantic schema,
>   and on any validation failure automatically re-asks and repairs the model's output until it
>   conforms — showing the repair steps as a visible trace.
> - **Must-have demo features (2–3):** 1. Schema-bound call: pass a schema, get back fully-typed,
>   validated data (or a clean typed error after N attempts). 2. Auto-repair loop: on a validation
>   miss, it feeds the validator's error back to the model and re-asks until valid (bounded retries).
>   3. Repair trace UI: a live panel showing each attempt and what was fixed ("missing `total` →
>   re-asked → filled"), as a before→after diff.
> - **Target sponsor track(s):** Best developer tool (primary) · Best use of LLMs (secondary).
> - **Why it's novel:** Most "structured output" tools either hard-fail or silently retry. The
>   defensible angle is the **visible repair trace** — it turns an invisible reliability trick into a
>   watchable, debuggable moment, and exposes *why* the model failed and how it was corrected, not
>   just a pass/fail.
> - **Demo money shot (~15s):** A deliberately malformed model reply hits the screen as red/invalid;
>   one beat later the repair panel animates the fix ("missing field `total` → re-asked → filled"),
>   and the output flips to a green, fully-typed object — the broken reply visibly heals itself.
> - **Out of scope (explicit):** No streaming/token-level repair; no multi-provider abstraction (one
>   LLM provider only); no auth, accounts, billing, or persistence; no published npm/PyPI package or
>   marketplace; no eval suite or benchmarking; demo runs on local fixtures with a single scripted
>   malformed case — not arbitrary production traffic.

### Actual architect hand-off (verbatim)

```
You are the ARCHITECT for this build. Load and follow architect/SKILL.md (and its references/).
Do not write product code. Your only deliverables are: an approved spec, executor-ready plan
documents, and docs/superpowers/manifest.json.

PROJECT: A drop-in typed LLM client that takes a Zod/Pydantic schema and auto-repairs malformed model JSON until it validates, showing the repair steps as a visible trace.

DOCS: docs/idea-forge/2026-06-01-typesafe-llm-self-healing-client-brief.md, <AI Builders Weekend event page URL>

CONSTRAINTS: web app (no chain/Web3), TypeScript/React + Node full-stack with Python/Pydantic parity for the client, LLM via a single provider API (key as env var only), hard deadline AI Builders Weekend end — 2026-06-02 (24h from kickoff), team = solo + AI. Target track(s): Best developer tool (primary), Best use of LLMs (secondary). Must land the demo money shot within the time-box: a malformed model reply visibly self-heals into a green, fully-typed object via the repair-trace panel. Out of scope: no streaming/token-level repair; no multi-provider abstraction; no auth/accounts/billing/persistence; no published npm/PyPI package or marketplace; no eval/benchmark suite; demo runs on local fixtures with one scripted malformed case.

EXECUTION TARGET: a stateless, multi-account agent pool coordinated by a separate orchestrator. Every task must be self-contained per references/task-contract.md — paste upstream signatures into each task, declare Provides/Requires, and give exactly one gate command per task. Do NOT offer same-session subagent execution; stop at the reviewed manifest.
```

**Scenario B: 6/6 PASS.**

---

## Verdict

Both cold runs passed all six acceptance criteria. Diversity was strong in both (≥20 varied
candidates across many distinct seeds, plus a meaningful bolder-pass), so **the optional persona-trio
and Verbalized-Sampling diversity boosters were NOT needed** — the evidence-backed minimum
(forced-quantity + CoT bolder-pass + external feasibility-first rubric) is sufficient, and the SKILL.md
was left lean. Most importantly, the feasibility-first rubric demonstrably did its job in both domains:
it selected the *demoable-bold* idea and rejected the *novel-but-un-shippable* one — the exact
Ideation–Execution-Gap correction the skill is built around.

### Notes / where it leans on model judgment
- **Rubric adaptation is a judgment call.** Scenario B re-mapped the axes to the event's published
  criteria well, but a weaker model could mis-map; the "feasibility stays highest (floor 30)" rule is
  the guardrail that keeps a bad mapping from going off the rails.
- **The feasibility gate is intentionally aggressive.** In Scenario A it pruned several bold ideas. By
  design (feasibility-first), but worth watching that it doesn't knock out a genuinely winnable bold
  swing; both runs still landed on bold-and-shippable winners, so the balance held.
- In real pipeline use the skill writes the brief to `docs/idea-forge/<date>-<slug>-brief.md` before
  emitting the hand-off (the cold runs were told not to write files), so the hand-off's `DOCS:` path
  resolves for the architect.

---

# Prior-art differentiation (Scenarios C & D)

Added with the optional **prior-art / white-space** feature. Two further cold runs, same method as A/B
(a fresh subagent given **only** `idea-forge/SKILL.md` + `references/ideation-rubric.md` +
`references/web3-seed-pack.md` + a filled scenario, told to read nothing else and write no files).
Both ran the **same** Sui-ecosystem base scenario — DeFi (DeepBook) + Storage (Walrus) + open · 36h
solo + AI · Move + TypeScript/React · `novel-wow` — to isolate the one variable: **prior art present
vs absent.** These test that the prior-art step enters *only* at convergence (never anchors
divergence), penalizes duplicates on the Novelty axis without touching the weights, steers to a
white-space winner, and skips cleanly when no prior art exists.

## Scenario C — WITH prior art

**Prior art supplied (3 items):** *SuiSnap* (past winner — Walrus NFT-media store + on-chain pointers +
gallery) · *DeepRoute* (shipped — DeepBook DEX aggregator routing limit orders for best execution) ·
*SuiPerp* (sponsor showcase — on-chain perps fed by an off-chain oracle).

| # | Criterion | Result | Evidence |
|---|-----------|:------:|----------|
| 1 | Five inputs before generating | ✅ | "INPUTS CONFIRMED" echoed all six; prior art noted "consulted at Step 3 only". |
| 2 | ≥20 varied + bolder-pass | ✅ | **23** candidates across ~10 seeds; **8** bolder-pass before→after rewrites. |
| 3 | Rubric convergence, feasibility highest | ✅ | Feasibility-gate knockouts → white-space check → weighted table (Feas ×35 · WOW ×25 · Fit ×20 · Novelty ×20) → top-3 pressure-test. **Weights unchanged.** |
| 4 | Exactly one brief, all fields | ✅ | "Verifiable trade rationale on Walrus" brief, 7 fields, no placeholders. |
| 5 | Architect format + hand-off | ✅ | "Hand this to the architect?" + filled PROJECT / DOCS / CONSTRAINTS / EXECUTION TARGET. |
| 6 | Self-contained | ✅ | Read only the 3 files. |
| **7** | **Divergence anchor-free of prior art** | ✅ | Self-report + visible Step 2: candidates generated from seeds × tracks × skills with **no reference** to SuiSnap/DeepRoute/SuiPerp; prior art entered only at Step 3. |
| **8** | **Duplicate/incremental knocked down on Novelty** | ✅ | #18 (dynamic-NFT Walrus store) = **DUPLICATE of SuiSnap → Novelty 1**; #9/#19/#15/#7 + core of #1 = **INCREMENTAL vs DeepRoute → Novelty 2**. |
| **9** | **White-space winner; feasibility still rules** | ✅ | Winner #21 is a white-space angle (Walrus as agent-reasoning provenance, not media). Bolder-but-less-feasible white-space picks (#3 KYA-MM, #12 escrow) ranked **lower** — differentiation informed Novelty, never overrode the feasibility gate. |
| **10** | **"Why it's novel" names the gap** | ✅ | Names all three: "unlike SuiSnap… unlike DeepRoute… unlike SuiPerp…". |

**Verbatim — white-space classification (Step 3, after the feasibility gate):**

> The three prior-art items: **SuiSnap** (Walrus NFT-media store + on-chain pointers + gallery),
> **DeepRoute** (DeepBook DEX aggregator routing limit orders for best execution), **SuiPerp** (on-chain
> perps with off-chain oracle). Classifying survivors as duplicate / incremental / white-space — a
> differentiation call, steering to the unoccupied angle, not a nicer clone:
>
> - **#18 dynamic-NFT Walrus store** → **DUPLICATE of SuiSnap** (Walrus media + on-chain pointers is
>   exactly SuiSnap). Novelty LOW (1).
> - **#9 / #19 / #15 DeepBook routing/execution** → **INCREMENTAL vs DeepRoute** (#9 intent router and
>   #19 arb watcher and #15 TWAP are all "route/execute across DeepBook pools" — marginally-different
>   best-execution clones). Novelty LOW (2).
> - **#7 auto-rebalancing index / "self-defending index"** → **INCREMENTAL vs DeepRoute** (uses DeepBook
>   routing as its engine; rebalancing is a thin wrapper over the same best-execution idea). Novelty
>   LOW-MID (2).
> - **#1 copy-trading / verifiable copy-trade** → leans on DeepRoute-style order replication; the
>   Walrus-audited-track-record twist is a real wedge but the core mirroring is **INCREMENTAL** (2-3).
> - **#2 proof-of-research / #21 verifiable trade rationale on Walrus** → **WHITE-SPACE.** Prior art uses
>   Walrus for *media blobs* (SuiSnap); using it as a *tamper-evident provenance/attestation layer for
>   agent reasoning bound to on-chain orders* is an unoccupied angle. Novelty HIGH (5).
> - **#3 KYA-gated MM / #12 agent escrow / #5 agent-metered API** → **WHITE-SPACE** (none of the three
>   prior-art items touch agent credentials/payments/trust). Novelty HIGH (5).
> - **#16 "Solvency tripwire" / #13 "kill-switch escrow" / #20 "stake-slashed stream" / #6 Walrus
>   order-history / #10 game replays / #22 badges / #17 staked-media** → **WHITE-SPACE** vs all three (no
>   overlap with NFT-media, routing, or perps). Novelty MID-HIGH (4-5).

**Verbatim — final brief:**

> **Verifiable trade rationale — Walrus-stored, on-chain-committed agent reasoning for DeepBook orders**
>
> - **Problem:** On-chain trading agents are black boxes — when an autonomous agent posts an order, no
>   one can verify *why*, and any rationale it logs off-chain can be silently rewritten after the fact.
>   Traders following or auditing an agent have no tamper-evident link between a decision and the trade
>   it produced.
> - **Solution:** A Sui agent that, for every DeepBook order it places, writes its decision rationale to
>   Walrus and commits that blob's hash on-chain *in the same transaction as the order* — making each
>   trade's reasoning permanently auditable and tamper-evident.
> - **Must-have demo features:** (1) an agent that posts a real limit order to a DeepBook testnet pool
>   and atomically records `{order_id, walrus_blob_id, rationale_hash}` on-chain; (2) a React panel that
>   lists fills and, on click, fetches the rationale from Walrus and recomputes the hash against the
>   on-chain commit (green = intact); (3) a tamper demo — edit/replace the blob and show the
>   verification flip to red.
> - **Target sponsor track(s):** DeFi (DeepBook) + Storage (Walrus) — dual-track; open as fallback.
> - **Why it's novel:** Unlike **SuiSnap** (which uses Walrus to store *NFT media*), this uses Walrus as
>   a *provenance layer for agent decision-making* bound to live orders; unlike **DeepRoute**
>   (best-execution *routing* across DeepBook pools), the value is *verifiable accountability* of each
>   order, not routing; and unlike **SuiPerp** (leveraged trading on an *opaque off-chain oracle*), here
>   the off-chain reasoning is made *tamper-evident and on-chain-committed*. The white space is
>   "tamper-evident agent provenance for on-chain trades" — occupied by none of the three.
> - **Demo money shot:** Click a fill → its AI rationale loads from Walrus with a green "verified" check
>   → tamper the stored blob → the same check snaps to red. ~15 seconds, value of the idea visible in one
>   motion.
> - **Out of scope (explicit):** No real funds / mainnet / real liquidity (testnet fixture pool only); no
>   price oracle; no model training (rationale comes from a scripted/LLM call, not a trained model); no
>   multi-pool routing or aggregation; no key management beyond a single demo agent keypair (referenced
>   by env-var name only); no production indexer.

**Verbatim — architect hand-off:**

```
You are the ARCHITECT for this build. Load and follow architect/SKILL.md (and its references/).
Do not write product code. Your only deliverables are: an approved spec, executor-ready plan
documents, and docs/superpowers/manifest.json.

PROJECT: A Sui agent that, for every DeepBook order, writes its decision rationale to Walrus and commits the blob's hash on-chain in the same transaction — making each trade tamper-evident and auditable.

DOCS: docs/idea-forge/2026-06-01-walrus-verifiable-trade-rationale-brief.md, https://sui.io/overflow

CONSTRAINTS: Sui (Move smart contracts) + Walrus + DeepBook; TypeScript/React front end and agent script (versions per the builder's stack); hard deadline = Sui Overflow 2026 submission close (absolute date/time per https://sui.io/overflow), team = solo + AI. Target track(s): DeFi (DeepBook) + Storage (Walrus). Must land the demo money shot within the 36-hour time-box: click a fill → rationale loads from Walrus with a green verified check → tamper the blob → check flips red. Out of scope: real funds/mainnet/real liquidity (testnet fixture pool only), price oracle, model training, multi-pool routing/aggregation, key management beyond a single demo agent keypair (env-var name only), production indexer.

EXECUTION TARGET: a stateless, multi-account agent pool coordinated by a separate orchestrator. Every
task must be self-contained per references/task-contract.md — paste upstream signatures into each
task, declare Provides/Requires, and give exactly one gate command per task. Do NOT offer
same-session subagent execution; stop at the reviewed manifest.
```

**Scenario C: PASS (10/10).** Prior art entered only at convergence, a genuine duplicate (#18) and
incremental clones (#9/#19/#15/#7) were demoted on the Novelty axis with the weights untouched, and the
feasibility-first rubric still selected a demoable **white-space** winner over bolder-but-fragile picks.

---

## Scenario D — WITHOUT prior art (control)

**Prior art:** none provided. Purpose: confirm the step skips cleanly — no stall, no fabricated competitors.

| # | Criterion | Result | Evidence |
|---|-----------|:------:|----------|
| 1 | Five inputs before generating | ✅ | "INPUTS CONFIRMED" echoed the five; prior art noted absent. |
| 2 | ≥20 varied + bolder-pass | ✅ | **22** candidates; **8** bolder-pass before→after rewrites. |
| 3 | Rubric convergence, feasibility highest | ✅ | Gate knockouts → weighted table (weights unchanged) → top-3 pressure-test. |
| 4 | Exactly one brief, all fields | ✅ | "KYA-gated DeepBook vault" brief, 7 fields. |
| 5 | Architect format + hand-off | ✅ | Filled PROJECT / DOCS / CONSTRAINTS / EXECUTION TARGET. |
| 6 | Self-contained | ✅ | Read only the 3 files. |
| **7** | **White-space step skipped cleanly + exact line** | ✅ | Stated verbatim "no prior art available — scoring Novelty on first principles," then proceeded; classification skipped on the "if prior art was provided or found" condition. |
| **8** | **No invented / searched competitors** | ✅ | Self-report: zero competitors invented or searched; Novelty scored on first principles only. |
| **9** | **Still one brief, no stall** | ✅ | One committed winner, all 7 fields; "Why it's novel" is a first-principles claim. |

**Verbatim — no-prior-art handling (Step 3):**

> **White-space step with NO prior art** — the skill's instruction for this path (Step 3, "If no prior
> art"). I state exactly the line it tells me to state:
>
> > **"no prior art available — scoring Novelty on first principles"**
>
> and proceed — no stall, no invented competitors. (The white-space classification —
> duplicate/incremental/white-space against prior art — is skipped cleanly because it only runs "if
> prior art was provided or found.")

**Verbatim — final brief:**

> **KYA-gated DeepBook vault**
>
> - **Problem:** Autonomous trading agents are moving real capital on-chain, but a DeFi venue has no way
>   to tell an accountable, authorized agent from an anonymous bot. Protocols either let any bot in (no
>   accountability) or gate humans only (agents locked out), so capital-allocating agents have no safe,
>   permissioned place to trade.
> - **Solution:** A Sui Move vault that routes trades to DeepBook but only accepts orders from agents
>   holding a valid Know-Your-Agent (KYA) credential object.
> - **Must-have demo features:** (1) a KYA credential object issued by an on-chain authority and attached
>   to an agent's address; (2) a Move vault gate that verifies the credential before forwarding an order
>   to a DeepBook pool; (3) a React panel running two agents — one uncredentialed, one credentialed —
>   against the same pool.
> - **Target sponsor track(s):** DeFi (DeepBook); secondary: open.
> - **Why it's novel** (first-principles, no prior art): From first principles: KYC authenticates
>   *people*, but autonomous agents are becoming the actual transactors on-chain, and there is no
>   on-chain primitive that authorizes *an agent* to trade firm capital at a DeFi venue. Putting agent
>   authorization on the order path itself — credential-gated DeepBook access enforced in Move, not
>   off-chain — is the missing accountability layer for agentic DeFi. (No prior art was available; this
>   is the first-principles claim, not a white-space-vs-competitor claim.)
> - **Demo money shot:** ~15 seconds, split screen: the uncredentialed bot fires a DeepBook order and is
>   **rejected on-chain**; the credentialed agent fires the same order and **fills** — reject and fill
>   landing side by side, live.
> - **Out of scope (explicit):** No real KYC/identity vendor (credential is self-issued by an on-chain
>   authority object); no real funds or mainnet (testnet + fixture liquidity only); no confidential
>   balances; no options/derivatives settlement; no revocation registry, reputation scoring, or
>   multi-pool routing; no indexer/oracle/off-chain worker.

**Verbatim — architect hand-off:**

```
You are the ARCHITECT for this build. Load and follow architect/SKILL.md (and its references/).
Do not write product code. Your only deliverables are: an approved spec, executor-ready plan
documents, and docs/superpowers/manifest.json.

PROJECT: A Sui Move vault that routes trades to DeepBook but only accepts orders from agents holding a valid Know-Your-Agent (KYA) credential object.

DOCS: docs/idea-forge/2026-06-01-kya-deepbook-vault-brief.md, https://sui.io/overflow

CONSTRAINTS: Sui (Move), TypeScript/React front-end (Sui TS SDK / dApp Kit), hard deadline
Sui Overflow 2026 submission close, team = solo + AI. Target track(s): DeFi (DeepBook), open. Must land the demo
money shot within the time-box (36 hours). Out of scope: no real KYC/identity vendor (credential self-issued by an on-chain authority object); no real funds or mainnet (testnet + fixture liquidity only); no confidential balances; no options/derivatives settlement; no revocation registry / reputation / multi-pool routing; no indexer/oracle/off-chain worker.

EXECUTION TARGET: a stateless, multi-account agent pool coordinated by a separate orchestrator. Every
task must be self-contained per references/task-contract.md — paste upstream signatures into each
task, declare Provides/Requires, and give exactly one gate command per task. Do NOT offer
same-session subagent execution; stop at the reviewed manifest.
```

**Scenario D: PASS (9/9).** The step gated itself off on the "if prior art was provided or found"
condition, emitted the exact first-principles line, invented nothing, and produced a valid one-brief
result.

---

## Verdict (prior-art feature)

Both runs passed. **Anchor-free divergence held in both** — C confirmed it explicitly (Step 2 never
referenced the three prior-art items; they entered only at Step 3); D had no prior art to anchor on.
With prior art, the white-space step demoted a genuine duplicate (and incremental clones) on the
**Novelty axis only**, and the feasibility-first rubric still selected a demoable white-space winner —
differentiation **sharpened** Novelty without overriding the feasibility gate or changing the weights
(Feas 35 · WOW 25 · Fit 20 · Novelty 20 throughout). Without prior art, the step skipped cleanly with
the prescribed line and fabricated nothing. The feature behaves as a conditional sub-step exactly as
designed: it sharpens Novelty when evidence exists and is invisible when it doesn't — no new phase, no
weight change, still one brief, still feasibility-first.

(Both runs also independently noted the real-run rule that the brief is written to
`docs/idea-forge/<date>-<slug>-brief.md` *before* the hand-off — consistent with the earlier hardening
edit.)

---

# Deadline-decoupling (Scenario E)

Added with the **feasibility-vs-deadline decoupling**: the top axis was reframed from
"Feasibility-to-ship (within the time-box)" to **intrinsic buildability / demoability**, the
human-hours / deadline pricing was removed, and the **external-blocker gate was kept** (and weighted
highest). One cold run, same method as A–D (a fresh subagent given **only** `idea-forge/SKILL.md` +
`references/ideation-rubric.md` + `references/web3-seed-pack.md` + a filled scenario; read nothing
else; write no files; verbatim output).

**Setup:** ETHGlobal-style Web3 hackathon · DeFi (main) + Developer-tooling/infra + open · **TEAM /
BUILD CAPACITY = autonomous multi-agent pool + me, with NO deadline and NO hour budget given** ·
Solidity/DeFi + TypeScript/React · `novel-wow` · no prior art. Purpose: confirm the skill no longer
asks for or reasons about hours/a deadline, **still** knocks out external-blocker ideas, and **now**
keeps ambitious-but-buildable ones.

| # | Criterion | Result | Evidence |
|---|-----------|:------:|----------|
| 1 | Inputs confirmed; no deadline solicited | ✅ | "INPUTS CONFIRMED" noted no deadline/hour budget and an agent-pool builder; never asked for hours. |
| 2 | ≥20 varied + bolder-pass | ✅ | **22** candidates across ~20 distinct seeds; **8** bolder-pass before→after rewrites. |
| 3 | Converges on rubric, buildability highest (axis renamed) | ✅ | Used the new top axis verbatim — "Intrinsic buildability / demoability, weight 35" — weights 35·25·20·20 kept. |
| 4 | Exactly one demoable brief, all fields | ✅ | "KYA Bouncer-for-bots vault," 7 fields, on-screen reject→admit money shot. |
| 5 | Architect format + hand-off | ✅ | Filled block; hard-deadline left as the builder-fills placeholder, uninvented. |
| 6 | Self-contained | ✅ | Read only the 3 files. |
| **7** | **Never asked for / reasoned about hours or a deadline** | ✅ | Self-report (a): no hours/deadline solicited, assumed, or used at any step; feasibility decided only by the external-blocker test. |
| **8** | **Still knocks out a real external blocker** | ✅ | #7 live perp-arb bot dropped — money shot rides on a **live external market it can't control**; also #6 (live oracle + real liquidity), #15 (third-party solver fill data), #17 (verifiable-compute service). |
| **9** | **Now keeps an ambitious-but-buildable idea** | ✅ | #19 multi-agent DeFi treasury — "far more than a solo human would hand-type," **no external blocker** — was NOT dropped; it **tied for the top score (500)**. |
| **10** | **One brief, no menu; valid hand-off** | ✅ | Converged to one winner; ranked table used as intermediate and dropped at commit. |

**Verbatim — Step-A buildability-gate knockouts (external blockers called out):**

> - **#6 On-chain options AMM from scratch** — **EXTERNAL BLOCKER:** money shot ("price and settle
>   against a live feed") needs a live price/IV oracle the builder can't run **and** real liquidity to
>   price against — live external market conditions out of the builder's control.
> - **#7 Live perp funding-rate arbitrage bot** — **EXTERNAL BLOCKER (live external market):** the
>   entire money shot depends on the live funding-rate spread flipping on real venues — a live external
>   market condition the builder cannot control or schedule for a demo.
> - **#15 On-chain reputation oracle for solvers** — **EXTERNAL BLOCKER:** "fill quality" requires a
>   live stream of real solver fills from external solver networks the builder doesn't operate. (Internal
>   effort isn't the issue — the external data feed is.)
> - **#17 Verifiable AI on-chain research workflow** — **EXTERNAL BLOCKER:** the "verifiable compute
>   attestation" needs a SNARK proving service / verifiable-compute infrastructure the builder can't
>   stand up or run end-to-end for a live re-verify.
> - (#8 confidential-balance vault and #9 sealed-bid prediction market also dropped at the gate — both
>   depend on an FHE / production-ZK privacy layer not demoable on a plain testnet.)
>
> Note: **#19 (multi-agent DeFi treasury)** is a *lot* to build but has **no external blocker** — all
> three agents and the policy contract run on a testnet the builder controls. Per the gate, "it's a lot
> to build" is **not** a knockout (the agent pool builds fast). It **survives** to scoring.

**Verbatim — no-prior-art line + the (renamed) top axis:**

> "no prior art available — scoring Novelty on first principles"
>
> … **Top axis = Intrinsic buildability / demoability, weight 35** · Demo WOW + story 25 · Theme +
> sponsor-track fit 20 · Novelty 20. (novel-wow nudge applied within the ±5 band, buildability kept
> highest at 35.)

**Verbatim — final brief:**

> **KYA "Bouncer for bots" lending vault**
>
> - **Problem** — DeFi vaults are increasingly used by autonomous agents/bots, but a naive vault can't
>   tell a trustworthy agent from a malicious one, so it either lends to anything (drainable) or to
>   nothing (useless). Protocols have no on-chain way to admit only credentialed agents.
> - **Solution** — A lending vault that lends only to autonomous agents holding a valid Know-Your-Agent
>   (KYA) credential, verified on-chain at borrow time.
> - **Must-have demo features** — 1. A KYA credential issuer/registry contract (the builder's own) that
>   mints a verifiable agent credential. 2. A lending vault that checks the borrower's KYA credential
>   on-chain and admits or rejects accordingly. 3. Two live agents — one unverified, one verified —
>   driving the borrow path on screen.
> - **Target sponsor track(s)** — DeFi (main); Developer tooling/infra (the KYA credential primitive is
>   reusable infra).
> - **Why it's novel** — *No prior art available — novelty scored on first principles.* The defensible
>   angle: it fuses the a16z "Know-Your-Agent" credential primitive directly into the borrow path of a
>   DeFi vault, so agent identity is enforced at the point of money movement rather than bolted on as
>   off-chain gating — a credential-gated *lending* action, not just a credentialed identity.
> - **Demo money shot** — The ~15-second moment: an **unverified** bot calls `borrow` and is **rejected
>   on-screen**; a **verified** agent calls `borrow` and the funds move — reject→admit, live, on one
>   screen.
> - **Out of scope (explicit)** — No interest-rate model/curve tuning, no liquidations engine, no
>   real-asset or mainnet liquidity, no third-party KYC integration (credentials are minted by our own
>   issuer for the demo), no front-end polish beyond what's needed to show the reject→admit beat, no
>   multi-collateral support.

**Verbatim — architect hand-off (note the hard-deadline placeholder, left uninvented):**

```
You are the ARCHITECT for this build. Load and follow architect/SKILL.md (and its references/).
Do not write product code. Your only deliverables are: an approved spec, executor-ready plan
documents, and docs/superpowers/manifest.json.

PROJECT: A lending vault that lends only to autonomous agents holding a valid Know-Your-Agent (KYA) credential, verified on-chain at borrow time.

DOCS: docs/idea-forge/2026-06-01-kya-bouncer-vault-brief.md, https://ethglobal.com/events

CONSTRAINTS: EVM testnet (Solidity), Solidity + TypeScript/React (versions per the skill set), hard deadline <hackathon end — absolute date/time; builder fills this in, idea-forge did NOT gate on it>, team = solo + AI. Target track(s): DeFi (main), Developer tooling/infra. Must land the demo money shot. Out of scope: interest-rate model tuning, liquidations engine, real-asset/mainnet liquidity, third-party KYC integration, front-end polish beyond the reject→admit beat, multi-collateral.

EXECUTION TARGET: a stateless, multi-account agent pool coordinated by a separate orchestrator. Every
task must be self-contained per references/task-contract.md — paste upstream signatures into each
task, declare Provides/Requires, and give exactly one gate command per task. Do NOT offer
same-session subagent execution; stop at the reviewed manifest.
```

**Verbatim — self-report:**

> **(a) Did you anywhere ask for, assume, or reason about a number of hours or a deadline to decide
> what's feasible?** — **NO.** No deadline or hour budget was requested, assumed, or used at any step.
> Feasibility was decided purely by the buildability gate's test — *external blockers the builder can't
> control* — never by counting hours or fitting a calendar. … The only place a deadline appears is the
> architect kickoff's `hard deadline <…builder fills this in, idea-forge did NOT gate on it>`
> placeholder, left uninvented.
>
> **(b)** … **#7 Live perp funding-rate arbitrage bot** — blocker: its money shot rides on the **live
> external funding-rate spread on real perp venues**, a live external market condition the builder
> cannot control or schedule for a demo. … Intrinsic buildability still gates.
>
> **(c)** … **#19 — the multi-agent DeFi treasury** … It is far more than a solo human would hand-type
> in a typical hackathon window, yet it has **no external blocker** … It was **not** dropped — it tied
> for the **top score (500)**. This proves the old human-velocity/deadline gate is gone: it survived
> purely because effort-to-build is the agent pool's problem, not a knockout.
>
> **(d)** — **YES.** The run converged to exactly one committed winner … a single seven-field brief
> whose money shot is intrinsically demoable … and emitted one filled architect kickoff block. … the
> deliverable is one brief, not a menu.

**Scenario E: PASS (10/10).** The deadline/human-velocity gate is gone — no hours or deadline were
solicited or used, and an ambitious multi-component idea (#19) that a solo human couldn't hand-type
reached the *top* of the table instead of being trimmed. The **intrinsic-buildability gate is intact**
— four ideas were knocked out for external blockers (live markets, third-party data, un-runnable
services), exactly the demoability trap the gate exists to catch. The run used the renamed top axis,
skipped the white-space step cleanly with the prescribed first-principles line (no prior art), left the
architect's deadline as a builder-filled placeholder, and committed to one demoable brief. Decoupling
achieved without reopening the un-buildable-idea hole.

---

# Judge head-to-head (Scenarios F & G)

Added with the **judge's-eye head-to-head**, layered *on top of* the white-space pass (both run, in
order: white-space → head-to-head; head-to-head runs only if prior art is present). Goal: not just
*different* but *winning* — for the top candidates, simulate a judge scoring them against the strongest
prior-art on the **event's real criteria**, with a per-criterion win/tie/lose + a demonstrable reason;
evidence-bound, no grandiosity; only among buildable candidates; if the best can only tie, keep looking.
Two cold runs, same method/base scenario as A–E (only the 3 files; no writes; verbatim) — Sui Overflow
2026, demo-first published criteria (Technical execution · Working demo/completeness · Innovation ·
Usefulness), DeepBook + Walrus + open, agent-pool build capacity, `novel-wow`. Prior art is the only
variable.

## Scenario F — WITH prior art

**Prior art supplied (chosen so the head-to-head has teeth):** *WalChat* (past winner — fully on-chain
chat, deep genuine Walrus, polished live demo) · *DeepBook Terminal* (shipped — pro DeepBook terminal,
real live on-chain orders; **the demo bar to beat**) · *SuiVote* (showcase — clean UI but mostly mocked
/ off-chain tally; thin on-chain usage).

| # | Criterion | Result | Evidence |
|---|-----------|:------:|----------|
| 1 | Inputs confirmed (prior art Step-3 only) | ✅ | "INPUTS CONFIRMED" noted prior art present, consulted at Step 3 only. |
| 2 | ≥20 varied + bolder-pass | ✅ | **22** candidates + **8** bolder rewrites. |
| 3 | Buildability-first convergence | ✅ | Gate knockouts (external blockers) → white-space → head-to-head → weighted table → pressure-test. |
| 4 | Exactly one brief, all fields | ✅ | "Sealed-bid order book on DeepBook," 7 fields. |
| 5 | Architect format + hand-off | ✅ | Filled block; deadline left as builder placeholder. |
| 6 | Self-contained | ✅ | Read only the 3 files. |
| **7** | **Divergence anchor-free** | ✅ | Prior-art names first appear in Step 3(b); Step 2 generated from seeds × tracks × skills. |
| **8** | **White-space THEN head-to-head, on the event's real criteria** | ✅ | 3(b) white-space classify → 3(c) head-to-head on Technical execution / Working demo / Innovation / Usefulness, per-criterion win/tie/lose + reason. |
| **9** | **Unique-but-loses candidate knocked down** | ✅ | #9 Invariant guard (HIGH novelty, white-space) took a **clear loss on Working-demo** (money shot is an invisible revert vs Terminal's live fills) → Demo/WOW cut 5→3, dropped to 430. |
| **10** | **"Why it wins" names gap + evidence-bound edge** | ✅ | Field titled "Why it wins"; names the white-space intersection AND the Technical-execution/Innovation win vs DeepBook Terminal. |
| **11** | **No grandiosity** | ✅ | Conceded an honest **tie** on Working-demo rather than overclaim; concrete edges on real axes; no "10×", no unbacked dominance. |

**Verbatim — judge head-to-head, winner #2 (vs DeepBook Terminal / WalChat):**

> | Criterion | Verdict | Demonstrable reason |
> |---|---|---|
> | Technical execution | **win** | Encrypted-blob-on-Walrus + on-chain commit-reveal + atomic DeepBook match is deeper than Terminal's order placement and WalChat's blob-pointer storage — it *uses both stacks for one mechanism*. |
> | Working demo / completeness | **tie** | Both #2 and DeepBook Terminal show real live on-chain DeepBook txs; neither is mocked. Honest tie, not a win. |
> | Innovation | **win** | Anti-pick-off sealed order book is an unoccupied angle; Terminal is a UI over plain DeepBook, WalChat is chat. |
> | Usefulness | **win** | Directly kills resting-order MEV for real traders — a live DeFi pain; broader than a single chat or a viewing terminal. |

**Verbatim — judge head-to-head, the knocked-down unique candidate #9 Invariant guard (vs DeepBook Terminal):**

> | Technical execution | **win** | Machine-checked Move invariants are technically deep. |
> | Working demo / completeness | **lose** | Money shot is a *revert* — a tx that does nothing visible. Against Terminal's slick live fills this reads as "nothing happened." Weaker demo. |
> | Innovation | **win** | Formal-verification angle is fresh. |
> | Usefulness | **win** | Exploit prevention is valuable. |
> | → a **clear loss on Working demo/completeness** vs the strongest prior art. Knocked DOWN despite high Novelty. |

**Verbatim — how the head-to-head moved scores:**

> #9's Demo/WOW dropped 5→3 (its money shot is an invisible revert that *loses* to DeepBook Terminal's
> live fills), pulling it from a near-tie with #1 down to 430 — a white-space idea knocked down for
> losing the demo head-to-head. #2 and #1 held a true *tie* on Working demo (both real live on-chain,
> neither mocked) but each won Technical execution + Innovation … #2 edged #1 on Usefulness (all
> resting-order traders vs only agent borrowers → Fit 5 vs 4), giving #2 the top total.

**Verbatim — final brief:**

> **Sealed-bid order book that settles on DeepBook**
>
> - **Problem** — Resting limit orders on a public order book are visible, so bots pick them off
>   (MEV/front-running); traders who want to post real size on DeepBook leak their intent and get worse
>   fills.
> - **Solution** — A sealed-bid order book on Sui where each limit order's price and size are encrypted
>   (ciphertext stored on Walrus, commitment on-chain) and only decrypt to atomically match and settle
>   on DeepBook.
> - **Must-have demo features** — (1) Place an encrypted order: price/size go to a Walrus blob, an
>   on-chain commitment is recorded, nothing readable on-chain; (2) commit-reveal + atomic match that
>   settles the crossing orders on real testnet DeepBook; (3) a viewer showing the order is invisible
>   pre-match and revealed only on fill.
> - **Target sponsor track(s)** — DeFi (DeepBook) primary; Storage (Walrus) secondary.
> - **Why it wins** — Unlike **DeepBook Terminal** (a UI over plain, fully-visible DeepBook orders) and
>   unlike **WalChat** (Walrus as chat storage), this occupies the unclaimed intersection — Walrus as a
>   *sealed-order store* feeding *anti-MEV settlement on DeepBook*. Vs. the strongest prior art, DeepBook
>   Terminal, ours wins on **Technical execution** because a commit-reveal-over-Walrus matching engine
>   that settles atomically on DeepBook is a deeper on-chain mechanism than placing visible orders
>   through a UI, and on **Innovation** (sealed order flow is an unoccupied angle), while **matching it
>   on Working demo** (both are real live on-chain, neither mocked).
> - **Demo money shot** — Two orders that are completely invisible on-chain suddenly cross, reveal, and
>   settle as a real fill on testnet DeepBook — the ~15 seconds where hidden liquidity becomes a live
>   trade with no leak.
> - **Out of scope (explicit)** — No production key-management/MPC hardening (testnet commit-reveal
>   only); no matching engine beyond the single crossing pair needed for the money shot; no
>   portfolio/analytics UI; no mainnet, no real funds, no live-market price dependency.

**Verbatim — self-report on grandiosity (test point d):**

> Is the "we win" claim evidence-bound, no grandiosity / no "10x" / no unbacked dominance? — **Yes.** It
> names concrete edges on real published axes (Technical execution and Innovation) and explicitly
> concedes a *tie* on Working demo rather than overclaiming. … No "10x", no vague superiority, no
> unbacked dominance.

**Scenario F: PASS (11/11).** White-space ran first (Novelty), then a judge head-to-head on the event's
*real* criteria with per-criterion win/tie/lose + reasons. A genuinely unique idea (#9) was **knocked
down for losing the demo head-to-head** in favor of one (#2) with a demonstrable Technical-execution +
Innovation edge — and the winner **conceded a tie** on Working-demo instead of inflating it. The "Why
it wins" field names both the gap and the evidence-bound edge. Grandiosity avoided.

---

## Scenario G — WITHOUT prior art (control)

**Prior art:** none. Purpose: confirm **both** conditional steps (white-space *and* the new
head-to-head) skip cleanly under the reframed Step 3.

| # | Criterion | Result | Evidence |
|---|-----------|:------:|----------|
| 1 | Inputs confirmed; prior art absent | ✅ | "INPUTS CONFIRMED" noted prior art ABSENT (none searched/invented). |
| 2 | ≥20 varied + bolder-pass | ✅ | **22** candidates + **8** bolder rewrites. |
| 3 | Buildability-first convergence | ✅ | Gate knockouts → weighted table → pressure-test → winner. |
| 4 | One brief, all fields, first-principles novelty | ✅ | "KYA-gated DeepBook robo-fund," 7 fields; novelty field titled "Why it's novel." |
| **5** | **BOTH white-space AND head-to-head skipped cleanly** | ✅ | Quoted both skip instructions verbatim; neither step run. |
| **6** | **No fabricated competitors / "we beat them"** | ✅ | Self-report: zero competitors invented or searched; Novelty on first principles only. |

**Verbatim — both conditional steps skipped:**

> - **White-space step — SKIPPED.** … Stating it as told: **no prior art available — scoring Novelty on
>   first principles.**
> - **Judge's-eye head-to-head — SKIPPED.** The skill's exact instruction for this case … *"skip this
>   (as with white-space), score on first principles, and say so — no fabricated competitors, no invented
>   'we beat them' claims."* … no head-to-head is run.
> **Both conditional steps are confirmed skipped, cleanly.**

**Verbatim — "Why it's novel" (first-principles, no head-to-head):**

> *(first-principles novelty claim — no prior art was provided or found)* — It fuses agent identity
> (KYA) with a DeFi action *in a single transaction*: the right to move capital is bound to a
> cryptographic agent credential checked on-chain, rather than to a wallet address or an off-chain
> allowlist. The novel mechanism is "credential-as-permission for autonomous agents on DeepBook" —
> derived from first principles … not benchmarked against any existing project.

**Scenario G: PASS (6/6).** With no prior art, both prior-art-conditional sub-steps gated themselves off
on the "if prior art was provided or found" condition, the run scored Novelty on first principles, the
brief's field stayed "Why it's novel," and nothing was fabricated.

---

## Verdict (judge head-to-head feature)

Both runs passed. The head-to-head **layers on** the white-space pass without replacing it — F ran
white-space (Novelty) *then* the judge comparison; G skipped both cleanly. The decisive evidence is F's
**evidence-bound honesty under pressure**: it knocked down a genuinely white-space idea (#9) for *losing
the demo head-to-head*, and the winner **conceded an honest tie** on Working-demo rather than claim a
win it couldn't back — exactly the guard against grandiosity. No new rubric axis was added (the verdict
fed WOW + Novelty + Fit), buildability was never overridden (every scored candidate had cleared the
external-blocker gate), and no deadline/hour pricing re-entered. **Grandiosity was avoided in both runs**
— no "10×", no vague superiority, only concrete edges on the event's real criteria, with ties named as
ties. Unique ≠ winning is now enforced: idea-forge commits to a *winning* idea, not merely a different
one.
