# PRD — Autopilot (full-campaign autonomous mode: locked contract → hands-off build → submission)

**Status:** approved implementation contract. Requested by the user 2026-07-10: *"make it complete
autonomous, whole build-system — user defines constraints before asking his agent to build full
project: which steps to run, record demo-video, submit project appropriately to the page (after only
checking the user allowed the Chrome browser it continues with, so he knows which account it is
getting submitted from). If something is not defined/stated, the agent confirms at start, with
specific/derived questions, so it stays on track with the user's plan. One side constraint: $0 or
funds-allowed projects. Then it LOCKS those responses and builds the full project autonomously."*

**Lineage:** this is the **conductor seat** deferred in
`2026-07-06-portfolio-mode-and-fleet-manager-prd.md` §11, built now in single-project form on the
user's explicit request (which supersedes that section's precondition). Two deliberate changes from
the deferred sketch: (1) human moments are not funneled into a mid-run decision queue — they are
**collected, made specific, and locked up front** in a campaign contract; (2) scope is one project,
not a fleet (portfolio autopilot stays deferred, §12).

## 0. How to use this PRD (read first)

1. Read this file end-to-end, then: `README.md`, `references/roles.md`,
   `references/conventions.md` §Safety, `references/tollgate.md`, `guide/SKILL.md`,
   `orchestrator/SKILL.md`, `gate-concierge/SKILL.md`, `demo-studio/SKILL.md`,
   `architect/SKILL.md` Stage 2/4, `idea-forge/SKILL.md` Step 1/3.
2. **No live research fleet is needed.** The feature introduces **zero new external
   dependencies** — it recombines existing seats and existing pins. The single runtime mechanic it
   leans on that is environment-dependent (a subagent's ability to reach the session's MCP tools) is
   handled as a **probe, not an assumption**: tollgate row 17 (§7.6) verifies it at every autopilot
   boot, and §2.4 defines the fallback when it fails. Do not bake either outcome in as fact.
3. **Quality loop (proportionate, same as the tollgate build):** implement all of §8, then run two
   parallel independent adversarial reviewers — one with a **PRD-coverage lens** (every §8 change
   present and faithful), one with a **consistency/mechanics lens** (no contradiction with existing
   doctrine; every consent sentence in modified skills still reads correctly in guide mode; probes
   and commands executable on Windows/PowerShell 5.1). Verify findings, fix confirmed ones,
   re-check mechanically, then commit.
4. Two commits, both to `main`: this PRD first, then the implementation exactly to it.

## 1. Goals and non-goals

- **G1 — One kickoff, zero mid-run questions.** The user pastes `INVOKE_AUTOPILOT.md` into one
  session; the autopilot collects only the *undefined* constraints (specific, derived questions),
  reads the full contract back once, **locks** it, and runs every contracted step to a submitted
  project without asking anything else. The only mid-run interactions are **hard stops** (§6.5).
- **G2 — Every consent is pre-collected or NEVER.** Each consent the kit requires today is either
  enumerated in the locked contract (specific action class, identity-bound where it publishes) or
  sits on the never-consentable floor (§4.3), which no contract can authorize. No consent is
  invented, broadened, or assumed mid-run.
- **G3 — Identity-verified outward actions.** The hackathon submission, the video upload, and the
  repo-public flip execute only after the live logged-in identity in the granted browser matches
  the account named in the contract — the user always knows *which account* acted. Mismatch is a
  hard stop, never a re-login.
- **G4 — Budget is a first-class locked constraint.** `$0` (default) or `funds-allowed <cap>`.
  `$0` propagates to ideation (paid-resource candidates are knocked out), planning (free tiers
  only), and gates (no payment flow is ever opened). `funds-allowed` permits *planning* paid
  resources; the payment moment itself remains human-only forever (§5).
- **G5 — Resumable by construction.** The autopilot's memory is committed artifacts (contract,
  runsheet, tollgate report, gate ledger, batons). A compacted or restarted autopilot session
  re-boots from the synced repo and continues; only session-scoped grants need re-granting.
