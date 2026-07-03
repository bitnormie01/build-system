# Idea Forge Brief — Leash: an on-chain budget leash for autonomous DeepBook Predict agents

> Working title "Leash" is provisional — the builder may rename. This brief is the single source of
> truth handed to the architect (Step 1). It is a brief, not a spec: it fixes *what* and *why*, not *how*.

## Event + constraints

- **Date written:** 2026-06-01
- **Hackathon:** Sui Overflow 2026 (Mysten Labs) — global virtual hackathon, $500K+ prizes.
  - Handbook: https://mystenlabs.notion.site/overflow-2026-handbook
  - Tracks: https://overflow.sui.io/
- **Hard deadline (inert calendar fact — idea-forge does not gate on it; the architect/builder scopes
  to the calendar later):** **2026-06-21, end of day Pacific Time** (the handbook lists the date in PT
  without a clock time; treat as 23:59 PT). **Testnet deployment is accepted for judging** (mainnet
  only unlocks the second 50% of prize money, post-hackathon).
- **Team:** solo + AI build pipeline (architect → Codex executor pool → Claude reviewer).
- **Target tracks:** **DeepBook** (Specialized — the track's problem statement *is* DeepBook Predict) +
  **Agentic Web** (Core — Sub-track 2: "Autonomous Agent Wallet").
- **Risk posture:** novel-wow *within* DeFi strength; **minimal custom Move** (one capability/escrow
  module); TS SDK against already-deployed testnet primitives.
- **Published judging rubric (impact-first):** Real-World Application 50% · Product & UX 20% · Technical
  Implementation 20% · Presentation & Vision 10%. *"Meaningful products and ecosystem impact, not just
  technical demos."*

## Problem

AI trading agents are stuck at the **"approve wall"**: every on-chain action wants a human signature, so
teams either babysit the agent or hand it an **unbounded hot key** — one prompt-injection, hallucinated
tool call, or bug away from draining the account. There is no safe, *revocable* way to delegate
**bounded** trading authority to an autonomous agent on Sui. This blocks the entire "agents that
transact" thesis the Agentic Web track is built on.

## Solution (one line)

An on-chain **budget-and-scope "leash"** — a small Move capability/escrow object — that lets an AI agent
autonomously trade **DeepBook Predict** within owner-set limits ("≤ X dUSDC, Predict-only, expires 24h"),
**enforced on-chain, fully revocable, with every action logged on-chain.**

## Must-have demo features (the minimum that makes the money shot land)

1. **Budget-leash object (Move — the one custom on-chain surface):** custodies dUSDC and enforces
   cap + scope + expiry **atomically with each Predict trade** inside a single PTB; exposes owner
   `revoke`. This is the project's security-sensitive core and its longest pole.
2. **Autonomous agent (TypeScript):** runs a real Predict strategy end-to-end (e.g. range / binary
   positions against a `PredictManager` via `predict::mint` / `mint_range` / `redeem`), building each
   trade as a PTB that *must* pass through the leash. No human signature per trade.
3. **Live activity dashboard (React):** shows the agent's on-chain trades, remaining budget, scope/expiry,
   and a one-click **Revoke** — every action linkable to Sui Explorer.

## Target sponsor track(s)

- **DeepBook (Specialized — Predict):** satisfies the track minimum ("integrate Predict on testnet, work
  end-to-end") and shows real strategy behavior.
- **Agentic Web (Core — Sub-track 2: Autonomous Agent Wallet):** hits the must-haves nearly verbatim —
  *real DeepBook orders, self-enforced budget ceiling, on-chain activity log, owner-revocation demo* — and
  clears the bar "why Sui specifically makes the AI safer/more composable" (the authority is a Move object,
  not a payment rail bolted on).
- **Walrus (stretch, NOT core):** optionally mirror the activity log to Walrus/MemWal as a verifiable
  audit trail. Only if the two core tracks are fully landed — do not let a third track make the build
  shallow.

## Why it's novel (the one defensible angle)

Most "AI + DeFi" agents run off-chain with an unbounded key or bolt payments on at the end. **Leash makes
the *authority itself* a programmable, auditable, revocable on-chain object** — and points it at Sui's
vol-surface options market (DeepBook Predict), not a toy swap. Safe, bounded, composable agent authority is
the durable primitive (the "Know-Your-Agent" / agent-authority thesis), made real on Sui.

## Demo money shot (~15 seconds)

The agent **autonomously places a real Predict trade** — tx pops on Sui Explorer. It then attempts a trade
that **exceeds its cap, and the on-chain leash rejects it live** in front of the judge. The owner clicks
**Revoke**, and the agent's next action **fails on-chain**. Authority granted, bounded, and revoked —
provably, on-chain, in one breath.

## Out of scope (explicit — keeps the build focused on the money shot)

- **No mainnet deployment** for the demo (testnet only; mainnet redeploy is post-hackathon).
- **No bespoke DeFi Move** beyond the single leash module — use Predict / spot as-is.
- **No external-venue hedging** (Hyperliquid / Polymarket) — read-only price references at most.
- **No multi-agent coordination**, no custom oracle, no custom indexer (use `predict-server`).
- **Walrus / MemWal audit mirror is a stretch goal**, not required for the money shot.
- **zkLogin optional** — a Move policy/capability object already satisfies the Agentic track; don't block
  on zkLogin.

## Feasibility notes for the architect (primitives, not design)

- **DeepBook Predict is live on Sui testnet:** package `0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138`,
  Predict object `0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a`, public indexer/API
  `predict-server.testnet.mystenlabs.com`, quote asset **dUSDC** (request via the testnet-token form on
  **day 1** — the one external dependency).
- **Integration model:** use branch `predict-testnet-4-16` (not `main`); `@mysten/codegen` for Move type
  parsing + PTB helpers. Relevant entry points: `predict::mint` / `redeem` / `mint_range` / `redeem_range`
  / `supply` / `withdraw` / `redeem_permissionless`; per-user `PredictManager`; vol surface via
  `OracleSVI` / `OracleSVIUpdated` events. DeepBook sandbox enables a 1-line local stack deploy.
- **Agent runtime:** an LLM API (key as an **env var only** — no secrets in code/specs). The agent is a TS
  strategy loop that emits PTBs through the leash.
- **Longest pole / highest-effort task:** the leash Move module (custody + atomic cap enforcement +
  revoke). Assign it the highest reasoning effort and the most review; everything else is TS against fixed,
  already-deployed interfaces (low drift).

## Rubric mapping (why this won, for the record)

Scored on the current four rubric axes (`references/ideation-rubric.md`), intrinsic buildability kept
highest per the skill invariant, the other three re-mapped to mirror the event's published,
impact-first rubric — Real-World Application + Sui-stack fit fold into **Theme + sponsor-track fit**,
UX into **Demo WOW**: **Intrinsic buildability 35 · Theme + sponsor-track fit 25 · Demo WOW + UX 20 ·
Novelty 20.** Leash scored highest, ahead of an intent engine and a stress-test+hedge tool. It is
intrinsically buildable (one small Move module; everything else TS against deployed testnet Predict —
no external blocker) and uniquely maxes both impact axes by landing **DeepBook Predict** and **Agentic
Web Sub-track 2** exactly as the sponsors framed them.
