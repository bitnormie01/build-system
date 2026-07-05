# HUMAN_TODO — Deadman (things only a human can do)

The autonomous build produced a complete, verified **mock-mode** product: `npm run demo` rehearses the
money shot end-to-end today (see [the run report](docs/reports/2026-07-05-autonomous-run-report.md)). The
items below are the human-only actions to take it live and submit. They are **ordered** — do them top to
bottom. Nothing here was executed by the build (safety lines: no keys, no funds, no live orders, no
external submissions).

> **Why these are human-only:** every step touches a real key, moves real USDC, places a live CAP order,
> or submits to an external platform — all outside the autonomous run's safety envelope
> (`references/conventions.md` §Safety). The code + docs that support them are already built and pushed.

---

## 1. Confirm the real submission deadline with the host  ⏰ (do this first)

The event lists **two conflicting deadlines** (see
[resource pack event.md](docs/resources/2026-07-05-croo-hackathon/event.md) §"Deadline & timeline"):
- **Timeline graphic:** `Jul 9, 23:59 UTC+8` (submission deadline)
- **Live DoraHacks countdown / sidebar:** `2026/07/12 14:30`

The build planned to the **earlier** date (Jul 9 23:59 UTC+8) to be safe. **Ask a CROO organizer** (Discord
office hours / the Ask-Question board) which is binding, and schedule the remaining steps against it.
→ Output: a confirmed deadline; put it at the top of your working notes.

## 2. Register the four agents at agent.croo.network and fill `.env`

Follow **[docs/runbooks/register-agents.md](docs/runbooks/register-agents.md)** (built by the run). In the
CROO Dashboard (My Agents → Register Agent), create:
- **Deadman** — the provider. Configure a Service: name "Deadman Uptime Attestation", price ~$0.05,
  Deliverable type **Schema**, skill tags e.g. `verification`, `uptime`.
- **requester 1** and **requester 2** — heartbeat requesters (payOrder is serialized per wallet, so two
  wallets scale heartbeats).
- **kill-target** — a throwaway agent whose Service has a **1-minute SLA** (Dashboard → Configure → SLA
  minutes = 1). This is the agent you kill on stage.

Each registration shows an **API key (`croo_sk_…`) once**. Copy `.env.example` → `.env` and paste each key
against its name (the names are already there; **never commit `.env`**):
`CROO_SDK_KEY_DEADMAN`, `CROO_SDK_KEY_REQUESTER_1`, `CROO_SDK_KEY_REQUESTER_2`, `CROO_SDK_KEY_TARGET`,
plus `BASE_RPC_URL` (optional) and `DEADMAN_MODE=live`.
→ Output: 4 registered agents (each with an AA wallet + DID) and a filled local `.env`.

## 3. Fund the two requester AA wallets with small USDC (~$10 total)

Deposit USDC on Base to **each requester agent's AA Wallet Address** (Dashboard → Configure) — **NOT** the
Controller/Executor address (a top integration gotcha; wrong address = funds unusable). Gas is sponsored,
so no ETH is needed.
→ Output: both requester AA wallets hold a few dollars of USDC.

## 4. Flip to live and run the prepared live smoke; verify on Basescan

With `.env` filled and `DEADMAN_MODE=live`:
```bash
npm install
DEADMAN_MODE=live npm run live:smoke      # runs scripts/live-smoke.ts (HUMAN-GATED — places a REAL order)
```
It places one $0.01 heartbeat to the kill-target, **does not deliver**, waits past the 1-minute SLA for the
CAPVault auto-refund, and prints the **refund tx hash + a Basescan link**. Confirm on
[basescan.org](https://basescan.org) that a real SLA-expiry refund fired. That tx hash is the certificate's
incident proof.
→ Output: a verified on-chain refund tx hash proving the mechanism works with real money.
→ **This completes the build's `live-artifacts:4` task** (status `human-pending` in the manifest).

## 5. Recruit counterparties for reward-eligibility (anti-sybil)

Reward-eligibility needs **≥3 unique counterparty agents** and **≥5 unique buyer wallets**, with no
concentrated self-trade ([event.md](docs/resources/2026-07-05-croo-hackathon/event.md) §Anti-sybil):
- **≥2 partner teams** as monitored targets — pitch: *their agents get paid real USDC per heartbeat.*
  Register their DIDs as targets in the live config (mirror `src/dashboard/main.ts`'s target list).
- **≥5 external wallets** to buy attestations before judging (Discord office hours / Ask-Question board).
→ Output: a target list of ≥3 distinct agents + ≥5 distinct buyer wallets that transact before judging.

## 6. Record the demo, list on the Agent Store, and file the BUIDL

- **Demo video (≤5 min):** the **mock kill-switch demo is rehearsable now** — `npm run demo`, open the
  dashboard, click **Kill** on a target, watch it go red and the certificate cite the refund tx. Do the
  **live** kill-switch only after step 4 (with the live-wired dashboard).
- **List Deadman on the CROO Agent Store** (the provider service from step 2 must be `online`).
- **File the BUIDL on DoraHacks** (`croo-hackathon`) with the public repo link + video + the five
  submission requirements, **before the confirmed deadline (step 1)**.
→ Output: a submitted BUIDL (repo + video), a listed agent, and a recorded demo.

---

### Quick reference — what the build already did for you
- Full mock product + dashboard, `npm run demo` money shot (verified live via the HTTP kill-switch).
- `scripts/live-smoke.ts`, `docs/runbooks/register-agents.md`, `.env.example` (names only) — all built.
- Sourced CAPCore/CAPVault event ABIs + a tested log decoder for the on-chain refund proof.
- One config flip (`DEADMAN_MODE=live`) switches the whole system from mock to the real CAP SDK.
