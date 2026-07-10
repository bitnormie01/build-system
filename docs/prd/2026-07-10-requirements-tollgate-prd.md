# PRD — Requirements Tollgate (campaign-start capability checker at Step 0a)

- **Status:** approved by the user 2026-07-10; **implemented in the same session** — this document
  is the implementation contract written *before* execution (per the user's standing rule: detailed
  PRD first, then build exactly to it) and remains the design record after.
- **Problem owner's words:** "it checks whether it has all required access/plugins/mcp
  installed/enabled already to ensure it doesn't get hit road mid-execution due some missing
  plugins" — at the start of building, at Step 0a.
- **Target:** this build-system kit. **Implementer:** this session; any future session re-reading
  this file must honor §0.

## 0. How to use this PRD (implementing agent, read first)

1. Read this file end-to-end, then: `guide/SKILL.md`, `resource-extractor/SKILL.md`,
   `architect/SKILL.md` (Stage 4), `orchestrator/SKILL.md` (Boot), `demo-studio/SKILL.md`,
   `gate-concierge/SKILL.md`, `references/repo-bootstrap.md`, `references/demo-stack.md`, and the
   INVOKE prompts named in §7. The tollgate touches every seat's boot; edits that ignore a seat's
   existing preflight text will duplicate or contradict it.
2. Kit conventions apply: dense doctrinal voice, `../references/<file>` relative paths from skill
   dirs, commit and push to `main`, `Co-Authored-By: Claude` trailer.
3. **No live research pass is required for this feature** — it introduces **zero new external
   dependencies**. Every probe reuses tools and pins already recorded in the kit
   (`references/demo-stack.md` for the demo toolchain, `repo-bootstrap.md` for gh/git). If an
   implementer later adds a probe for a NEW external tool, that probe's facts must be live-verified
   first, same as any pin.
4. **Quality loop (proportionate):** after all edits, run an adversarial review — at minimum two
   independent reviewer agents (PRD-coverage + cross-file consistency/mechanics), findings verified
   before fixing. Fix every confirmed finding before the commit.
5. Scope: build §2–§7. §11 is deferred.

## 1. Problem and goals

Pipeline steps run in fresh sessions on real machine capabilities: the extractor needs the Chrome
browser tools, repo creation needs a logged-in `gh`, the build needs the project's compilers, the
demo needs ffmpeg/Node/Python, the concierge needs browser + inbox + wallet access. Today each
skill carries scattered preflight hints, but nothing **verifies the whole campaign's requirements
up front** — so a missing MCP or toolchain surfaces as a mid-execution roadblock: the extractor
stares at spinner pages, the orchestrator's first `forge build` dies on a machine without Foundry,
the demo-studio discovers ffmpeg lacks `gfxcapture` after the script was approved. The mastermind
taxonomy even names "missing toolchain" as a known failure class — it's currently caught at
failure time, not before.

**Goals:**

- **G1 — One campaign tollgate at the start (Step 0a):** the first pipeline session probes every
  requirement the planned campaign will need — machine tools, MCPs/plugins, accounts/access —
  and commits a PASS/FAIL report with a fix hint per failure, before any real work starts.
- **G2 — No mid-execution surprises:** requirements that only exist per-session (MCP connections
  don't survive the kit's fresh-session discipline) are re-probed by each step at ITS boot via a
  small per-step card; requirements that only become known mid-pipeline (the project's build
  stack, chosen by the architect) are appended to the report and probed before the build starts.
- **G3 — Checker, not fixer:** the tollgate probes and reports; it never installs, logs in, or
  grants itself anything. Fixes route to the user (logins, installs) or to consented concierge
  gates (extension installs) — consistent with every consent rule in the kit.

**Non-goals:** auto-installing missing tools; a daemon that continuously monitors; network
uptime monitoring; probing requirements of steps the campaign will skip.

## 2. Design — two layers plus a late-binding third

The kit's session model forces the shape. A single check at Step 0a cannot be sufficient alone,
because (a) MCP connections are per-session and later steps boot in fresh sessions, and (b) the
project's build toolchain isn't known until the architect picks the stack. So:

