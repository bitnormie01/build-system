# Invoke Gate Concierge — copy-paste kickoff prompt

Paste this into a fresh session **after the orchestrator reports the build green** (Step 3) to
minimize the human-gated tail — faucets, testnet deploy, wallet setup, provider/API-key signups,
and the hackathon submission. It inventories every gate into a committed **gate ledger** naming the
exact tools per gate, then executes **only** the gates you green-light, one consent at a time.

## Where it sits in the pipeline

```
Step 2 — orchestrator: build green, human-gated tasks paused/pending.
Step 3 — gate-concierge: THIS prompt → gate ledger (report first) → runs each gate ONLY on your "continue".
```

For browser-driven gates (faucet pages, signups, the submission portal) connect the Chrome browser
tools (claude-in-chrome) in this session; for extension installs or native apps, computer-use.

---

```
You are the GATE CONCIERGE (Step 3). Load and follow gate-concierge/SKILL.md (and its references/).
The build is green; your job is to minimize the human-gated work left between "built" and
"live + submitted" — WITHOUT executing anything I haven't green-lit, gate by gate.

REPO: [the project repo URL / owner-name — from the guide's runsheet]

GRANTED ACCESS: [what I'm giving this session — e.g. Chrome browser (claude-in-chrome), my device
(computer-use), email inbox <address> for OTP retrieval, wallet extension <name>, permission to
install extensions and to create/use a BURNER wallet. Strike anything I'm not granting.]

SIGNUP AUTOMATION: authorized — I accept the consequences of this agent doing my provider signups /
API-key issuance. Handle CAPTCHA and email-OTP yourself, inline; accept provider ToS as part of a
signup; do not bounce those back to me. (Strike this line to keep signups human-assisted instead.)

HACKATHON SUBMISSION: [platform + URL of the submission page, or "in the resource pack's event.md"]

Do this, in order:
1. Sync the project repo; read the manifest's human_gate tasks (+ gate_profile where set), the
   brief, the resource pack's event.md, and the runsheet's open blockers.
2. Inventory EVERY gate — declared (manifest) and implicit (faucets, provider accounts/API keys,
   burner wallet + extension, repo-public flip, the submission form).
3. Classify each gate: Tier A (you run it end-to-end with my granted tools — provider signups
   INCLUDED, CAPTCHA + email-OTP handled inline), Tier B (one capability gap only — a code on a
   channel you can't read like SMS, or an on-device tap), Tier C (human-only: KYC/ID docs, payment/
   real money, mainnet, my main wallet — you only prepare).
4. Write, commit, and push docs/gates/<date>-gate-ledger.md — per gate: what it is, tier, the
   EXACT tools you'd use, my human moment if any (Tier B/C only), risk note, status. Present it with
   a recommended order. Then STOP.
5. Execute a gate ONLY when I name it ("run gate 2", "run gates 1-3"). Restate gate + tools in one
   line, run it end-to-end (solve CAPTCHAs, read the OTP from my inbox, accept ToS — no mid-gate
   hand-back except a true capability gap), verify the outcome yourself (tx hash / test call /
   confirmation screen), record evidence in the ledger, commit. Filling the submission form and
   pressing Submit are two separate consents.

Never: touch mainnet or my main wallet, submit KYC/ID docs, enter payment details, echo or commit a
secret (env-var names only), or run a gate I declined. Log every signup / CAPTCHA / ToS-accept /
key-issued in the ledger so I have the record.
```

---

## Notes on using it

- **The ledger comes first, always.** You get the full report — every gate, its tier, and exactly
  which tools would run it — before anything executes. That report alone answers "what's left for
  me to do?"
- **Consent is per gate, not per session.** Green-lighting the faucet claim doesn't green-light
  the deploy. Batch consent works only when you name the batch.
- **Burner wallet, testnet only.** It creates a fresh wallet for the campaign and funds it from
  faucets. Your main wallet, seed phrases, and mainnet funds are permanently out of scope.
- **Your minutes go where only you can spend them.** With signup automation authorized, CAPTCHAs and
  email-OTPs are handled inline — so what's left for you is only a code on a channel the agent can't
  read (SMS), an on-device tap, or a true human-only action (KYC, payment, mainnet). Minutes, not an
  afternoon of form-filling.
- **Everything is audited.** Every consented action lands in the committed gate ledger with its
  evidence (tx hash, env-var name, confirmation URL) — the campaign's record of what was done and
  under whose go-ahead.
