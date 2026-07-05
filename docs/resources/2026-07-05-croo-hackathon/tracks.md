# CROO Agent Hackathon — Tracks

Source: `.../detail` page text + `croo_hackathon_tracks_1600x900.png` ("Hackathon Tracks — Choose any
lane. Build composable agents."). Fetched 2026-07-05 via Chrome.

## Structure

- There is **one sponsor: CROO Network.** Every track is a lane of the same bounty — there are **no
  separate third-party sponsor bounties**. The prize pool ([event.md](event.md)) is awarded across all
  tracks by overall rank (1st/2nd/3rd/Honorable) plus two special awards (Most Popular, Most Innovative),
  **not** per-track pots.
- **Multiple-track submissions allowed — max 2 tracks per BUIDL.** (On the BUIDLs list, projects tagged
  "1 of 2" are submitted to two tracks.)
- **Minimum bar to qualify is identical for every track** — the five submission requirements in
  [event.md](event.md): listed on CROO Agent Store, CAP-integrated (callable, settles on-chain), open
  source (MIT/Apache 2.0/similar), demo video (≤5 min) + README, BUIDL filed on DoraHacks. Required tech
  is the **CAP SDK** (Go / Node.js / Python) + **USDC on Base**; see [sponsors/croo.md](sponsors/croo.md).
- Pick a track that matches your agent. "See the Tracks tab for examples and focus areas per track" is
  stated on the page, but **no separate per-track examples page/tab was found** in the nav (only the
  six lanes + focus lines below). Treat per-track "examples" as a gap — the concrete signal for what
  fits each lane is the real submissions in [prior-art.md](prior-art.md), which are tagged by track.

## The six tracks (verbatim name + focus)

| # | Track | Focus / problem area (verbatim) |
|---|---|---|
| 01 | **Research & Intelligence Agents** | paid research with verifiable sources |
| 02 | **Data & Verification Agents** | provenance, credentials, output checks |
| 03 | **Creator & Content Ops Agents** | priced, composable creator services |
| 04 | **DeFi / On-chain Ops Agents** | monitoring, alerts, execution |
| 05 | **Developer Tooling Agents** | tools for other CAP builders |
| 06 | **Open – Any A2A Agents** | anything proving A2A composability |

(Focus lines from the detail text; the tracks image restates them as: 01 "paid research with verifiable
sources", 02 "provenance, credentials, output checks", 03 "priced, composable creator services", 04
"monitoring, alerts, execution", 05 "tools for other CAP builders", 06 "anything proving A2A
composability".)

## Qualifying tech per track (all tracks)

- **Integrate CAP** so the agent is a callable service that accepts USDC and settles on-chain (Base).
- **List on CROO Agent Store** (agent.croo.network) so it's discoverable by humans and other agents.
- Use one CAP SDK: `@croo-network/sdk` (Node 18+), `github.com/CROO-Network/go-sdk` (Go 1.22+), or
  `croo-sdk` (Python 3.10+). Full feasibility fuel in [sponsors/croo.md](sponsors/croo.md).
- To score well (see judging weights): generate **real orders** and **multiple distinct A2A
  relationships** (≥3 unique counterparty agents, ≥5 unique buyer wallets to stay reward-eligible).

## Track-distribution of current submissions (from prior-art, n=62, first/primary track only)

Rough field signal for white-space analysis (a project's second track, if any, is not counted here):

- **Data & Verification Agents** — the most crowded lane (trust/verification/provenance/reputation).
- **Research & Intelligence Agents** — very crowded (paid research, scouts, market/prediction intel).
- **DeFi / On-chain Ops Agents** — crowded (wallet risk, yield, execution, whale/vault intel).
- **Developer Tooling Agents** — moderate (CAP audit/scaffold/deploy tools for other builders).
- **Open – Any A2A Agents** — moderate (orchestrators, translation chains, misc A2A demos).
- **Creator & Content Ops Agents** — the thinnest lane (KOL/persona, ads, manga localization, companion).

See [prior-art.md](prior-art.md) for the per-project track tags that back this up.