1. **Campaign tollgate (runs once, at Step 0a — G1).** New **Stage 0** of `resource-extractor`:
   before scoping any source, probe the full matrix (§3) for every step the campaign plans to run
   (the guide's strategy names them; if unknown, probe all). Write, commit, and push
   `docs/tollgate/<YYYY-MM-DD>-tollgate.md` to the **project repo**. Verdict per step:
   **CLEAR** or **BLOCKED (failing rows + fixes)**. The extractor hard-stops only on its OWN
   failing hard rows (it can't extract without them); other steps' failures are reported for the
   guide/user to fix before those steps are green-lit.
   **Skip-0a path:** when the campaign skips Step 0a, the **guide** runs the campaign tollgate
   itself at campaign boot — probing is preflight (which the guide already owns), not performing
   a pipeline step, so this does not breach "prepare, review, unblock — never perform."
2. **Session preflight card (every step, at its boot — G2a).** Each step session, before its
   Stage/Step 1, re-probes **its own rows** of the matrix — a sub-minute check. On a hard-row
   FAIL: stop, report the row + fix hint, wait; never start the step's real work degraded unless
   the row's class says a fallback exists. On PASS: proceed silently (no commit needed; update
   the report only when a row's result changed).
3. **Stack rows (appended by the architect, probed before the build — G2b).** At Stage 4 the
   architect knows the project's toolchain (each plan's Tech Stack header). It appends a **Stack
   requirements** section to the tollgate report — one row per required CLI/runtime with an exact
   probe (e.g. `forge --version`, `sui --version`, `pnpm --version`) and the pinned version the
   plans assume — and commits it with the spec/plans/manifest. The **orchestrator's boot** probes
   these rows before dispatching any task; a failing row is an environment blocker fixed NOW, not
   a mid-build "flake" three tasks in. The guide re-checks them before green-lighting Step 2.

## 3. The requirements matrix (kit-static part — lives in `references/tollgate.md`)

Classes: **hard** = the named step will fail without it — stop and fix before that step runs;
**degraded** = a documented fallback exists — proceed, note it in the report; **conditional** =
required only when the named option is in play (probe only if it is).

*(Table corrected post-review to match the shipped `references/tollgate.md`: the original draft
merged the Class and Needed-by cells on rows 2 and 5–16, and three probes were not executable as
written — row 1 used `&&` (absent in PowerShell 5.1), row 3's probe included a `pull` (a write),
and row 15's `setx` read-back was impossible (setx doesn't touch the current session's env; read
via `reg query HKCU\Environment`, remove via `reg delete`). The authoritative matrix is
`references/tollgate.md`; the row numbering and semantics below are unchanged.)*

| # | Requirement | Class | Needed by | Probe (non-destructive) | Fix hint |
|---|---|---|---|---|---|
| 1 | git installed, identity set | hard | all | `git --version`, then `git config user.email` (two commands, both exit 0) | install git / `git config --global user.email …` |
| 2 | `gh` installed + logged in | hard for repo-creating seats; degraded after | guide, 0a, 0, 1 (hard); later steps (degraded) | `gh auth status` | `gh auth login` (user runs it — never handle a token) |
| 3 | kit checkout present + synced | hard | all | `git -C <kit> rev-parse HEAD`, then `fetch` + compare vs `origin/main` (pull is the fix, not the probe) | clone `build-system`, pull to re-sync |
| 4 | project repo resolved or creatable | hard | all | `REPO:` field set, or #2 passes so it can be created | `repo-bootstrap.md` |
| 5 | claude-in-chrome MCP responding **in this session** | hard | 0a, 3; 2.5 (browser scenes) | call one trivial browser tool (e.g. tabs context); error/absent = FAIL | connect the Chrome extension in THIS session |
| 6 | computer-use granted | conditional | 2.5 (recording, native scenes); 3 (extension install) | one trivial call (e.g. list granted apps) | grant access when prompted |
| 7 | email inbox reachable | conditional | 3 (signup automation on) | open the inbox in the granted browser session | user logs in once in Chrome |
| 8 | wallet extension present or installable; burner-wallet permission | conditional | 2.5 (wallet scenes); 3 (wallet gates) | extension visible in the browser profile, or #6 passes for install | install = a consented concierge gate |
| 9 | Node ≥20 + npm | hard | 2.5; 2 when the stack is JS/TS (else see stack rows) | `node --version` | install Node LTS |
| 10 | ffmpeg ≥8.1, `gfxcapture` compiled in, hw-encoder identified | hard | 2.5 | `ffmpeg -version` (≥8.1) + the two preflight probes in `demo-stack.md` §Canonical commands | `winget install Gyan.FFmpeg`; ddagrab-crop / hwdownload fallbacks |
| 11 | Python 3.10–3.12 reachable | degraded (Kokoro → edge-tts fallback) | 2.5 | `py -0p` or `uv python list` shows a 3.10–3.12 | `uv python install 3.12` |
| 12 | elevenlabs-mcp available | conditional | 2.5 (VOICE=ElevenLabs) | tool present in session | `uvx elevenlabs-mcp` + key via concierge gate |
| 13 | Chrome logged into the upload account (YouTube) | conditional | 2.5 (UPLOAD authorized) | check the logged-in session via browser tools | user logs in once |
| 14 | event portal reachable | degraded | 0a | fetch the event URL | retry; user pastes gated content (record as a pack gap if persistent) |
| 15 | cross-session env store writable | degraded | 3 (preflight secrets) | `setx TOLLGATE_PROBE 1`, `reg query HKCU\Environment /v TOLLGATE_PROBE`, then `reg delete … /f` | fix permissions; fall back to git-ignored `.env` |
| 16 | ~2 GB free disk for renders/captures | degraded | 2.5 | free-space check on the workspace drive | free space |

