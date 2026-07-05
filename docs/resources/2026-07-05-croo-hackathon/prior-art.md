# CROO Agent Hackathon — Prior Art (current submissions)

**All 62 BUIDLs** submitted as of fetch 2026-07-05, extracted via Chrome from
https://dorahacks.io/hackathon/croo-hackathon/buidl (list rendered from
`/api/hackathon-buidls/croo-hackathon/`). These are **competitors in this same live event**, not past
winners — the event is still open (no winners yet; see the deadline conflict in [event.md](event.md)).
Each links to `https://dorahacks.io/buidl/<id>`. One-liners are condensed from each card's description;
`[2 tracks]` marks a multi-track submission (shown as "1 of 2" on the card — only the first track is
captured here). Field = DoraHacks technique tag (AI/Robotics, Crypto/Web3, Other).

> **This is idea-forge's white-space map.** The dominant, crowded pattern is clear: *"turn X on-chain/market
> data into a paid, callable intelligence/verification service, settled in USDC on Base."* Verification,
> reputation/trust, research/market-intel, and DeFi-signal agents are heavily contested. Genuinely
> **composable orchestrators** (one agent that hires several others) and **Creator/Content** services are
> comparatively thinner. Differentiation should lean on the 25% A2A-Composability weight (real multi-agent
> hiring) and the 20% Innovation weight ("impossible or much worse on a normal API marketplace").

## Track distribution (primary track, n=62)

| Track | Count | Density |
|---|---|---|
| Research & Intelligence Agents | 15 | ▓▓▓▓▓ crowded |
| Data & Verification Agents | 13 | ▓▓▓▓▓ crowded |
| DeFi / On-chain Ops Agents | 12 | ▓▓▓▓ crowded |
| Open – Any A2A Agents | 9 | ▓▓▓ moderate |
| Developer Tooling Agents | 8 | ▓▓▓ moderate |
| Creator & Content Ops Agents | 5 | ▓▓ thinnest |

---

## Data & Verification Agents (13)

