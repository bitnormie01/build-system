# Faucet Playbook Library — cross-campaign faucet knowledge

Faucet gates are the same small fight every campaign: which provider actually drips, what it's
gated on (OAuth? CAPTCHA? a mainnet-balance check?), how much, how often, and which "official"
faucet is currently broken. This library keeps what each campaign learned so the next one's faucet
gate runs first-try instead of re-fighting the discovery. It is **kit-side reference knowledge**
(like `../web3-seed-pack.md`), not a project artifact: entries describe public providers, never a
campaign's addresses, accounts, or keys.

## How it's used (gate-concierge)

- **Read before driving.** Before running any faucet gate, the concierge checks the matching
  `<chain>-<network>.md` here. A fresh `verified` entry turns the gate into "navigate, claim,
  verify" with no discovery pass — and its `Gating:` line feeds the gate ledger's tool plan
  directly. A stale or missing entry means: discover first, then contribute.
- **Write back after.** After every faucet gate — success OR failure — the concierge updates the
  entry (or creates the file from `_template.md`) with what it actually verified, stamps the date,
  and commits it **to the build-system repo**. This is one of the kit's sanctioned
  reference-library write-backs (alongside `../demo-stack.md` re-verified pins and
  `../music-kit.md` cleared tracks — `../repo-bootstrap.md`): the library is shared,
  doctrine-side knowledge and
  grows by one commit per
  campaign. (`../repo-bootstrap.md`'s ban is on committing *project* artifacts here — a public
  provider fact is not one.)

## File format

One file per chain + network — `sui-testnet.md`, `ethereum-sepolia.md`, `base-sepolia.md`, … —
copied from `_template.md`, one `##` section per provider, best-working-first. Per provider:

- **URL** — the claim page.
- **Gating** — what stands between you and the drip: `none | email-otp | oauth-github |
  oauth-google | captcha | wallet-connect | sms | mainnet-balance | discord-role` (combinations
  allowed). This maps straight onto the concierge's tiers: `sms` is a Tier-B capability gap;
  `mainnet-balance` usually disqualifies a fresh burner — record it so no campaign wastes the
  attempt.
- **Drip + cooldown** — how much per claim, how often, keyed to what (address / account / IP).
- **Burner-compatible** — yes/no: does it pay a fresh, unfunded address?
- **Last verified** — date + one line of evidence (tx hash prefix, "drip received").
- **Status** — `verified | stale | broken`. Broken entries **stay listed** — knowing a dead
  faucet is half the library's value.
- **Notes** — the gotchas: queue times, regional blocks, amount actually received vs. advertised,
  the alternate that worked when this one didn't.

## Staleness rule

Faucets rot fast. An entry older than **~90 days** is a hint, not a fact — try it first, but plan
the discovery pass. Never present a stale entry's drip/cooldown as current in a gate ledger; quote
it with its date — the same honesty rule as everywhere in this kit (an accurate "unknown" beats a
confident wrong fact).