Row semantics the reference must state: probes are **read-only** (the single `setx` probe writes
one throwaway variable and removes it); a `conditional` row is probed only when its option is in
play (kickoff fields say so); "needed by" uses the step numbers 0a/0/1/2/2.5/3; the matrix is
doctrine — a campaign may add rows (e.g. a sponsor-specific CLI) in its own report, but never
weakens a class.

## 4. The report — `docs/tollgate/<YYYY-MM-DD>-tollgate.md` (project repo)

One per campaign (extend, never fork — same one-file rule as the gate ledger). Sections:

1. **Header** — campaign/event, date, machine (hostname/OS one-liner), steps planned (from the
   guide's strategy; "all" if unknown).
2. **Matrix results** — the §3 table plus columns `Result (PASS/FAIL/N-A)` and `Checked (date +
   which session)`. `N-A` = conditional row whose option is off, or a step the campaign skips.
3. **Stack requirements** *(appended by the architect at Stage 4)* — per required CLI/runtime:
   name, version the plans assume, probe command, result (probed at orchestrator boot), fix hint.
4. **Verdict per step** — `0a: CLEAR`, `2: BLOCKED — row 9 (node missing)`, … The guide reads
   this block; **no kickoff is handed over for a step whose hard rows FAIL.**

Updates: whichever session observes a change (a fixed row, a newly failing one) updates the row's
result + checked-stamp and commits — the report is live campaign state, like the runsheet.

## 5. Seat wiring (who does what)

- **resource-extractor** — gains **Stage 0 — Campaign tollgate**: run §2.1, commit the report,
  hard-stop on its own failing hard rows (browser tools, repo), report the rest and continue.
- **guide** — boot: read `docs/tollgate/*` (a missing report on a skip-0a campaign → run the
  campaign tollgate itself, §2.1); strategy/green-light rule: never hand over a kickoff whose
  step is BLOCKED; before Step 2: re-check stack rows; runsheet gains a **Tollgate** line
  (report path + per-step verdicts); helpdesk gains a "tool missing mid-run" row (stale card →
  re-probe, fix, resume).
- **architect** — Stage 4: append the Stack requirements section (§2.3) and commit it with the
  system. Only when a tollgate report exists (campaign builds); skip silently otherwise.
- **orchestrator** — boot: probe the report's stack rows (and row 9) before dispatching anything;
  a FAIL is an environment blocker to surface now — do not power into the first task and let it
  die as a pseudo-flake.
- **demo-studio / gate-concierge** — boot: run their session preflight card (§2.2) before their
  Stage 1; the demo-studio card is rows 5–6, 8–13, 16 (the `demo-stack.md` probes plus
  browser/device access, the wallet extension when wallet scenes are on, and disk — corrected
  post-review: the draft's "5/6/13/16" omitted row 8 despite wallet-on-camera being the 2.5
  default); the concierge card = rows 5–8, 15 — verify each GRANTED ACCESS item actually responds
  before inventorying gates.
- **idea-forge** — no edit: its only requirements are rows 1–4, already enforced by its existing
  boot (sync the project repo) and covered by the campaign tollgate. The PRD records this
  deliberately so a future sweep doesn't "helpfully" add redundant text.

## 6. Quality invariants (the review's checklist)

1. Checker, not fixer: no probe installs, logs in, grants, or mutates anything (sole exception:
   the named throwaway `setx` probe, removed after).
2. Consent rules untouched: fixes that need consent route to the user or existing concierge
   gates; the tollgate never becomes a backdoor for auto-setup.
3. Fresh-session honesty: session-scoped rows (MCPs) are NEVER marked PASS for a future session —
   the campaign report records them as "passed in session X; re-probe per session card."
4. One report per campaign, extend-don't-fork; committed to the **project repo** (never the kit).
5. The matrix's probes reuse existing pins (`demo-stack.md`) — no new external facts introduced
   without live verification.
6. Guide still never performs pipeline steps — running probes is preflight, and the PRD says so
   explicitly where the skip-0a path is defined.
7. Existing seats' doctrine untouched except the §7-named integration points; single-project
   campaigns and non-hackathon builds behave as before when no tollgate report exists.

## 7. File-by-file change map

| File | Change |
|---|---|
| `references/tollgate.md` | **new** — the matrix (§3), classes, probe rules, report format (§4), the two-layer + stack-rows protocol (§2), skip-0a rule |
| `resource-extractor/SKILL.md` | new **Stage 0 — Campaign tollgate** before Stage 1; description gains the trigger phrase |
| `guide/SKILL.md` | boot item (read/produce the report), green-light rule, Before-Step-2 stack re-check line, runsheet **Tollgate** line, helpdesk row |
| `architect/SKILL.md` | Stage 4 bullet: append Stack requirements to the report |
| `orchestrator/SKILL.md` | boot: probe stack rows before dispatch (extend the "plan looks buildable" item) |
| `demo-studio/SKILL.md` | one line at boot: run the session preflight card |
| `gate-concierge/SKILL.md` | one line at Stage 1: verify GRANTED ACCESS items respond (the session card) |
| `prompts/INVOKE_RESOURCE_EXTRACTOR.md` | Stage-0 instruction line |
| `prompts/INVOKE_GUIDE.md` | note: tollgate report is checked/produced at boot |
| `prompts/INVOKE_ORCHESTRATOR.md` | step-1 addition: probe stack rows |
| `prompts/INVOKE_DEMO_STUDIO.md` / `prompts/INVOKE_GATE_CONCIERGE.md` | one session-card line each |
| `README.md` | files-tree line + one pipeline sentence |
| `prompts/INVOKE_IDEA_FORGE.md`, `prompts/INVOKE_ARCHITECT.md` | **no change** (rows 1–4 already enforced at their boots) — verify, don't assume |

Stale-text hotspots to sweep: the guide's existing scattered preflight bullets (Before 0a / 2 /
2.5 / 3) must **cite the matrix**, not restate their own ad-hoc lists (drift risk); the
mastermind/orchestrator "missing toolchain = flake" taxonomy stays valid but the orchestrator's
boot now catches it earlier — don't delete the taxonomy entry.

