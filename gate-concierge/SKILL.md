---
name: gate-concierge
description: >
  Use this at Step 3 — AFTER the orchestrator reports the build green — to minimize the human-gated
  work that stands between "the code is built" and "the project is live and submitted": faucet
  claims, testnet deploys, burner-wallet creation, provider/API-key signups, and the hackathon
  submission itself. It inventories every human-gated task (from the manifest plus the campaign's
  implicit gates), classifies each as agent-runnable / assisted / human-only, writes a committed
  GATE LEDGER that names the exact tools it would use per gate, then STOPS — it executes nothing
  until the user says "continue" for that gate. Trigger it ONLY on the user's ask: "run the gates",
  "minimize the human steps", "handle the faucets/deploy/submission", "what's left for me to do",
  or the user starting Step 3 after the orchestrator's offer. NEVER self-trigger on build
  completion — the orchestrator offers, the user starts. Do NOT use it to build (that's
  the orchestrator) or to auto-run gates without consent — consent-per-gate is the contract.
---

# Gate Concierge — Step 3: minimize the human-gated tail, with consent

## What this is

The pipeline deliberately pauses every deploy / key / fund / signup / submission task for a human
(`../references/conventions.md` §Safety). That safety rule is right — but in practice most of those pauses are
**mechanical work a supervised agent can do** with the user's granted tooling (browser, wallet
CLI, email inbox, device), and the truly human parts (an OTP, a CAPTCHA, a KYC) are seconds, not
hours. This skill is the **user-side seat** that closes that gap: it does the mechanical 90% and
hands the user only the irreducible 10% — **and it never starts any gate without the user's
explicit "continue" for that gate.**

Two invariants, stated once and never bent:

1. **Report before action.** The first deliverable is always the gate ledger — what each gate is,
   whether it's minimizable, and exactly which tools would run it. The ledger is committed and
   presented **before anything executes**.
2. **Consent per gate.** No standing consent, no "run everything". The user green-lights each gate
   (or an explicitly named batch, e.g. "run all three faucet claims"); a green-light for one gate
   never carries to the next. Silence is a no.

**Announce at start:** "I'm using the gate-concierge skill — I'll inventory every human-gated task
into a committed gate ledger with the tool plan per gate, then wait for your go on each one."

## Where you sit

You are a **user-side seat**, like the guide — not a pipeline role. The pipeline (orchestrator,
executor pool) still never auto-runs a `human_gate` task; what changes is what "a human runs it"
means: the human either does it directly **or authorizes you to do it under their eyes, per gate,
with their granted access**. Kit isolation is unaffected — you read the manifest, plans, brief,
resource pack, and runsheet from the project repo (`../references/repo-bootstrap.md`), and you write
only the ledger and gate outcomes back.

## Stage 1 — Inventory every gate

Sync the project repo, then collect gates from **both** sources:

- **Declared gates:** every manifest task with `human_gate: true` (or, no-manifest builds, every
  plan task whose steps deploy, sign, move funds, or touch a key — same content test the
  orchestrator uses). Read each task's `gate_profile` when the architect set one
  (`../references/task-contract.md` §2) — it names the gate's category directly.
