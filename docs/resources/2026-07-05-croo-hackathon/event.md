# CROO Agent Hackathon — Event Essentials

> Load-bearing facts quoted verbatim from source. Numbers/criteria are exact; do not paraphrase or round.
> Extracted 2026-07-05 via Chrome. Primary source: https://dorahacks.io/hackathon/croo-hackathon/detail
> Several detail sections (Judging criteria, Prizes, Key dates, Tracks) are rendered as **images** on the
> page and are invisible to a plain text scrape — they were read from the source PNGs (URLs in INDEX.md).

## Identity

- **Event:** CROO Agent Hackathon (DoraHacks slug `croo-hackathon`)
- **Host:** CROO Network
- **Format:** Virtual
- **One-liner (verbatim):** "Build paid, callable AI agents on the CROO agent commerce layer."
- **Prize pool:** 10,200 USD (`$10,200 USDC`)
- **Hackathon tags:** AI Agents, A2A, Web3, Blockchain, AI, Openclaw, DeFi
- **Platform technology:** OpenAI, Blockchain
- **Stats at extraction:** 62 BUIDLs, 300 Hackers, 3 questions

## Deadline & timeline

⚠️ **CONFLICT — two different submission deadlines appear on the same page. Both recorded verbatim; flagged for the architect. Treat as unresolved until confirmed with the host.**

**Source A — live sidebar widget** (`.../detail`, dynamic, top of page):
- `Submission  2026/06/09 14:30`
- `Deadline    2026/07/12 14:30`
- Status banner: `7 days left for submission` · `Upcoming` (as of fetch date 2026-07-05 → 7 days = 2026-07-12)

**Source B — "Hackathon Timeline" graphic** (`croo_hackathon_timeline_1600x900.png`):
| # | Date (verbatim) | Milestone (verbatim) |
|---|---|---|
| 01 | Jun 9 | Hackathon kickoff, registration opens |
| 02 | Jun 9–Jul 9 | Build sprint, 30 days |
| 03 | **Jul 9, 23:59 UTC+8** | **Submission deadline** |
| 04 | Jul 10–15 | Internal review shortlisting |
| 05 | Jul 16 | Demo Day |
| 06 | Jul 17–23 | Final judging |
| 07 | Jul 24 | Winners announced |

**The conflict:** Sidebar says the submission **Deadline = 2026/07/12 14:30** (and the live "7 days left"
countdown agrees with Jul 12). The timeline graphic says the submission deadline is **Jul 9 23:59 UTC+8**.
They differ by ~3 days. The live platform countdown is the enforcing mechanism on DoraHacks, so **Jul 12
14:30 is the operative platform deadline** for filing the BUIDL — but the discrepancy is unresolved and
should be confirmed with the host before relying on either. (Sidebar timezone is not labeled; graphic is
UTC+8.) Demo Day (Jul 16) and winners (Jul 24) come only from the graphic.

## Judging criteria (verbatim, with exact weights) — sums to 100%

Source: `croo_judging_criteria_1600x900.png` (rendered as an image; not in page text).

| Criterion | Weight | Description (verbatim) |
|---|---|---|
| **Technical Execution** | **30%** | Robust CAP integration, reliable A2A interactions, proper payment state handling. **Bonus: 10+ real CAP orders during the hackathon.** |
| **A2A Composability** | **25%** | Number, diversity, and depth of A2A relationships. CROO supplies aggregated CAP order data to judges. |
| **Innovation** | **20%** | Hard-to-replicate use case. Would this be impossible, or much worse, on a normal API marketplace? |
| **Usability & Real Adoption** | **15%** | Path to real users, early organic interactions, retention potential. |
| **Presentation** | **10%** | Demo clarity, README reproducibility, value-prop crispness. Scored at Demo Day. |

**Weight implications for idea-forge/architect:** 55% of the score (Technical Execution + A2A
Composability) rewards *real, on-chain, multi-counterparty CAP activity* — not a demo mock. The 30%
criterion explicitly bonuses **10+ real CAP orders during the hackathon**, and the 25% criterion is judged
on the number/diversity/depth of distinct A2A relationships (CROO gives judges the aggregated order data).
Only 10% (Presentation) is pure polish.

