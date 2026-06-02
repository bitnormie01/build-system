# Idea Forge Brief — Tollgate

*The machine-payable web on Sui. HTTP 402, reborn for AI agents: per-request stablecoin payments that let an agent pay its own way across the web — no accounts, no API keys, no Stripe.*

- **Date:** 2026-06-01
- **Event:** Sui Overflow 2026 (Mysten Labs) — https://www.deepsurge.xyz/hackathons/b587dc0c-4cb8-4e63-ada5-519df38103bf
- **Primary track:** The Agentic Web (core; 1st prize $30,000)
- **Secondary framing:** DeFi & Payments (programmable, autonomous machine payments)
- **Status:** committed (a `novel-wow` pick that still clears the two hard gates — buildability + non-domination. Replaces the denied "Backstop" (dominated by a swap) and "Sentinel" (too deterministic / not AI-native) briefs.)

---

## Problem

AI agents can read and call the entire web, but they cannot **pay** for any of it. Every paid API or dataset is human-gated: you must create an account, manage API keys, and put a card on file — none of which an autonomous agent can do. And payment processors physically can't fill the gap: Stripe needs accounts, has a ~30¢ fee floor, and offers no accountless, sub-cent, instant, global settlement. So the agent economy has **no native payment rail** — agents are stuck behind human paywalls, and the millions of developers with a useful API or data feed have no way to sell access per-call to machine consumers.

## Solution

Tollgate is a machine-payable web rail on Sui. A provider wraps any endpoint in Tollgate middleware. When an agent calls it, the agent receives **HTTP 402 Payment Required + a Sui payment intent**; the agent's Tollgate SDK **auto-pays a stablecoin micropayment on-chain**, retries the request with the on-chain receipt as proof, and gets the response. No accounts, no API keys, no Stripe — the agent pays its own way, settled on Sui in real time, with every payment a verifiable on-chain receipt.

## Why this clears the two hard gates (the tests the prior ideas failed)

- **Buildability (real, controllable on-chain money shot):** the money shot is *N real stablecoin micropayments submitted by an autonomous agent* to a service the builder controls. No live-market dependency, no human-in-the-loop, no model to train, no external approval — every piece (LLM agent loop, middleware, payment, thin Move module) is controllable on testnet / Sandbox. Minimal custom Move.
- **Non-domination (impossible in Web2):** accountless, sub-cent, instant, global **pay-per-request** cannot be replicated by Stripe (accounts + ~30¢ floor + no instant global settlement) or by a manual swap. The on-chain receipt **is** the access credential. This is the gate the "Backstop" idea failed — Tollgate passes it cleanly.

## Must-have demo features (the minimum that makes the money shot land)

1. **402 paywall middleware.** An Express middleware that protects a route: on an unpaid request it returns **HTTP 402** with the price and a Sui payment target; it verifies a matching on-chain payment receipt before serving the response. One-line adoption for any existing API.
2. **Agent auto-pay SDK.** A TypeScript client an AI agent uses inside a real LLM loop (e.g., "compile a report using these paid tools"): on a 402 it constructs, signs, and submits the Sui stablecoin micropayment **from the agent's own wallet/budget**, then retries with the on-chain proof. Fully autonomous — no human approves each payment.
3. **On-chain metering module + receipts + withdraw.** A thin Sui Move module (`tollgate`) deployed to **testnet so the project has its own Package ID**: a provider registers a `MeteredResource` (price, owner), each payment is recorded as a verifiable `PaymentReceipt` / event the middleware checks, and the provider can `withdraw` accrued earnings. This is the "meaningful, non-superficial Sui usage" judges require; Sui does settlement + the access proof.

## Why it wins (prior art consulted — 77 submitted Overflow projects)

- **White space.** The field's agentic projects cluster on *constraining* agents (Capsule, Sui-Nexus, FractalMind, Guardian — spending leashes), *identifying* them (Aegis, SuiSoul — reputation/passports), *remembering* (Coral, SuiLens, RIOT — memory), or heavy *marketplaces* (SkillWal — Nautilus TEE + optimistic settlement). Even Quikt frames "agent-grade USDC settlement" as treasury infra. **None** builds the **accountless per-request paywall rail** — HTTP 402 for agents — that lets *any* service get paid by *any* agent with no account. ToldProof merely *uses* the pattern narrowly ("an AI agent pays $0.10 per prediction via MCP, no signup, no API key"), which **proves the demand** but leaves the rail itself unbuilt.
- **Head-to-head vs. the strongest agent-commerce entry (SkillWal).** SkillWal is a closed AI-skill marketplace requiring Nautilus TEE execution, optimistic settlement, and a dispute-resolution system. Tollgate wins on the event's two largest axes: **Real-world application (50%)** — *any existing API or dataset* adopts Tollgate in one line and instantly sells to the whole agent economy, vs. a single walled-garden marketplace — and **Technical buildability (feasibility)** — a 402 middleware + an on-chain micropayment + a thin Move receipt module is demoable and reliable, vs. standing up a TEE + optimistic settlement + disputes. We don't claim a richer marketplace; we claim the **missing rail** and a fully-autonomous, fully-on-chain money shot, hitting the same Agentic-Web thesis (autonomous workflows where settlement is on-chain, beyond simple API wrappers).