## 8. Acceptance criteria

- Running Stage 0 on this machine produces a committed report where every §3 row is probed or
  N-A, with correct verdicts (this machine: rows 1–4, 9–11 PASS per prior verification; 5–8,
  12–13 session/conditional).
- A simulated missing tool (probe a deliberately wrong binary name) yields FAIL + fix hint + a
  BLOCKED verdict for the dependent step — and the guide doctrine refuses that step's kickoff.
- The skip-0a path produces the same report via the guide.
- The architect's Stage 4 on a campaign build appends stack rows; the orchestrator's boot probes
  them and surfaces a failure before any dispatch (no first-task pseudo-flake).
- No probe mutated machine state (except the named setx probe, removed).

## 9. Implementation order

1. `references/tollgate.md` → 2. resource-extractor Stage 0 → 3. guide wiring → 4. architect +
orchestrator → 5. demo-studio + concierge one-liners → 6. INVOKE prompts + README → 7. stale-text
sweep → 8. adversarial review (§0.4) → 9. fix confirmed findings → 10. commit PRD-then-impl to
`main` (PRD committed first, per the user's PRD-before-execution rule).

## 10. Open questions — defaults set (user overrides any)

1. Report auto-fix? **No** — checker only (G3); revisit after one real campaign.
2. Probe network reachability of every sponsor site at 0a? **No** — only the main event portal
   (row 14); sponsor fetch failures are extraction gaps, already handled by INDEX.md's gap notes.
3. Disk threshold? **~2 GB** default (row 16) — the only render-heavy step is 2.5.

## 11. Deferred (do NOT build)

A machine-readable tollgate (JSON) for the external-pool kernel to consume; auto-remediation
scripts; scheduled re-probes (cron); portfolio-mode fan-out (one report per project repo + a
fleet roll-up — activates with the portfolio PRD, one line there when built).
