# Resource Pack — CROO Agent Hackathon

**Event:** CROO Agent Hackathon (DoraHacks slug `croo-hackathon`) · **Host:** CROO Network · **Format:** Virtual
**Extracted:** 2026-07-05 · **Method:** Chrome browser tools only (`claude-in-chrome`); **no** WebFetch/WebSearch used.
**Status:** Step 0a complete. This pack is the ground truth for idea-forge (Step 0) and the architect (Step 1).

## Contents

| File | What's in it |
|---|---|
| [event.md](event.md) | Deadline (⚠️ conflict flagged), eligibility, submission requirements, **judging criteria + exact weights**, prize breakdown, anti-sybil rules, mainnet/USDC facts |
| [tracks.md](tracks.md) | The 6 tracks + focus areas, single-sponsor structure, per-track qualifying bar, track density |
| [sponsors/croo.md](sponsors/croo.md) | **CAP feasibility fuel** — Base-mainnet contract addresses, SDK install + full method surface, order state machine, wallet/permission model, gotchas, error handling, example repos |
| [prior-art.md](prior-art.md) | All **62 current BUIDLs** grouped by track, each with link + one-liner + white-space analysis |

## Provenance — every source

Legend: **P** = primary (authoritative), **S** = secondary/context. Tool = how it was captured.

### Hackathon (DoraHacks) — all via Chrome, fetch 2026-07-05

| # | Source | URL | Tool | P/S | Confidence / notes |
|---|---|---|---|---|---|
| 1 | Detail page (prose) | https://dorahacks.io/hackathon/croo-hackathon/detail | Chrome `get_page_text` | P | High. About/tracks/submission-reqs/eligibility/anti-sybil captured verbatim. |
| 2 | Live sidebar widget (dates/pool) | (same page, dynamic) | Chrome `get_page_text` | P | High for values; **timezone of "14:30" not labeled**. Countdown "7 days left" (→Jul 12) at fetch time. |
| 3 | **Judging criteria** image | https://cdn.dorahacks.io/static/files/19eab61029d1ca0571c1003491680a17.png | Chrome screenshot (opened image directly) | P | High. Read visually — **rendered as an image, invisible to text scrape.** All 5 weights sum to 100%. |
| 4 | **Prize pool** image | https://cdn.dorahacks.io/static/files/19eab64b4cb4deedbfd3daf4e4484b40.png | Chrome screenshot | P | High. Cash lines sum to $10,200 ✓. |
| 5 | **Timeline** image | https://cdn.dorahacks.io/static/files/19eab74b18a9a3aa9d7ae0648748e0fe.png | Chrome screenshot | P | High read; ⚠️ **its Jul 9 deadline conflicts with the sidebar's Jul 12** — see event.md. |
| 6 | **Tracks** image | https://cdn.dorahacks.io/static/files/19eab61d2c39e18e9081f58462296c65.png | Chrome screenshot | P | High. Matches the detail-text track list. |
| 7 | BUIDLs list (62) | https://dorahacks.io/hackathon/croo-hackathon/buidl | Chrome `get_page_text` (paginated via "View More") + page-context `fetch` of the list API for the tail | P | High for name/author/one-liner/track/field of all 62; ids aligned from DOM anchors (62 unique = 62 projects). |
| 8 | BUIDL list API | https://dorahacks.io/api/hackathon-buidls/croo-hackathon/?page_size=… | Chrome page-context `fetch` | P | Used only to confirm count (62) and read the last 14; raw responses carry signed image URLs (privacy-filtered), so only text fields were extracted. |

### CROO / CAP developer docs — all via Chrome, fetch 2026-07-05

Served as Markdown by appending `.md`; index at https://docs.croo.network/llms.txt.

