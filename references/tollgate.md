# Requirements Tollgate — verify every capability BEFORE it can block a step

Pipeline steps run in fresh sessions on real machine capabilities — browser MCPs, `gh` auth,
compilers, ffmpeg, inbox access. A missing one surfaces as a mid-execution roadblock: spinner pages
at Step 0a, a dead `forge build` three tasks into Step 2, a demo script approved before discovering
ffmpeg lacks `gfxcapture`. This file is the protocol that catches all of it **up front**: what to
probe, when, who probes it, and the report everything reads. Design record:
`../docs/prd/2026-07-10-requirements-tollgate-prd.md`.

## Three layers (the kit's session model forces this shape)

1. **Campaign tollgate — once, at the campaign's first pipeline session.** Normally Step 0a: the
   resource-extractor's **Stage 0** probes the full matrix below for every step the campaign plans
   to run (the guide's strategy names them; unknown → probe all), then writes, commits, and pushes
   the report (format below) to the **project repo**. When the campaign **skips Step 0a**, the
   **guide** runs this layer itself — once its strategy fixes the step list and the project repo
   exists, and always before handing over the first kickoff. Probing is preflight, which the guide
   already owns; it is not performing a pipeline step.
2. **Session preflight card — every step, at its own boot.** MCP connections and granted access are
   **per-session**: a browser tool that responded at Step 0a proves nothing about the fresh session
   Step 3 boots in. So before its Stage/Step 1, every step session re-probes **its own rows**
   (the "Needed by" column) — a sub-minute check. Hard-row FAIL → stop, report the row + fix hint,
   wait. Degraded-row FAIL → proceed on the documented fallback, note it. PASS → proceed silently.
   **Where the cards live:** explicit cards are wired only where session-scoped rows (5–8, 12)
   apply — 0a (Stage 0 covers it), 2.5, and 3. Steps 0 and 1 need only rows 1–4, which their
   existing boot (sync the project repo) already enforces; Step 2's card is the stack rows + row 9,
   probed at the orchestrator's boot. That is by design, not an omission.
3. **Stack rows — appended by the architect, probed before the build.** The project's toolchain is
   unknown until the architect picks it. At Stage 4 the architect appends a **Stack requirements**
   section to the report — one row per CLI/runtime the plans assume (from each plan's Tech Stack
   header), with an exact probe and the pinned version. The **orchestrator's boot** probes these
   before dispatching anything; the guide re-checks them before green-lighting Step 2. A failing
   stack row is an environment blocker fixed *now* — not a first-task failure misdiagnosed as a
   flake (the mastermind taxonomy's "missing toolchain" class still exists; this catches it
   pre-build).

## Classes

- **hard** — the named step will fail without it. Fix before that step runs; the guide hands over
  no kickoff for a step whose hard rows FAIL.
- **degraded** — a documented fallback exists. Proceed, record the fallback in the report.
- **conditional** — required only when the named option is in play (kickoff fields say which);
  probe only then, else mark `N-A`. **At Stage 0 the deciding kickoffs (2.5, 3) aren't filled yet**,
  so probe every conditional row whose option's kit default is ON (signup automation,
  wallet-on-camera, YouTube upload) unless the guide's strategy already struck it; the per-step
  session card re-decides later from the actual kickoff fields.

## The matrix (kit-static)

Steps: 0a extractor · 0 idea-forge · 1 architect · 2 orchestrator · 2.5 demo-studio · 3 concierge.

