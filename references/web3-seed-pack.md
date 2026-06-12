# Web3 Seed Pack — divergence fuel for Step 0

Spark material for `idea-forge` Step 2 on **Web3 / crypto** events. Seeds are *not* ideas — they're
starting points you cross with the event's tracks and the builder's skills to reach ≥20 specific
candidates. For a non-Web3 event, don't use this pack; build an equivalent seed list from the event's
own theme and sponsor list (see `../idea-forge/SKILL.md` Step 2).

> **Snapshot, not a feed.** Axis 1 mirrors the a16z "Big Ideas for Crypto in 2026" list (published
> Dec 2025). Treat this pack as the floor for variety: when the session has web access, augment it
> with the current quarter's narratives before generating. **Refresh Axis 1 when the next annual
> a16z list drops (~December)** — a year-old seed pack quietly skews every candidate field toward
> last year's narratives.

Two axes: **what's hot** (a16z Big Ideas for Crypto in 2026) × **how hackathons slice it** (ETHGlobal
track archetypes). Cross them.

## Axis 1 — What's hot: a16z "Big Ideas for Crypto in 2026"

Grouped; each line is a seed. (Source: a16z crypto, "17 things we're excited about for crypto in
2026.")

**Stablecoins & payments**
- Clever on/off-ramps linking stablecoins to familiar payment rails.
- "The internet becomes the bank" — programmable, agent-initiated payments across networks.
- Stablecoins as the bank-ledger upgrade cycle (digital-dollar rails over legacy cores).

**Tokenization / RWA & on-chain finance**
- Crypto-native RWA via perps instead of skeuomorphic wrappers.
- Wealth management for all — tokenized portfolios, auto-rebalancing for retail.

**AI agents × crypto**
- KYC → **Know-Your-Agent (KYA)**: cryptographic credentials so agents can transact.
- Agent-to-agent payments / metering for the "invisible tax on the open web."
- AI for substantive on-chain research wrapped in verifiable workflows.

**Privacy & security**
- Privacy as the moat — confidential balances / actions on a public chain.
- Decentralized, quantum-resistant messaging without private servers.
- "Secrets-as-a-service" — programmable data access + decentralized key management.
- "Spec is law" — formally-verified invariants that block exploits by design.

**Prediction markets**
- Bigger / broader / smarter markets — long-tail outcomes, AI-assisted market creation, decentralized
  resolution.

**ZK / infrastructure**
- SNARK-powered verifiable cloud compute (provers now fast/cheap enough to matter).
- "Staked media" — onchain histories + cryptographic skin-in-the-game for credibility.

## Axis 2 — How hackathons slice it: ETHGlobal track archetypes

Most ETHGlobal-style events pay out across these. Pick the 1–3 you targeted in Step 1.

- **DeFi** — novel AMMs, hooks, vaults, intents, perps, cross-chain swaps, on-chain options.
- **Consumer / social** — wallets, mini-apps, frames, onboarding, "apps real people actually want."
- **Infrastructure / tooling** — SDKs, indexers, account abstraction, dev experience, oracles.
- **Privacy / ZK** — proofs, confidential transfers, identity, mixers-done-right.
- **AI × crypto** — agents that hold keys / transact, on-chain inference, agent marketplaces.
- **Public goods / impact** — funding mechanisms, quadratic / retroPGF, attestations.
- **Gaming / autonomous worlds** — on-chain game state, fully-on-chain games, tradable items.
- **Sponsor bounty** — build squarely on one sponsor's SDK / protocol; the bounty is its own track.
  Read the sponsor's docs for what they actually reward — fit ≥ cleverness here.

## How to cross them (to reach ≥20)

For each target track, walk 3–4 Axis-1 seeds and force a candidate: *who hurts → the one-line build →
the ~15-second demo moment*. Example crossings:

- **DeFi × KYA** → a lending vault only an agent with a valid KYA credential can borrow from. Demo: an
  unverified bot is rejected, a verified one borrows — live, on screen.
- **Consumer × stablecoin ramps** → a chat app where you pay a contact by replying "$5". Demo: money
  lands in-thread in one tap.
- **Privacy/ZK × prediction markets** → a market where positions stay private until resolution. Demo:
  two sealed bets reveal on settle.
- **Infra × agent payments** → a metered API gateway that charges agents per call in stablecoins.
  Demo: a paywalled endpoint unlocks the instant the agent pays.
- **Public goods × attestations** → one-tap proof-of-contribution badges. Demo: a contribution mints a
  verifiable badge a judge can scan.

## Demo-ability lens (pick seeds that yield a money shot)

Favor seeds where the winning moment is **visible and fast**: value moving, a gate accepting or
rejecting, a proof verifying, an agent acting on its own. Avoid seeds whose payoff is invisible (a
faster index, a cheaper gas path) *unless* you can show the delta on screen. The rubric's "Demo WOW"
axis rewards exactly this — a candidate you can't point at scores low there no matter how clever the
plumbing.
