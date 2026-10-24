# Invoke Autopilot — copy-paste kickoff prompt

Paste this into ONE Claude Code session (your strong reasoning seat) — **the session you grant
your access to** (Chrome browser tools, device/computer-use, your email inbox open in the granted
browser, the wallet extension). The autopilot collects whatever you leave blank as specific
questions at intake, reads the full contract back once, **locks it on your single confirmation**,
and then runs every contracted pipeline step hands-off — the only mid-run interruptions are hard
stops (a never-floor item, an identity mismatch, a capability gap). Field meanings, consent
doctrine, and the never-consentable floor: `references/campaign-contract.md`.

**Session settings — set these before you paste** (values: `references/model-routing.md`
§Seat settings): tier `top` → Claude Code default alias `opus` · effort `high`.
- **Claude Code Desktop:** model picker in the row under the prompt box → `opus`; **Effort** in
  the same picker → `high` — or type `/model opus`, then `/effort high`, as your
  first two messages.
- **Claude Code CLI:** `claude --model opus --effort high` (or `/model opus` + `/effort high`).
- Set both explicitly in every new session — a fresh session otherwise starts at its model's
  default.
- A campaign that overrides the binding records it in the tollgate report's Routing section — use
  that alias instead.

## Where it sits

```
Autopilot = guide mode with the handovers performed for you: one session runs
0a extract → 0 idea-forge → 1 architect → 2 build → 2.5 demo video → 3 gates + submission,
each step a fresh subagent (Step 2 inline), every consent pre-collected and locked up front.
```

---

```
SESSION SETTINGS: tier top · effort high (references/model-routing.md §Seat settings). Start by
stating the exact model id you are running as. If it is below this campaign's top-tier binding,
warn me and wait for my go before anything else.

You are running AUTOPILOT for this campaign. Load and follow autopilot/SKILL.md and
references/campaign-contract.md. Collect the blanks below at intake with specific derived
questions (batches of ≤4), read the full contract back to me once, LOCK it on my confirmation,
commit it, then run every contracted step hands-off. Stop only for hard stops.

HACKATHON: [name + primary URL(s): rules/handbook, tracks page]

STEPS: [default all: 0a, 0, 1, 2, 2.5, 3 — strike any]

GOAL / TARGET TRACKS: [≤3 tracks, or "idea-forge decides within contract"]

RISK APPETITE: [novel-wow | safe-feasible | "recommend one"]

BUDGET: [$0 (default — free tiers/faucets/testnet only, paid-resource ideas knocked out) |
funds-allowed: <cap + purposes> (paid resources may be PLANNED; every payment moment still pauses
for me — you never pay)]

SKILLS / STACK PREFERENCES: [e.g. Solidity/DeFi, TypeScript/React — or leave blank]

REPO: [owner/name if one exists — or "create it" per references/repo-bootstrap.md]

DEMO VIDEO: [on (default) | off · VOICE/LENGTH/MUSIC/WALLET-ON-CAMERA — blank = demo-studio
defaults]

WATCH POLICY: [pause-for-watch | auto-publish-after-qc — you WILL be asked if blank; publishing
without my eyes is my explicit call]

UPLOAD: [authorized (unlisted YouTube default) + you verify at intake WHICH account the connected
Chrome is logged into and bind it into the contract | manual]

SUBMISSION: [authorized — submit from the connected Chrome; verify at intake WHICH platform
account it is logged in as, name it in the contract, and re-verify that identity right before the
submit (mismatch = hard stop, never a re-login) | manual]

GATE PRE-CONSENTS (each in or out): [burner-wallet creation · wallet-extension install · faucet
claims · provider signups/API keys (CAPTCHA + email-OTP inline) · testnet deploys with the burner
key · repo-public flip · recording session (takes over my desktop foreground, do-not-disturb)]

ACCESS GRANTED TO THIS SESSION: [chrome browser tools · computer-use/device · email inbox (open in
the granted browser) · wallet extension — list what you're granting]

FALLBACK POLICY: [stop-and-wait (default) | safe-substitute-and-log]

NOTIFY ME: [in-session (always) + push notification when available | other]

ROUTING: [auto (default — per-spawn model/effort per references/model-routing.md: seat settings,
tier bindings, effort floors) | pin all to <model alias> | per-tier override, e.g. top=<alias>,
standard=<alias>]
```

---

## Notes on using it

- **Grant access BEFORE the intake finishes.** The tollgate (plus row 17 — whether subagents can
  reach this session's tools) probes everything at boot, and the intake's identity reads need the
  browser: the autopilot verifies **which accounts** the connected Chrome is logged into (platform,
  YouTube) and names them in the contract — that's how you always know which account submits.
- **The lock is real.** After your one confirmation the autopilot never re-asks, never broadens a
  consent, and answers subagent questions only from the contract. You can amend anytime by just
  telling it — amendments are committed contract revisions. It never solicits them.
- **The floor can't be consented away:** mainnet, real funds, your main wallet, payment/KYC,
  credential entry, secrets in artifacts, and the rest of the floor list in
  `references/campaign-contract.md` §Never-consentable floor — hard stops regardless of what the
  contract says.
- **Hard stops are the only interruptions.** It updates the runsheet with the exact blocker,
  notifies you, and waits. Your message resumes it.
- **Resumable.** Contract, runsheet, tollgate report, and gate ledger are committed state — a
  restarted session re-boots from the repo and continues; you only re-grant the session-scoped
  access.
- **First campaign?** Consider guide mode instead (`prompts/INVOKE_GUIDE.md`) — same pipeline with
  approval touchpoints between steps; autopilot is for a pipeline that has earned your trust.