| # | Source | URL | P/S | Confidence / notes |
|---|---|---|---|---|
| 9 | Docs home / overview | https://docs.croo.network/ | S | Context. Page footer says "Last updated 4 months ago" (marketing overview; dev docs below look current). |
| 10 | Docs index | https://docs.croo.network/llms.txt | S | Complete page list; used to target the dev-doc pages. |
| 11 | **Smart Contracts** | https://docs.croo.network/developer-docs/smart-contracts | P | High. Base-Mainnet addresses (CAPCore/CAPVault/CROOValidationModule), v2, EntryPoint v0.7, order state machine. |
| 12 | **Quick Start** | https://docs.croo.network/developer-docs/quick-start | P | High. Register→configure→install→run flow, env vars, SDK install lines, deposit-to-AA gotcha. |
| 13 | **Node.js SDK Reference** | https://docs.croo.network/developer-docs/sdk-reference/node.js-sdk-reference | P | High. Full method surface, WebSocket events, error helpers, deliverable types. |
| 14 | **FAQ** | https://docs.croo.network/developer-docs/faq | P | High. USDC-on-Base address, PIMLICO paymaster, per-key WS limit, PayOrder concurrency gotcha, cancel/refund rules. |
| 15 | **Order Lifecycle** | https://docs.croo.network/developer-docs/core-concepts/order-lifecycle | P | High. Negotiation + order state machines, SLA expiry/refund, settlement split, idempotency. |
| 16 | **Account & Wallet Architecture** | https://docs.croo.network/developer-docs/core-concepts/account-and-wallet-architecture | P | High. Navigator/Agent/AA-wallet hierarchy, Owner vs Executor (ERC-7579), agent status. |

## Cross-checks performed

- **Prize math:** cash lines ($3,500+$2,500+$1,500+$300×7+$300+$300) = **$10,200** = stated pool ✓.
- **Judging weights:** 30+25+20+15+10 = **100%** ✓.
- **BUIDL count:** page header "62", list API `count:62`, and 62 unique `/buidl/<id>` anchors all agree ✓.
- **USDC address** (`0x8335…2913`) matches the canonical Circle USDC on Base (from CROO's own FAQ; not independently re-verified on-chain).

## Gaps & caveats (honest "unknowns" — do not fill by guessing)

1. **⚠️ Submission deadline is contradictory** — timeline graphic says **Jul 9 23:59 UTC+8**; live sidebar
   says **Deadline 2026/07/12 14:30** (countdown agrees with Jul 12). Unresolved; confirm with the host.
   Operative platform deadline is treated as **Jul 12 14:30** (the enforced countdown). Detail in event.md.
2. **Sidebar deadline timezone** is not labeled on the page.
3. **Platform fee %** taken at settlement (Fee→Treasury) is **not stated** in the docs — unknown.
4. **Per-track "examples" page** referenced on the detail page ("See the Tracks tab…") was **not found** in
   the nav — only the six lanes + one-line focus each. Use prior-art track tags as the concrete per-track signal.
5. **CROOExchange contract address** is not published (Agent Trading "deployed in v1 but not yet publicly
   available") — don't design around Agent Trading.
6. **Prior-art depth is bounded** — only each BUIDL's **first** track captured (multi-track marked `[2 tracks]`);
   per-project GitHub/demo links, upvotes, and full descriptions were **not** deep-crawled from each `/buidl/<id>`.
7. **Docs pages not pulled** (out of scope / diminishing returns): protocol-overview, core-concepts/service-
   registration, Go & Python SDK references, security-and-trust-model (only FAQ highlights taken), tokenomics,
   roadmap, cap-contracts source. Pull these if a build needs them.
8. **Contract addresses** are transcribed from official docs only, **not** independently verified on Basescan.

## Handling / safety

- **Read-only throughout.** No login, no registration, no BUIDL submission, no form filled, no wallet
  connected, no funds moved. Cookie/consent banner was declined ("Reject") where it appeared.
- All web work done through the **Chrome browser** per instruction; WebFetch/WebSearch were not used.
- No secrets in this pack — only env-var *names* (`CROO_API_URL`, `CROO_WS_URL`, `CROO_SDK_KEY`, `BASE_RPC_URL`).

## Handoff

Ready for **idea-forge (Step 0)**: point it at this directory as its primary source. Its Step-1 inputs —
hackathon URL, tracks, published judging criteria + weights, prior art — are pre-extracted here. Then
→ architect (Step 1) → orchestrator (Step 2). Per the kit's one rule, this pack is committed and pushed so
the next session sees it.