## Submission requirements

**Every BUIDL must satisfy all five (verbatim):**
1. **Listed on CROO Agent Store** — discoverable by humans and other agents
2. **Integrated with CAP** — agent is callable, settles on-chain
3. **Open source** — public GitHub repo with MIT / Apache 2.0 / similar permissive license
4. **Demo + README** — max 5-min demo video, setup instructions, SDK methods used, integration notes
5. **BUIDL filed on DoraHacks** — all required fields completed

**Platform-level submission requirements (sidebar):**
- GitHub/Gitlab/Bitbucket link required
- Demo video required

**How it works (verbatim 5 steps):** Build (agent in any framework, keep data & execution sovereign) →
Integrate CAP (agent becomes callable, accepts USDC, settles on-chain) → List (on CROO Agent Store) →
Open-source + demo (public repo MIT/Apache 2.0/similar + max 5-min demo video) → Submit (file BUIDL on
DoraHacks before the deadline).

## Prizes (verbatim) — Incentive Pool $10,200 USDC

Source: `croo_prize_pool_1600x900.png`. Subtitle: "Incentives for top agents."

| Placement | Prize |
|---|---|
| **1st — Grand Champion** | **$3,500** |
| **2nd** | **$2,500** |
| **3rd** | **$1,500** |
| **4th–10th — Honorable** | **$300 × 7** ( = $2,100 ) |
| **Most Popular Agent** | **$300** |
| **Most Innovative Agent** | **$300** |

Cash total: 3,500 + 2,500 + 1,500 + 2,100 + 300 + 300 = **$10,200** ✓ (matches the stated pool).

**Plus (every valid submission / top 10):**
- Agent Store featured listing
- **$CROO airdrop whitelist, top 10**
- **Permanent listing for every valid submission**

Additional incentive stated in "Why build with us": "Time-limited 0% gas fee during the CROO Agent Store
launch window" and "$CROO airdrop whitelist."

## Eligibility (verbatim)

- Open globally to individuals and teams (**team size 1–5**)
- Builders must be **18+**, or have guardian consent if **13–17** (subject to local jurisdiction)
- One team can submit multiple agents; **cash prizes have no submission cap**
- **Onboarding rewards capped at 3 rewarded agents per team / wallet cluster**

## Anti-sybil & disqualification (verbatim)

**Hard disqualification:**
- Private repo or unverifiable code
- Copy-paste fork without meaningful modification
- Fake demo, broken CAP integration, or failed human spot-check

**Reward-eligibility flags (not auto-DQ; reviewed):**
- < 3 unique counterparty agents
- < 5 unique buyer wallets
- Highly concentrated self-trade pattern
- Random 10% human audit failure

**Appeals:** 48-hour window after notification, reviewed by an uninvolved CROO Core member.

> These flags reinforce the judging weights: to be reward-eligible you need **≥3 unique counterparty
> agents and ≥5 unique buyer wallets**, with no concentrated self-trading. Real distinct demand, not a
> self-dealing loop.

## Testnet vs. mainnet (important)

This is a **mainnet** event, not testnet:
- CROO CAP smart contracts are deployed on **Base Mainnet (Chain ID 8453)** — see [sponsors/croo.md](sponsors/croo.md).
- Payments settle in **real USDC on Base** (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`).
- **Gas is sponsored** by the CROO platform via a Paymaster (PIMLICO) — developers don't hold ETH — and
  the event advertises a "time-limited 0% gas fee during the CROO Agent Store launch window."
- Practical cost note: orders move small, customizable USDC amounts (examples in docs use $0.01–$1.00 per
  call). The "10+ real CAP orders" bonus is achievable with cent-scale orders.

## Builder support (verbatim)

- CAP SDK quickstart — "15 minutes from zero to first call"
- Agent Store listing guide — step-by-step with screenshots
- FAQ — living documents
- Office hours — weekly on CROO Discord

## Official links

- Website: https://croo.network
- Docs: https://docs.croo.network
- Agent Store (dashboard): https://agent.croo.network
- X: @CROONetwork
- Community (Discord): https://discord.gg/y3xHr3t8nx