- **Non-goals:** portfolio/N-project autonomy (the fleet conductor stays deferred); external-pool
  kernel autonomy; scheduled/cron unattended runs; any weakening of the never-floor; replacing the
  guide (interactive mode remains the default for first campaigns).

## 2. The seat and its architecture

### 2.1 What the autopilot is

A **user-side seat** (like the guide, concierge, demo-studio — it holds the map,
`references/roles.md`) that *performs the guide's handovers itself*: it plans the campaign, runs
the intake (§3), locks the contract, then dispatches, verifies, and green-lights every contracted
step — where the guide hands the user a kickoff to paste, the autopilot dispatches that same
kickoff itself and verifies the same baton. It is a **mode**, not a pipeline step: guide mode and
autopilot mode are alternatives over the same pipeline, same artifacts, same doctrine.

### 2.2 One session, fresh contexts

The whole campaign runs inside **one autopilot session** — the session the user granted access to
(Chrome, device, email-in-browser, wallet extension). That solves the kit's per-session-grant
constraint in the only way that keeps full autonomy honest: grants live exactly where the whole
campaign runs. Step isolation survives because each pipeline step is dispatched as a **fresh
subagent** (fresh context = session discipline; the conductor sketch's core idea): the subagent
gets its own kit + the step's kickoff (assembled from the existing `INVOKE_*.md` template + the
contract block, §2.5), does the step, commits/pushes its baton, returns a one-screen summary.
The autopilot **never ingests full artifacts** — it verifies batons by INDEX/headers/spot-checks
(the guide's verification checklists) and keeps its own context lean.

### 2.3 Step execution modes

| Step | Mode | Why |
|---|---|---|
| 0a extract | subagent | context-heavy crawl; MCP reached per row 17 |
| 0 idea-forge | subagent | inputs pre-filled from contract; already non-interactive when pre-supplied |
| 1 architect | subagent, contract-driven dialogue (§2.6) | approval loop runs autopilot⇄subagent |
| preflight gates | subagent (concierge, MODE: preflight) | contract pre-consents name the green-lit classes |
| 2 build | **inline** — the autopilot loads `orchestrator/SKILL.md` and runs it | executors are themselves subagents; only one dispatch level is assumed anywhere in this design |
| 2.5 demo | subagent | needs browser/device via row 17; falls back inline per §2.4 |
| 3 closing + submission | subagent | same |

Running Step 2 inline extends the kit's one documented in-session exception (architect→orchestrator,
`guide/SKILL.md`) — the autopilot already holds the kernel-side duties, so playing the orchestrator
is in-character, and the executor-per-task subagent model is unchanged.

### 2.4 Row-17 fallback

If the boot probe shows subagents cannot reach the session's MCP tools in this runtime, the
MCP-dependent steps (0a, 2.5, 3) run **inline** in the autopilot session instead, same doctrine,
with context triage: prefer inline-late (2.5/3 after the build) only if context allows; otherwise
apply the contract's fallback policy (§3, field 11) — stop and hand the user that one step as a
classic guide-mode kickoff. Degrading one step to manual is a reported limitation, never a silent
skip.

### 2.5 The dispatch block

Every step dispatch prepends a bounded `AUTOPILOT CAMPAIGN` block to the step's normal kickoff:
the contract path + the slice of locked fields that step consumes (its consents, its constraints,
its identity bindings), plus: *"You are running inside an autopilot campaign. The contract's locked
consents stand as the user's answers for the enumerated action classes below; anything your
doctrine gates that is NOT enumerated here → do not do it; return BLOCKED with the exact question
instead."* Subagents cannot converse mid-run — BLOCKED-with-question is the only escalation shape,
and the autopilot answers it only from the locked contract (else it is a hard stop, §6.5).

### 2.6 Contract-driven architect dialogue