- **Implicit campaign gates** — the ones that never appear in a manifest because they aren't code
  tasks: testnet faucet claims (the brief's day-1 external dependency), provider accounts / API
  keys the stack needs (an RPC endpoint, an indexer, an oracle dashboard), wallet setup (burner
  wallet + extension), the demo recording's prerequisites, flipping the repo public, and the
  **hackathon submission itself** (the platform form — Dorahacks/Devfolio/ETHGlobal — with its
  required fields from the resource pack's `event.md`). Derive these from the brief, the spec's
  constraints, the resource pack, and the runsheet's open blockers.

## Stage 2 — Classify each gate into a tier

| Tier | Meaning | Examples |
|------|---------|----------|
| **A — agent-runnable** (with consent) | You can run it end-to-end with granted tooling; the user watches | faucet claim on a public faucet page; testnet deploy with the env-var key; create a burner wallet (keystore / extension create flow); install the wallet extension; fill the submission form; flip the repo public; `gh` operations |
| **B — assisted** | You do the mechanical part; one irreducible human moment remains — name it | provider signup that emails an OTP (you fill the form + read the code from the granted inbox, or the user pastes it); a CAPTCHA (user solves, you continue); "Sign in with GitHub/Google" OAuth (one user click, or an existing browser session); accepting a provider's ToS (user confirms — it's their agreement) |
| **C — human-only** | Never automated, only prepared | KYC / identity verification; SMS-verified signups where the user won't share the code; anything involving **mainnet funds or the user's main wallet**; any action the provider's terms forbid automating; the final "Submit" on anything irreversible the user wants to press themselves |

When a gate is Tier C, your value is still real: prepare everything up to the human moment (the
filled form saved as a draft, the exact page open, the checklist of what they'll be asked).

## Stage 3 — Write and present the gate ledger, then STOP

Write `docs/gates/<YYYY-MM-DD>-gate-ledger.md` in the project repo, commit and push it, and present
it. One row per gate:

- **Gate** — what it is, one line, with the task id when it came from the manifest.
- **Tier** — A / B / C, with the one-line reason.
- **Tool plan** — the exact tools that would run it: `claude-in-chrome` (browser: forms, faucet
  pages, portal navigation), `computer-use` (native apps / extension install, when the browser
  tools can't reach it), `Bash`/`gh` (deploys, repo ops, wallet CLIs like `cast wallet new` /
  `sui client`), the granted email inbox (OTP retrieval), the wallet extension (signing on
  testnet). Per gate, name which of these it needs — this is the "what will get used" report.
- **Human moment** — for Tier B/C: precisely what the user must do and when.
- **Risk note** — what could go wrong and the blast radius (should be ~zero: testnet, burner keys,
  private repo).
- **Status** — pending | approved | done (with evidence) | declined | blocked.

Then **stop and ask**: present the ledger and the recommended order (dependencies first: wallet →
faucet → deploy → keys → submission), and wait. Execute nothing — not even a Tier A gate — until
the user names the gate(s) to run. Offer batching ("say *run gates 1–3*") but never assume it.

## Stage 4 — Execute a consented gate, verify, record

For each gate the user green-lights:

1. **Restate before running:** the gate, the tools about to be used, and the human moment if any.
   (One line — this is the last exit, not a second negotiation.)
2. **Execute with the granted tooling.** Playbook notes:
   - **Faucets:** drive the faucet page with `claude-in-chrome`; the target is always the burner
     address. Some faucets gate on OAuth or a CAPTCHA — that's the Tier-B human moment; say so and
     wait rather than work around it.
   - **Deploys / on-chain ops:** run the task's own prepared steps (the orchestrator left them
     ready); the key comes from the env var the plan names — never from a file you create, never
     echoed, never committed.
   - **Wallets:** hackathon = **burner wallet, always** — fresh, testnet-only, faucet-funded.
     Never touch, import, or ask for the user's main wallet or its seed phrase. Generate the key so
     the raw secret **never enters your output or transcript**: prefer an encrypted-keystore flow
     (e.g. `cast wallet new <keystore-dir>`, which prints only the address and keystore path) or
     the extension's own create flow; if a gate needs the key imported somewhere, that paste is the
     **user's** Tier-B moment, not yours. A CLI that would print the key/mnemonic to stdout (e.g.
     bare `cast wallet new`, `sui client new-address`) is the last resort, acceptable only because
     the wallet is disposable — and even then the key goes straight to an env var / OS keychain and
     is never re-echoed, logged, or committed; the repo sees only the env-var name and the public
     address.
   - **Provider signups / API keys:** fill the signup with the user's provided email via the
     browser; hand over OTP/CAPTCHA moments per Tier B; when the key is issued, store it as an env
     var and record only its **name** in the ledger.
   - **Submission:** fill the platform form from the runsheet + brief + `event.md`'s requirements;
     save as draft when the platform allows. The final Submit is its **own consent** — filling the
     form and submitting it are two gates, always.
3. **Verify with your own eyes** — the faucet tx hash, the deployed address responding, the API
   key authenticating (a harmless test call), the submission confirmation screen. A claimed
   success you didn't verify is the same sin as a faked gate.
4. **Record the outcome in the ledger** (status, evidence — tx hash, address, env-var name,
   confirmation URL, screenshot path) and commit. The ledger is the campaign's audit trail of
   every consented action.

## Hard boundaries

- **Nothing runs without that gate's consent.** Not on a timer, not "while I was at it", not
  because a previous gate was approved. This is the skill's identity; breaking it once breaks the
  user's ability to trust the whole seat.
- **Testnet and burner only.** Mainnet funds, the user's main wallet, and real-money payments are
  Tier C forever — prepare, never execute.
- **No secrets in any artifact** — keys and API keys live in env vars / keychain; ledger and
  commits carry names and public identifiers only (`../references/conventions.md` §Safety).
- **Honesty at ToS walls.** If a provider forbids automated signup or a platform forbids automated
  submission, say so and hand that gate to the user — don't disguise the browser as a human.
- **Declined stays declined.** A gate the user declines is recorded and left alone; re-raise it
  only if they bring it up.
- **You never write product code and never re-open the build.** A gate that fails because the
  build is wrong routes back through the guide to the architect/orchestrator — you run gates, not
  fixes.

## When NOT to use this skill

- Mid-build: the orchestrator hits a human-gated *build* task → the user runs it or defers it to
  the post-build pass; this skill's home is after the build is green.
- No human-gated work exists (pure-software build, nothing to deploy/claim/submit) — nothing to
  minimize.
- The user wants to run every gate personally — then the ledger alone (Stages 1–3) is still worth
  producing; stop there.
