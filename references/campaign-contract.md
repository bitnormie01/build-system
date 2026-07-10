# Campaign Contract — the locked instrument behind an autopilot campaign

In **autopilot mode** (`../autopilot/SKILL.md`) the user's decisions and consents are collected
ONCE, up front, made specific, read back, and **locked** — then the whole pipeline runs hands-off
against them. This file is the shared structure: the contract schema, the intake protocol, the
lock/amendment semantics, the kit's three consent forms — interactive per-gate, contract
pre-consent, and NEVER (the never-consentable floor) — the identity-verification protocol for
outward publishes, and the budget doctrine. Every seat that
honors a contract cites this file; none restates it divergently. Design record:
`../docs/prd/2026-07-10-autopilot-prd.md`.

The instance lives at **`docs/autopilot/<YYYY-MM-DD>-campaign-contract.md`** in the **project
repo** (never the kit checkout) — one per campaign, committed at lock, amended only by revision
(below).

## The schema

Two field classes. **must-ask** — never silently defaulted; the intake always puts it to the user
(a default may be *offered*, but the user answers). **defaultable** — the named default applies
when the kickoff leaves it blank; it is still shown in the read-back, so the single confirmation
covers it.

| # | Field | Class | Default / notes |
|---|---|---|---|
| 1 | Event — name + rules/tracks URLs | must-ask | — |
| 2 | Steps to run | defaultable | all of 0a·0·1·2·2.5·3; strike per the guide's strategy doctrine (`../guide/SKILL.md` §Strategy) |
| 3 | Goal + target tracks (≤3) | defaultable | "idea-forge decides within contract" |
| 4 | Risk appetite | defaultable | `novel-wow` \| `safe-feasible` — recommend per guide doctrine, user picks |
| 5 | **Budget** | must-ask (offer `$0`) | `$0` \| `funds-allowed: <cap + purposes>` — see §Budget |
| 6 | Builder skills / stack preferences | defaultable | from the kickoff or memory when present |
| 7 | Repo | defaultable | existing `owner/name` \| create per `repo-bootstrap.md` |
| 8 | Demo video on/off + VOICE · LENGTH · MUSIC · WALLET-ON-CAMERA | defaultable | demo-studio's kickoff defaults (`../demo-studio/SKILL.md` §Kickoff inputs) |
| 9 | **WATCH policy** | must-ask | `pause-for-watch` \| `auto-publish-after-qc` (the autopilot adds its own independent frame/audio review before publish; the user watches the unlisted link after) |
| 10 | **UPLOAD authorization + account identity** | must-ask when 2.5 is on | `authorized` — platform (YouTube unlisted default) + the logged-in account, read live at intake and named here — \| `manual` (demo-studio renders and hands over the file; the user uploads and resolves the TBD) |
| 11 | **SUBMISSION authorization + account identity** | must-ask | "submit from the connected Chrome, logged into `<platform>` as `<identity read live at intake>`" — the account-visibility check, done once, bound into the lock |
| 12 | Gate pre-consents (checklist, each individually in or out) | must-ask | burner-wallet creation · wallet-extension install · faucet claims · provider signups / API keys (= SIGNUP AUTOMATION: CAPTCHA + email-OTP inline) · testnet deploys with the burner key · repo-public flip · recording session (a foreground do-not-disturb takeover of the desktop — the intake warning names this plainly) |
| 13 | Access manifest | must-ask | which grants THIS session actually has (browser, device, inbox-in-browser, wallet extension) — cross-checked against the tollgate report |
| 14 | Fallback policy | must-ask | `stop-and-wait` (default) \| `safe-substitute-and-log` (the autopilot may make the closest contract-conformant substitution and log it in the runsheet) |
| 15 | Hard-stop notification | defaultable | in-session + the environment's push/notification tool when available |
| — | **LOCK stamp** | — | datetime + "locked — the autopilot will not re-ask; amendments only by the user, committed as revisions" |

## Intake protocol

1. **Ingest** the kickoff's filled fields (`../prompts/INVOKE_AUTOPILOT.md`).
2. **Derive** what's derivable — from the kickoff, from memory, and from a **live identity read**
   of the connected browser for fields 10–11 (navigate to the platform, read who is logged in;
   never log in, never switch accounts).