The architect's brainstorming stage is a one-question-at-a-time dialogue; a subagent has no dialogue
partner. In autopilot mode the architect answers those questions **from the locked contract and the
brief**, recording each as a `Design decisions` section in the spec (question → answer → source:
contract field / brief field / derived). The **hard design-approval gate survives** but the approver
changes: the subagent returns the design summary; the **autopilot reviews it for contract
conformance** (tracks, budget, must-have demo features, out-of-scope respected) and approves or
re-dispatches with concrete corrections — bounded at **2 rework loops**, then hard stop. The same
pattern approves the demo script (Stage 1 of 2.5). Rubber-stamping is forbidden: the autopilot's
approval must cite the contract fields it checked.

## 3. The campaign contract (the locked instrument)

Schema and doctrine live in **`references/campaign-contract.md`** (new); the instance is committed
at **`docs/autopilot/<YYYY-MM-DD>-campaign-contract.md`** in the **project repo**. Fields — each
with class **must-ask** (never silently defaulted) or **defaultable** (default applies unless
overridden; still shown in the read-back):

| # | Field | Class | Default / notes |
|---|---|---|---|
| 1 | Event — name + rules/tracks URLs | must-ask | — |
| 2 | Steps to run | defaultable | all of 0a·0·1·2·2.5·3; strike per guide strategy doctrine |
| 3 | Goal + target tracks (≤3) | defaultable | "idea-forge decides within contract" |
| 4 | Risk appetite | defaultable | recommend per guide doctrine; user picks |
| 5 | **Budget** | must-ask (default offered: `$0`) | `$0` \| `funds-allowed: <cap + purposes>` (§5) |
| 6 | Builder skills / stack preferences | defaultable | from memory/kickoff if present |
| 7 | Repo | defaultable | existing `owner/name` \| create per `repo-bootstrap.md` |
| 8 | Demo video: on/off + VOICE·LENGTH·MUSIC·WALLET-ON-CAMERA | defaultable | demo-studio's existing defaults |
| 9 | **WATCH policy** | must-ask | `pause-for-watch` \| `auto-publish-after-qc` (autopilot adds its own independent frame/audio review before publish; user watches the unlisted link after) |
| 10 | **UPLOAD authorization + account identity** | must-ask when 2.5 on | platform (YouTube unlisted default) + the logged-in account, read live at intake and named in the contract |
| 11 | **SUBMISSION authorization + account identity** | must-ask | *"submit from the connected Chrome, logged into <platform> as `<identity read live at intake>`"* — this is the user's requested account-visibility check, done once, up front, bound into the lock |
| 12 | Gate pre-consents | must-ask (checklist) | burner-wallet creation · faucet claims · provider signups/API keys (= SIGNUP AUTOMATION, CAPTCHA + email-OTP inline) · testnet deploys with the burner key · repo-public flip · recording session (foreground DND window) — each individually in or out |
| 13 | Access manifest | must-ask | which grants this session actually has (browser, device, inbox-in-browser, wallet extension) — cross-checked against the tollgate |
| 14 | Fallback policy | must-ask | `stop-and-wait` (default) \| `safe-substitute-and-log` (autopilot may make the closest contract-conformant substitution and log it in the runsheet) |
| 15 | Hard-stop notification | defaultable | in-session + the environment's push/notification tool when available |

**Intake protocol:** ingest the kickoff's filled fields → derive what's derivable (from the kickoff,
memory, and a live identity read of the connected browser for fields 10–11) → ask **only the gaps**,
in batches of ≤4, each question specific and derived (name the event, the platform, the account —
never generic "any preferences?") → read the **entire contract back once** (defaults included) →
on the user's single confirmation, **stamp it LOCKED** (datetime), commit, push.

**Lock semantics:** locked answers are never re-asked, never reinterpreted, never broadened. Every
seat treats the contract as the user's standing voice for exactly what it enumerates. **Amendments
are user-initiated only** — a user message mid-run amends the contract as a committed revision
(logged, with affected-step handling); the autopilot never solicits amendments and never treats its
own convenience as grounds for one.

## 4. Consent doctrine (the crux)

### 4.1 Three consent forms

`references/campaign-contract.md` §Consent defines, kit-wide:

1. **Interactive per-gate** — guide mode; the existing default everywhere. Unchanged.
2. **Contract pre-consent** — autopilot mode only. Valid **only** when: given at intake with the
   action class named specifically (field 12's checklist, fields 9–11's authorizations), locked,
   committed, and — for outward publishes — bound to a named account identity. A pre-consent covers
   its class for the whole campaign (that is its purpose); execution still logs each act in the gate
   ledger with evidence, exactly as a concierge gate.
3. **NEVER** — the floor (§4.3). No contract wording can authorize these.

`references/conventions.md` §Safety gains the third valid form of "a human runs them": *the user
pre-consents in a locked campaign contract (autopilot mode), which enumerates the gate classes; the
autopilot executes those under the same evidence/ledger rules the concierge follows.* The existing
sentence "consent never carries from one gate to the next" is scoped to interactive mode; in
autopilot mode consent carries **exactly as far as the locked enumeration and no further**.

### 4.2 Identity-verification protocol (fields 10–11)

At intake: navigate the granted browser to the platform, read the logged-in identity, name it in
the contract ("submitting as X on Devfolio", "uploading as Y on YouTube"). At execution time
(upload / submission / repo-flip): **re-read the live identity first**; match → proceed silently
(that IS the user's requested check — pre-authorized, account-visible); mismatch or logged-out →
hard stop with what was found. Never log in, never switch accounts, never proceed on a guess.

### 4.3 The never-consentable floor

Regardless of contract: mainnet; real funds; the user's main wallet/seed; payment cards / KYC /
identity documents; `gh auth login` or any credential entry on the user's behalf; secrets in any
repo/frame/ledger (env-var names + public identifiers only); deleting or force-pushing repos;
publishing from any account other than the contract-named one; exceeding a locked `$0` budget.
These stay Tier-C / forbidden exactly as today — autopilot changes who *clicks*, never what is
*clickable*.

## 5. Budget doctrine ($0 | funds-allowed)

- **`$0` (default):** idea-forge's buildability gate gains a knockout — *a candidate whose real
  demo requires any paid resource (paid API tier, paid RPC, paid dataset, paid hosting) is out*;
  the architect plans free tiers only (constraint in the spec header); the concierge/autopilot
  never opens a payment flow (already Tier C — now also never *planned*).
- **`funds-allowed: <cap + purposes>`:** paid resources may be *planned*; every payment moment is
  still a **human-only pause** (floor, §4.3) — the cap is planning information and a stop-trigger
  (a plan whose paid assumptions exceed the cap is a contract-conformance failure at §2.6 review),
  never spending authority. "Funds-allowed" means the user will unlock named payment pauses, not
  that the agent pays.

## 6. The run loop

1. **Boot.** Sync (or create per contract field 7) the project repo; load or run intake (§3);
   run the **campaign tollgate** (full matrix + row 17) as this campaign's first pipeline session —
   in autopilot mode the tollgate's session-scoped rows stay valid campaign-long because the
   session persists (the design's core win; `references/tollgate.md` gets the note, §7.6). Commit
   report + contract + runsheet (guide format, `docs/guide/…-runsheet.md` — interoperable: a guide
   session opened later reads the same state).
2. **Per contracted step, in pipeline order:** assemble the kickoff (INVOKE template + §2.5 block)
   → dispatch per §2.3 → **verify the baton with the guide's checklist for that step** (pack INDEX
   gaps + spot-checked weights; brief fields + the calendar-fit call; spec/plans/manifest validation
   + human-gate coverage + submission draft + stack rows; green build money shot; script/video QC;
   ledger evidence) → record verdict in the runsheet → next. A failed verification re-dispatches
   with concrete corrections (bounded: 2 per step), then hard-stops.
3. **Calendar-fit remediation** (after Step 0): doesn't fit → re-run idea-forge once with tighter
   inputs (`safe-feasible`, fewer tracks — the guide's documented remediation, now performed);
   still doesn't fit → hard stop.
4. **Human-gated tasks in Step 2** (inline orchestration): a task is executed by the autopilot
   in its concierge capacity **iff** its class is enumerated in field 12 (e.g. testnet deploy with
   the burner key) — restated in one line, executed with granted tooling, evidence into the ledger.
   Class not enumerated → the task pauses (hard stop). The pipeline (executor subagents) still
   never runs a gated step — the user-side seat does, on the locked consent.
5. **Hard stops.** Triggered by: a floor item (§4.3); an identity mismatch (§4.2); a capability gap
   (SMS-OTP, on-device tap); a contract-impossible situation under `stop-and-wait`; loop bounds
   exhausted (§2.6, §6.2); budget conflict (§5). Behavior: update runsheet + notify (field 15) +
   wait in-session. Resuming is the user's message; the autopilot never times out into a riskier
   path.
6. **Finish.** Verify the submission confirmation (screenshot evidence in the ledger), close the
   runsheet (links: repo, deployed addresses, video URL, submission confirmation), notify, report:
   what ran, every verdict, every consented act with evidence, everything parked.

## 7. File-by-file change map

New files:
1. **`references/campaign-contract.md`** — contract schema (§3 table), intake protocol, lock/amend
   semantics, the three consent forms + floor (§4), identity protocol (§4.2), budget doctrine (§5),
   dispatch-block shape (§2.5). The shared structure every seat cites.
2. **`autopilot/SKILL.md`** — the seat: what it is (§2.1), announce line, boot + intake, the run
   loop (§6), execution-mode table (§2.3), row-17 fallback (§2.4), architect/script approval
   protocol (§2.6), hard-stop protocol, resumability, boundaries (performs handovers and contracted
   gates; never weakens a gate, never answers beyond the contract, never touches the floor), when
   NOT to use it (first-ever campaign → guide mode recommended; user wants approval touchpoints).
3. **`prompts/INVOKE_AUTOPILOT.md`** — kickoff with every §3 field as a fillable line ("leave blank
   and I'll ask at intake"), the lock warning, and notes (grants to give the session up front;
   what hard stops look like; resumability).

Modified:
4. **`references/conventions.md`** — §Safety: the third valid form (§4.1), scoping of
   "consent never carries", pointer to `campaign-contract.md`.
5. **`references/roles.md`** — autopilot added to the user-side seats list (top note + §kernel
   parenthetical), one paragraph on the mode (one session, subagent steps, inline Step 2).
6. **`references/tollgate.md`** — **row 17**: subagent-MCP-reach, conditional (autopilot campaigns
   only), probe = dispatch a trivial subagent that calls one browser tool and reports; fix hint =
   §2.4 fallback. Plus an autopilot note in layer 2: in an autopilot campaign the session persists,
   so session-scoped rows probed at autopilot boot remain valid campaign-long; re-probe before each
   browser-heavy dispatch (5 seconds) and after any reconnect.
7. **`architect/SKILL.md`** — autopilot-mode clause (§2.6): contract-driven dialogue, `Design
   decisions` spec section, approval via the dispatch loop; Stage 2's hard gate wording gains the
   mode-aware sentence.
8. **`orchestrator/SKILL.md`** — one note: in autopilot campaigns this doctrine runs inline in the
   autopilot session; human-gate handling per §6.4 (contract-enumerated classes execute as
   concierge-capacity acts, everything else pauses).
9. **`gate-concierge/SKILL.md`** — autopilot-mode clause: the locked contract's field-12 checklist
   stands as the per-gate green-lights for enumerated classes ("Consent per gate" invariant gains
   the mode-aware sentence); ledger/evidence discipline unchanged; submission gate cites §4.2
   identity re-verification; Tier C untouched.
10. **`demo-studio/SKILL.md`** — autopilot-mode clause: recording consent + UPLOAD from the
    contract; WATCH per field 9 (auto-publish path adds the autopilot's independent review; the
    watch-gate sentence "not automatable" becomes mode-aware: in autopilot it is *delegable by
    locked contract*, never silently skipped); script approval per §2.6; upload identity per §4.2.
11. **`idea-forge/SKILL.md`** — Step 1: contract satisfies the five inputs (confirm-and-proceed
    path already exists); Step 3 buildability gate: the `$0` knockout (§5).
12. **`resource-extractor/SKILL.md`** — Stage 0: when a campaign tollgate report already exists
    (guide skip-0a path or an autopilot boot), verify + extend it, don't re-create.
13. **`guide/SKILL.md`** — strategy section: offer autopilot mode for hands-off campaigns (with the
    honest tradeoff: approval touchpoints move into the contract); helpdesk row: "autopilot
    hard-stopped" → read runsheet + contract, fix the named blocker, tell it to resume.
14. **`prompts/INVOKE_GUIDE.md`** — one line naming the autopilot alternative.
15. **`README.md`** — Two-ways-to-run gains the mode ("Three ways"? keep: guide-driven and
    autopilot as the two *user modes* over the same pipeline + the external-pool config); tree
    lines for the three new files; one paragraph.

## 8. Quality invariants (reviewers check these)

- Guide-mode text is never weakened: every modified consent sentence must still read as the default
  interactive rule, with the autopilot clause explicitly scoped ("in an autopilot campaign …").
- The floor (§4.3) appears verbatim-equivalent in `campaign-contract.md` and is cited (not
  restated divergently) by modified seats.
- No new self-triggers: the autopilot starts only on `INVOKE_AUTOPILOT.md` / the user's explicit
  ask; demo-studio and concierge subagents still run only when the autopilot dispatches them under
  a contract, never on state conditions.
- Every probe/command added is Windows/PowerShell-5.1-executable (no `&&`, no bash-isms).
- All new/modified cross-references resolve (`../references/campaign-contract.md` from skill dirs).
- The contract instance, runsheet, tollgate report, and ledger all live in the **project repo**.
- Report-before-action survives: the intake read-back is the report; the contract commit precedes
  the first dispatch.

## 9. Acceptance (mechanical where possible)

1. All 15 §7 changes present; grep checks: `campaign-contract` cited from every modified seat;
   `row 17` in tollgate + autopilot; `Design decisions` in architect; `$0` knockout in idea-forge;
   third-form sentence in conventions; `AUTOPILOT CAMPAIGN` block defined once (reference) and
   cited elsewhere.
2. Tollgate matrix still mechanically clean (6 columns, 0 malformed rows — rerun the cell-count
   check) with row 17 added.
3. A dry read-through of `INVOKE_AUTOPILOT.md` → `autopilot/SKILL.md` covers: missing-field intake,
   lock, dispatch of each step per §2.3, both §6.4 branches, §4.2 mismatch → hard stop, §2.4
   fallback.
4. Adversarial review run, findings verified, confirmed ones fixed (§0.3).

## 10. Implementation order

1. `references/campaign-contract.md` (foundation — everything cites it)
2. `autopilot/SKILL.md` + `prompts/INVOKE_AUTOPILOT.md`
3. `conventions.md` + `roles.md` + `tollgate.md` (doctrine ground)
4. Seat clauses: architect, orchestrator, gate-concierge, demo-studio, idea-forge,
   resource-extractor
5. guide + INVOKE_GUIDE + README
6. §0.3 review → fix → §9 checks → one implementation commit, push.

## 11. Open-question defaults (decided here; change only if the user objects)

1. Seat name: **autopilot** (mode, not a numbered step).
2. Contract path: `docs/autopilot/<date>-campaign-contract.md`; runsheet stays in guide format/path.
3. WATCH default is **asked, never defaulted** (field 9 is must-ask) — publishing without human
   eyes is a real decision the user makes explicitly, once.
4. Step 2 runs inline (no nested dispatch assumed anywhere).
5. Recording's foreground-DND takeover is pre-consented via field 12 with an intake warning naming
   it; the autopilot announces it in the runsheet before dispatching 2.5 (courtesy, not consent).

## 12. Deferred (do not build)

Portfolio/fleet autopilot (N projects); scheduled unattended re-runs; an SMS-OTP channel;
standing-consent *profiles* reusable across campaigns (each campaign's contract is fresh —
cross-campaign consent reuse is a different trust surface, decide separately).