| # | Requirement | Class | Needed by | Probe (non-destructive) | Fix hint |
|---|---|---|---|---|---|
| 1 | git installed, identity set | hard | all | `git --version`, then `git config user.email` — both exit 0 (run as two commands; PowerShell 5.1 has no `&&`) | install git; `git config --global user.email …` |
| 2 | `gh` installed + logged in | hard for repo-creating seats; degraded after | guide, 0a, 0, 1 (hard); later steps (degraded) | `gh auth status` | user runs `gh auth login` — never ask for or handle a token |
| 3 | kit checkout present + synced | hard | all | `git -C <kit> rev-parse HEAD`, then `git -C <kit> fetch` and compare against `origin/main` (read-only; pulling is the fix, not the probe) | clone `build-system`; pull to re-sync |
| 4 | project repo resolved or creatable | hard | all | `REPO:` set, or row 2 passes so it can be created | `repo-bootstrap.md` |
| 5 | claude-in-chrome MCP responding **in this session** | hard | 0a, 3; 2.5 (browser scenes) | call one trivial browser tool (e.g. read the tab context); absent/error = FAIL | connect the Chrome extension in THIS session |
| 6 | computer-use granted | conditional | 2.5 (recording, native scenes); 3 (extension install) | one trivial call (e.g. list granted applications) | grant access when prompted |
| 7 | email inbox reachable | conditional | 3 (signup automation on) | open the inbox in the granted browser session | user logs in once in Chrome |
| 8 | wallet extension present or installable; burner-wallet permission | conditional | 2.5 (wallet scenes); 3 (wallet gates) | extension visible in the browser profile, or row 6 passes so installing is possible | install is a consented concierge gate |
| 9 | Node ≥20 + npm | hard | 2.5; 2 when the stack is JS/TS (else covered by stack rows) | `node --version` | install Node LTS |
| 10 | ffmpeg ≥8.1 + `gfxcapture` compiled in + hw encoder identified | hard | 2.5 | `ffmpeg -version` (≥8.1 pin check) + the two preflight probes in `demo-stack.md` §Canonical commands (`ffmpeg -filters \| findstr gfxcapture`, `ffmpeg -encoders`) | `winget install Gyan.FFmpeg`; ddagrab-crop / hwdownload fallbacks |
| 11 | Python 3.10–3.12 reachable | degraded (Kokoro → edge-tts fallback) | 2.5 | `py -0p` or `uv python list` shows a 3.10–3.12 | `uv python install 3.12` |
| 12 | elevenlabs-mcp available | conditional | 2.5 (VOICE=ElevenLabs) | tool present in the session | `uvx elevenlabs-mcp`; API key via a concierge signup gate |
| 13 | Chrome logged into the upload account (YouTube) | conditional | 2.5 (UPLOAD authorized) | check the logged-in session via the browser tools | user logs in once |
| 14 | event portal reachable | degraded | 0a | fetch the event URL | retry; user pastes gated content (record as a pack gap if persistent) |
| 15 | cross-session env store writable | degraded | 3 (preflight secrets) | `setx TOLLGATE_PROBE 1`, confirm with `reg query HKCU\Environment /v TOLLGATE_PROBE` (setx does NOT touch the current session's env), then remove: `reg delete HKCU\Environment /v TOLLGATE_PROBE /f` | fix permissions; fall back to the project repo's git-ignored `.env` |
| 16 | ~2 GB free disk on the workspace drive | degraded | 2.5 | free-space check | free space before recording/rendering |

**Probe rules:** probes are **read-only** — they install nothing, log into nothing, grant nothing,
accept nothing (the single sanctioned write is row 15's throwaway variable, removed immediately).
A campaign may ADD rows in its own report (a sponsor-specific CLI, an extra MCP) but never weakens
a class. New rows for external tools carry live-verified facts, same as any pin. Session-scoped
rows (5–8, 12) are never marked PASS for a *future* session — the report records "passed in
session X"; every later session re-probes its card.

## The report — `docs/tollgate/<YYYY-MM-DD>-tollgate.md` (project repo)

One per campaign — **extend it, never fork a second** (same rule as the gate ledger). Sections:

1. **Header** — event/campaign, date, machine one-liner (hostname/OS), steps planned.
2. **Matrix results** — the table above plus `Result (PASS / FAIL / N-A)` and `Checked (date +
   session)` columns. `N-A` = conditional option off, or step skipped.
3. **Stack requirements** *(architect-appended at Stage 4)* — per CLI/runtime: name, version the
   plans assume, probe, result (filled at orchestrator boot), fix hint.
4. **Verdict per step** — e.g. `0a: CLEAR · 2: BLOCKED — row 9 (node missing) · 2.5: CLEAR`. The
   guide reads this block; **no kickoff is handed over for a BLOCKED step.**

Whichever session observes a change (a fixed row, a new failure) updates the row + checked-stamp
and commits — the report is live campaign state, like the runsheet.

## Boundaries

- **Checker, not fixer.** Report + fix hints only. Installs, logins, grants, and extension setups
  are the user's or a consented concierge gate's — the tollgate is never a backdoor for auto-setup.
- **Honest results only.** A probe you didn't run is not a PASS; an N-A is not a PASS; stale
  session-scoped results are re-probed, not trusted.
- The report lives in the **project repo**, never the kit checkout.