3. **Ask only the gaps**, in batches of ≤4, each question specific and derived — name the event,
   the platform, the account, the concrete tradeoff ("publish after QC without your watch, or
   pause for you?") — never a generic "any preferences?".
4. **Read the entire contract back once** — every field, defaults included, identities named.
5. On the user's **single confirmation**: stamp LOCKED, write the instance, commit, push. The
   contract commit precedes the first dispatch — report-before-action, same as the gate ledger.

## Lock and amendment semantics

- Locked answers are never re-asked, never reinterpreted, never broadened. Every seat treats the
  contract as the user's standing voice **for exactly what it enumerates** — an action class the
  checklist leaves out is not consented, however convenient.
- **Amendments are user-initiated only.** A user message mid-run amends the contract as a
  **committed revision** (the change, the datetime, the affected steps and how in-flight work is
  handled — quiesce, re-dispatch, or continue). The autopilot never solicits amendments and never
  treats its own convenience as grounds for one.
- A locked choice that becomes impossible mid-run is handled per **field 14**: `stop-and-wait`
  hard-stops with the exact conflict; `safe-substitute-and-log` substitutes the closest
  contract-conformant option and logs it — and where no safe substitute exists, it hard-stops too.

## Consent — the three forms

1. **Interactive per-gate** — guide mode; the kit-wide default. The user green-lights each gate in
   the moment; consent never carries from one gate to the next
   (`conventions.md` §Safety, `../gate-concierge/SKILL.md`). This form covers both of §Safety's
   interactive execution shapes — the user acting directly, or the concierge on a per-gate
   "continue". Unchanged by this file.
2. **Contract pre-consent** — autopilot mode only. Valid **only** when: given at intake with the
   action class named specifically (field 12's checklist; fields 9–11's authorizations), locked,
   committed, and — for outward publishes — bound to a named account identity. A pre-consent covers
   its class for the whole campaign (that is its purpose); in autopilot mode consent carries
   **exactly as far as the locked enumeration and no further**. Execution still logs each act in
   the gate ledger with evidence, exactly as a consented concierge gate.
3. **NEVER** — the floor below. No contract wording can authorize these.

## Never-consentable floor

Regardless of what any contract says: **mainnet; real funds; the user's main wallet or seed
phrase; payment cards / KYC / identity documents; `gh auth login` or any credential entry on the
user's behalf; secrets in any repo, frame, or ledger (env-var names + public identifiers only);
deleting or force-pushing repos; publishing from any account other than the contract-named one;
exceeding a locked `$0` budget.** These stay Tier-C / forbidden exactly as in interactive mode —
autopilot changes who *clicks*, never what is *clickable*.

## Identity verification (fields 10–11 + the `gh` account)

- **At intake:** read the live logged-in identity for each publish surface and name it in the
  contract — the submission platform and (when 2.5 is on) the upload platform via the granted
  browser; for the repo-public flip, the `gh` account (`gh auth status` names it — the same probe
  as tollgate row 2).
- **At execution** (upload / submission / repo-public flip): **re-read the live identity first**
  (browser session for the platforms; `gh auth status` for the flip). Match → proceed silently —
  that IS the user's account-visibility check, pre-authorized and identity-bound. Mismatch or
  logged-out → **hard stop** reporting exactly what was found. Never log in, never switch
  accounts, never proceed on a guess.

## Budget ($0 | funds-allowed)

- **`$0` (default):** idea-forge's buildability gate gains a knockout — a candidate whose real
  demo requires any paid resource (paid API tier, paid RPC, paid dataset, paid hosting) is out
  (`../idea-forge/SKILL.md` Step 3). The architect plans free tiers only (a spec-header
  constraint). No seat ever opens a payment flow — already floor, now also never *planned*.
- **`funds-allowed: <cap + purposes>`:** paid resources may be **planned**; every payment moment
  is still a **human-only pause** (the floor) — the cap is planning information and a stop-trigger
  (a plan whose paid assumptions exceed the cap fails the autopilot's conformance review), never
  spending authority. "Funds-allowed" means the user will unlock named payment pauses; the agent
  never pays.

## Dispatch block (how a contract reaches a step)

Every autopilot step dispatch prepends a bounded **`AUTOPILOT CAMPAIGN`** block to the step's
normal kickoff (assembled from the step's own `INVOKE_*.md` template): the contract's committed
path + the **slice** of locked fields that step consumes (its consents, its constraints, its
identity bindings), plus this instruction verbatim in spirit:

> You are running inside an autopilot campaign. The contract's locked consents stand as the
> user's answers for the enumerated action classes listed here; anything your doctrine gates that
> is NOT enumerated here → do not do it; return BLOCKED with the exact question instead.

Subagents cannot converse mid-run — **BLOCKED-with-question is the only escalation shape** — and
the autopilot answers a BLOCKED only from the locked contract; a question the contract cannot
answer is a hard stop (or a logged substitution, per field 14).

## Boundaries

- The contract is an instrument of **specific, enumerated, revocable** consent — never a blank
  cheque. If a seat can't point at the contract line that authorizes an act, the act is not
  authorized.
- The contract instance, like every campaign artifact, lives in the **project repo**.
- Contracts are **per-campaign and fresh** — no reuse across campaigns, no standing profiles
  (explicitly deferred; a different trust surface).