## Demo money shot (~15 seconds the judge remembers)

An autonomous AI agent is given a task — *"compile a live report using these three paid data tools."* On screen, it calls each tool, hits a **402 Payment Required**, and **pays its own way: three real stablecoin micropayments fire on Sui in seconds**, each a verifiable receipt opening on **Sui Explorer**, and the agent assembles the answer. No human clicked anything, no API keys, no Stripe — an AI agent transacting across the web on its own. *(Closer: the API provider clicks "Withdraw" and pulls its real on-chain earnings.)*

## Out of scope (deliberately NOT building — protects the money shot)

- No TEE / verifiable-compute proof that the provider served correct data (v1 trusts the provider post-payment) — note as future work.
- No refunds, dispute resolution, or escrow-with-arbitration — payment is for access, atomic and final in v1.
- No agent identity / reputation / KYC system — the agent is just a wallet.
- No marketplace / discovery UI, no provider directory, no ratings — Tollgate is the rail, not a storefront.
- No payment channels / batching optimization in v1 — pay-per-request keeps the demo legible (note channels as scaling future work).
- No mainnet / real money, no token, no LLM training. The agent is a thin LLM loop — the contribution is the rail, not the agent's intelligence.

---

## Technical grounding for the architect (verified from `docs/resources/05-sui-typescript-sdk-and-dapp-tooling.md` and `04-sui-core-and-move.md`)

This is mostly off-the-shelf Sui + a thin Move module — the on-chain action is a plain stablecoin payment with a verifiable receipt, which is exactly what makes it buildable. Treat as inputs to verify, not invent:

- **Payments + receipts:** use the Sui TypeScript SDK (`@mysten/sui`) for keypair/wallet, programmable transaction blocks, and confirmation waits; a payment is a transfer of a testnet stablecoin (USDC / DUSDC) into the `tollgate` module that emits a `PaymentReceipt` event keyed to the resource + a request nonce. The middleware verifies by reading the on-chain receipt/event (direct chain read for confirmation-critical state, per the SDK checklist), then serves the response. Show an Explorer link per payment.
- **Custom Move (minimal):** one module, e.g. `tollgate`, with a `MeteredResource` (key+store: owner, price, accrued balance), `register_resource`, a `pay<Coin>` entry that accepts the micropayment, credits the resource, and emits `PaymentReceipt { resource_id, payer, amount, nonce, ts }`, and a `withdraw` entry guarded by an owner capability. ~1 module, 3 entries, 1 event, 1 cap — deployed to **testnet** for the project's Package ID. Settlement and the access credential live in Sui; everything else is conventional TS.
- **Agent + middleware:** an Express middleware returning `402` + payment metadata and gating the handler on receipt verification; a TS agent SDK (`payAndRetry`) wrapping fetch; the demo agent is a standard LLM loop (provider via an env-var API key — **never** hardcode keys/secrets). Use direct chain reads for verification; the public RPC for testnet is fine for the demo.
- **Controllability:** the builder runs both the paid services and the agent, so the entire money shot (number of calls, prices, timing) is fully controllable; no external blocker. Consider a small React dashboard that visualizes each 402 → payment → receipt in real time for demo legibility.
- **Why-Sui (state explicitly in the submission):** sub-cent, accountless, ~sub-second-finality, global stablecoin micropayments with an on-chain access receipt — unachievable on Stripe/Web2 rails; Sui's low fees and parallel execution make per-request payment viable.

## Rubric note

Chosen on an adapted rubric mapped to Overflow's **published** weights (Real-world application 50%, Product/UX 20%, Technical implementation 20%, Presentation 10%) and demo-first verification, keeping the kit's hard rule that **buildability is the single highest weight (floor 30)** plus the **non-domination gate**. Per the `novel-wow` appetite the builder requested, Novelty/WOW is weighted up to the rubric's allowed ceiling without exceeding buildability: *Buildability/on-chain-demoability 35 · Real-world application + demo story 25 · Sui-stack centrality + track fit 20 · Novelty/WOW + white-space 20.* Tollgate clears both hard gates (controllable on-chain micropayment money shot; accountless pay-per-call is impossible in Web2) and is the field's only accountless agent-payment rail — the white-space "this is the modern era" thesis with a real on-chain demo.