| Project | By | One-liner | Link |
|---|---|---|---|
| RepoAudit | KingDavid9999 | Audits any public GitHub repo for data-quality issues; structured JSON via CAP for $1 USDC/call | [46272](https://dorahacks.io/buidl/46272) |
| CROO Reputation Oracle | xiaowan | Scores a target agent's on-chain order history → reputation report with txHash citations | [46227](https://dorahacks.io/buidl/46227) |
| VERIDEX Web3 Trust Layer | Ferdinand Raphael | Decentralized "truth verification firewall" & security middleware for the agent economy `[2 tracks]` | [46181](https://dorahacks.io/buidl/46181) |
| veritas | caelum0x | A2A fact-verification & source-provenance agent (CAP) | [46146](https://dorahacks.io/buidl/46146) |
| Veritas Fides | Natri | Three composable agents — TrustGate / SourceAttest / ReputationOracle; live on Base Mainnet `[2 tracks]` | [46087](https://dorahacks.io/buidl/46087) |
| SkillSwap AI | hacker8419641 | Freelancing trust via multi-modal biometrics + blockchain contracts (Ethereum+IPFS) + FAISS matching `[2 tracks]` | [46023](https://dorahacks.io/buidl/46023) |
| VeriMath | pscamillo | Solves number-theory tasks with reproducible SHA-256 attestation — "don't trust, verify" | [46009](https://dorahacks.io/buidl/46009) |
| PulseBNB Agent | Makabeez | Send a BNB address, pay USDC → verdict "real builder or noise" with confidence, on-chain | [45995](https://dorahacks.io/buidl/45995) |
| ProofMesh | hacker2eecdfa | Paid multi-agent verification network for Web3 claims on CAP | [45991](https://dorahacks.io/buidl/45991) |
| SwapCat | hacker94ed6a1 | On-chain data / swap routing / wallet intel as Telegram-native agent + paid CROO services | [45986](https://dorahacks.io/buidl/45986) |
| Polymarket Broker | hacker1c630fa | Prediction markets as an intelligent multi-channel trading layer + CROO paid services | [45973](https://dorahacks.io/buidl/45973) |
| Atmos | suchit1010 | Carbon reduction → AI & satellite verified → SPL token → Dodo Payments → chain record | [45896](https://dorahacks.io/buidl/45896) |
| Hyperliquid Vault Strategy Intelligence | hacker5a854b0 | Hyperliquid vault data → callable, priced on-chain intelligence signals | [45487](https://dorahacks.io/buidl/45487) |

## Research & Intelligence Agents (15)

| Project | By | One-liner | Link |
|---|---|---|---|
| MarketPort | memeshe | Helps small e-commerce sellers decide if a product is ready for cross-border launch `[2 tracks]` | [46296](https://dorahacks.io/buidl/46296) |
| Research Desk | Mr.KH | Orchestrator agent that autonomously hires and pays other agents for research `[2 tracks]` | [46266](https://dorahacks.io/buidl/46266) |
| Nexus | hacker511f4ec | One task → plans, hires specialist agents, pays USDC on Base, delivers composed report w/ proof `[2 tracks]` | [46143](https://dorahacks.io/buidl/46143) |
| BUIDL Scout Agent | webqwer | Fast way to evaluate hackathon opportunities before committing time/budget | [46052](https://dorahacks.io/buidl/46052) |
| Receipt Agent | zkzora | Reads the chain (honeypot, tax, liquidity, holders, deployer) → BASED / BULLSHIT / MIXED `[2 tracks]` | [46051](https://dorahacks.io/buidl/46051) |
| CROO Agent Trust Lab | hacker1278350 | Audits listings/APIs/evidence/receipts into a buyer-ready trust card `[2 tracks]` | [46049](https://dorahacks.io/buidl/46049) |
| ProofDesk | hacker2fe938b | Paid source-grounded research + independent evidence verification for CAP `[2 tracks]` | [46035](https://dorahacks.io/buidl/46035) |
| AlphaTrack | hacker50cceed | Surfaces Binance "smart money" moves buried in leaderboard data | [45974](https://dorahacks.io/buidl/45974) |
| VeriClaim | Kevin Soto | Insurance-claim denial appeals within the 60-day window `[2 tracks]` | [45872](https://dorahacks.io/buidl/45872) |
| Paid Bounty Triage Agent | Lukeknow0 | Bounty/hackathon link → go/no-go, token-cost estimate, checklist, payment receipt | [45412](https://dorahacks.io/buidl/45412) |
| Polymind | Luoxia | Makes scattered Polymarket probabilities rankable & machine-readable | [45359](https://dorahacks.io/buidl/45359) |
| Remi-Agent | Remi-agent | Sovereign macro-intel agent: ingests macro, scores theme velocity, sells regime-aware analysis `[2 tracks]` | [45008](https://dorahacks.io/buidl/45008) |
| Chainguard | hacker65557fc | AI smart-contract security auditor on CAP (Claude); vulnerability reports for 0.01 USDC on Base | [44635](https://dorahacks.io/buidl/44635) |
| dyorAI | StevemaD | Crypto asset analysis / trading / management with AI insights (older BUIDL, id 37363) | [37363](https://dorahacks.io/buidl/37363) |
| MemeEco: Greedy World | Greedyworld | Meme ecosystem, gaming + trading dual-engine liquidity (older BUIDL, id 10366) | [10366](https://dorahacks.io/buidl/10366) |

## DeFi / On-chain Ops Agents (12)

| Project | By | One-liner | Link |
|---|---|---|---|
| DIBIA | hackerSheen | AI orchestrator that hires CROO agents to analyze a wallet → one Web3 portfolio health report | [46328](https://dorahacks.io/buidl/46328) |
| remifi | blockdevrel | Composable payout leg: name payees, define split, execute once; proof on Base | [46324](https://dorahacks.io/buidl/46324) |
| RiskPilot | pzqy | Bounded Sui agent: observes wallet, plans mitigation, prepares DeepBook action, proof to Walrus | [46092](https://dorahacks.io/buidl/46092) |
| CROO AI Oracle | fxscalpersignals | Crypto intelligence, 4-provider failover, zone entries, A2A-callable w/ on-chain settlement | [45993](https://dorahacks.io/buidl/45993) |
| BTC Up/Down Polymarket Agent | don_z | Trades Polymarket 5-min BTC Up/Down binaries with real-time technical analysis | [45912](https://dorahacks.io/buidl/45912) |
| WhaleScope | hacker68e666a | Hyperliquid whale opening activity → real-time callable intelligence | [45895](https://dorahacks.io/buidl/45895) |
| SwapGod | andyedwart | Offloads the whole execution process (tx details + protocol interactions) to an agent | [45837](https://dorahacks.io/buidl/45837) |
| DeFi Yield Scout | Lasting Stallion | Pay USDC to query 16,200+ pools for yield/risk/trending — callable DeFi intel on CAP | [45598](https://dorahacks.io/buidl/45598) |
| Bat Agents | BatombariB-prop | Open economy to create/own/deploy/monetize digital workers w/ on-chain identity & payments | [45525](https://dorahacks.io/buidl/45525) |
| DCA Signal AI Agent | hacker94ed6a1 | Bitcoin DCA → Telegram-native explainable score; callable paid service on CAP | [45481](https://dorahacks.io/buidl/45481) |
| Attestr.CROO | Faizee | 5 AI agents that hire each other via CAP to research/verify/audit Web3 protocols; USDC on Base | [45434](https://dorahacks.io/buidl/45434) |
| Clawintel | Sadiq Abubakar | "Autonomous blockchain intelligence agency" — collaborative agents investigating ecosystems 24/7 | [44509](https://dorahacks.io/buidl/44509) |

## Developer Tooling Agents (8)

| Project | By | One-liner | Link |
|---|---|---|---|
| PolicyGuard | nctrnlsoul | Callable guardrail: check a proposed on-chain action vs policy → allow/deny w/ reason, per-call USDC | [46243](https://dorahacks.io/buidl/46243) |
| BountyOps | Mathieu Weill | Turns paid opportunities into proof-hashed submission packs w/ on-chain pay/deliver/clearance | [46034](https://dorahacks.io/buidl/46034) |
| CAP Sentinel | lyon zhao | Audits CAP agents pre-submission (repo/demo/listing/SDK lifecycle/anti-sybil) → readiness report | [46032](https://dorahacks.io/buidl/46032) |
| vibe-deploy | luongs3 | Paid CROO agent: hire over CAP, pay USDC → live HTTPS URL, no human in loop, escrow on delivery `[2 tracks]` | [45905](https://dorahacks.io/buidl/45905) |
| CAProxy | rayyer | One on-chain call decomposes a plain-English brief, then discovers/pays/composes store agents | [45721](https://dorahacks.io/buidl/45721) |
| Flow Forensics | Rebel322 | Debugs A2A order lifecycles in real time: SLA breaches, missed payment deadlines, root causes | [45622](https://dorahacks.io/buidl/45622) |
| Aegis | WaterShowX | Paid smart-contract auditor: pay 0.5 USDC → audit, result hash settled on Base | [45431](https://dorahacks.io/buidl/45431) |
| ShipKit | hacker8992687 | Dev command center for CAP: scaffold callable agent, audit vs real @croo-network/sdk, listing copy — "ship paid agents in 15 min" | [44525](https://dorahacks.io/buidl/44525) |

## Open – Any A2A Agents (9)

| Project | By | One-liner | Link |
|---|---|---|---|
| Axion | RedGnad | Dynamic agentic teams / competitive predictions racing | [46334](https://dorahacks.io/buidl/46334) |
| BNB Builder Scout | Makabeez | Scores a BNB deployer by paying another agent (PulseBNB); one order fans out into paid sub-orders | [46043](https://dorahacks.io/buidl/46043) |
| Elephant jungle | hacker7c198c6 | "Hand everything you want to do to natural language" (将所有你想做的事情交给自然语言) | [46030](https://dorahacks.io/buidl/46030) |
| CROO A2A Agent Chain | Ponchy | Multi-agent translation pipeline using CAP + USDC on Base; modular, easy to integrate | [45827](https://dorahacks.io/buidl/45827) |
| Shamba-Sync | kaksv | Multi-agent AI bringing precision agriculture to Africa's smallholder farmers | [45730](https://dorahacks.io/buidl/45730) |
| DepegGuard Signal API | Matt@fintechcheck | DeFi risk intel — 25 paid data services across 2 agents, pay-per-call USDC on Base mainnet | [45407](https://dorahacks.io/buidl/45407) |
| Web3 Address Intel Report | hacker42556ea | On-chain evidence → official/safe/caution/dangerous verdicts via Web / API / A2A | [44577](https://dorahacks.io/buidl/44577) |
| Gameiny EAGLE | Ahmed Amin | Business/product agent over a Google Maps + Chat + Cloud "triple network" (Arabic desc) | [44157](https://dorahacks.io/buidl/44157) |
| Sella | Shera | Agentic marketplace: AI autonomously accesses paywalled APIs, datasets, GPU nodes, cloud VMs | [43923](https://dorahacks.io/buidl/43923) |

## Creator & Content Ops Agents (5) — thinnest lane

| Project | By | One-liner | Link |
|---|---|---|---|
| Megaphone | Mr.KH | "Marketing layer" agent: builders hire it to get discovered; it hires other agents on-chain to deliver `[2 tracks]` | [46344](https://dorahacks.io/buidl/46344) |
| Peach talk | Emily | AI-girlfriend companion agent built into Telegram | [45989](https://dorahacks.io/buidl/45989) |
| AdPilot | hacker68e666a | Ad optimization as an AI-native callable service: report analysis, funnel, ROAS, media-buying | [45987](https://dorahacks.io/buidl/45987) |
| Pygmalion — AI KOL Agent & Studio | hacker1c630fa | AI personas as autonomous KOLs: create content, grow audiences, monetize influence | [45985](https://dorahacks.io/buidl/45985) |
| Manga Localizer Agent | Abdulmajeed Alroumi | Localizes Japanese manga → Arabic, settles on-chain, callable via CAP | [45892](https://dorahacks.io/buidl/45892) |

---

## Patterns & white-space notes for idea-forge

- **Most common shape (very crowded):** "on-chain / market data → paid callable *intelligence or
  verification* report, USDC on Base." Reputation/trust oracles (CROO Reputation Oracle, Veritas Fides,
  VERIDEX, CROO Agent Trust Lab, Web3 Address Intel), contract/security auditors (Aegis, Chainguard,
  RepoAudit, PulseBNB), and market/DeFi-signal agents (DeFi Yield Scout, WhaleScope, AlphaTrack, CROO AI
  Oracle, DCA Signal) are the densest clusters. Entering these means beating an incumbent on execution.
- **The strongest fit to the judging rubric = true orchestrators** that *hire multiple other agents*
  (Research Desk, Nexus, DIBIA, CAProxy, Megaphone, BNB Builder Scout, Attestr.CROO, CROO A2A Agent
  Chain). These directly target the 25% A2A-Composability weight. Several already exist, so novelty must
  come from a specific, hard-to-fake composition, not "an orchestrator" in the abstract.
- **Meta / builder-tooling** is a recognizable cluster (ShipKit, CAP Sentinel, Flow Forensics, BountyOps,
  PolicyGuard, vibe-deploy) — tools *for other CAP builders*. Judges may reward these for ecosystem value
  but they compete on the same 25% composability metric with fewer natural counterparties.
- **Thinner lanes worth probing:** Creator & Content Ops (only 5), and non-crypto real-world verticals
  (Shamba-Sync/agriculture, Manga Localizer/localization, VeriClaim/insurance, MarketPort/e-commerce) —
  fewer entrants, and they can argue Innovation ("much worse on a normal API marketplace") more credibly.
- **Reputation/trust is over-served** — at least 6 projects converge on "score/verify an agent or address."
  A 7th needs a sharp differentiator.
- Provenance/completeness caveats: only each BUIDL's **first** track is captured (multi-track ones marked
  `[2 tracks]`); per-project GitHub/demo links, upvotes, and full descriptions live on each `/buidl/<id>`
  page and were not deep-crawled (bounded to the list). See INDEX.md for what wasn't fetched.
