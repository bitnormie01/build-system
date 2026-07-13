# Demo-script schema (v1) — one call sheet, every campaign

Every demo script this kit produces follows this schema, so project 1's script and project 99's read
identically: the same nine sections, same order, same headings, same table columns. It is a
film-production **call sheet** crossed with a kit runbook — reading it top-to-bottom *is* producing
the video: what to prove (§1), what to set up (§2), what to shoot (§3), what to say (§4), how to cut
it (§5), what to check (§6), where it publishes (§7), and how far it's gotten (§8). Deterministic for
machines — locked headings and columns make conformance a mechanical check, and the status ledger
makes resume a one-row read — and readable for the human who has to record, narrate, or approve it.

The `demo-studio` seat (Step 2.5) writes and maintains the script per this schema
(`../demo-studio/SKILL.md` — Stage 1 writes it, later stages fill their sections). Design record:
`../docs/prd/2026-07-13-demo-script-schema-prd.md`.

## The artifact

- **Path:** `docs/demo/<YYYY-MM-DD>-demo-script.md` in the **project repo**
  (`repo-bootstrap.md`).
- **Line 1** is the stamp `<!-- demo-script-schema: v1 -->`; a `# <Project> — demo script` title
  line follows it (the title is convention, not part of the locked check).
- **One script per campaign** — created once at Stage 1, extended thereafter: the same
  extend-never-fork rule as the gate ledger and the tollgate report. A material re-script after
  approval is an in-place edit + a `superseded-edit` ledger row (§8) + a fresh approval — never a
  second file.

## The nine sections

### `## 0 — Production card`

A two-column `field | value` table, rows locked: **Project**, **Event**, **Target length** (the
kickoff's LENGTH), **Resolution / fps**, **Voice** (VOICE), **Music** (MUSIC), **Wallet on camera**
(WALLET-ON-CAMERA), **Upload target** (UPLOAD — account *name* only, never a credential), **Schema**
(`v1`). The kickoff fields made durable — a fresh session reads the production settings here, not
from a lost prompt. No status row: §8 is the status authority.

### `## 1 — Story & time budget`

One sentence — **what the video must prove**: the brief's money shot restated as a claim a judge can
verify by watching. Then **Money shot:** the scene id that carries it. Then the judging-weight
table, columns locked `criterion | weight | seconds` — criteria and weights **quoted from the pack's
`event.md`**, the seconds column allocating the target length across them and **summing to the
target**. This is Stage 1's "allocate scene seconds by the judging weights" made visible and
checkable instead of implicit.

### `## 2 — Pre-flight — set up before recording`

Everything that must be true *before* the first take, as a table `# | item | how to verify | ✓` with
exactly **seven rows**, item classes locked:

1. **App running** — exact start command(s) + the URL(s)/routes that must respond.
2. **Demo data** — seeded fixtures, accounts, and state the scenes assume exist.
3. **Wallet state** — burner **public** address, network, balance the scenes need, extension
   unlocked. (No wallet scenes → `N/A` + reason.)
4. **Browser hygiene** — clean profile, 1920×1080 viewport, 100% zoom, no bookmarks bar, no stray
   extension popups.
5. **Desktop hygiene** — notifications / focus-assist off; **no secret reachable on screen** (`.env`
   files closed, terminals cleared); monitor arrangement noted.
6. **Capture toolchain** — the tollgate session card's rows are green (cite the report,
   `tollgate.md` — never re-probe here).
7. **Assets** — title-card text, logo path, outro QR / repo URL, music track file (MUSIC on only).

An inapplicable class is `N/A` + reason — **rows are never deleted**, so every script has the same
seven rows in the same order. The `✓` column is filled at record time (Stage 3 start), not script
time.

### `## 3 — Shot list`

The scene table, columns locked (nine):

`id | seconds | visual (route/action/window) | narration cue | driver | wallet verbs | gate assertion | retakes | take`

- `narration cue` — the scene id + the first ~3 words of the scene's §4 line, ellipsed. An
  **anchor, not a source**: the words live only in §4.
- `driver` ∈ `screencast | gfxcapture | ddagrab` (`demo-stack.md`).
- `wallet verbs` — abstract (`connect / approveTx / switchNetwork`).
- `retakes` — the retake budget, default 3.
- `take` — filled during capture: the final take number, or `BLOCKED` when the scene degraded to a
  placeholder card. The capture record lives in the shot list itself.
- **Rule:** the `seconds` column sums to §1's target **within ±10%**.

### `## 4 — Narration script`

**The single source of narration text.** One block per scene, in scene order: the scene id, the
exact words to speak, the word count, the planned seconds at the planning rate, a tone note, and a
**pronunciation gloss** for project names / tickers / API names — the words TTS engines and humans
both mangle.

- Planning rate: **~2.4 words/second** (conversational demo pace). A *writing budget* only —
  authoritative timing at build is audio-first via the engine (`demo-stack.md`'s
  `computeDuration()` path), never this constant.
- Per-scene word count fits the scene's §3 seconds at the planning rate, ±20% — narration breathes,
  and assembly is audio-first anyway.
- Editing the words means updating the word count and the §3 cue **in the same edit** — the
  single-source rule.
- When the user records their own voice, this section *is* the narration sheet: numbered, exact,
  glossed, readable at a glance mid-take.

### `## 5 — Assembly plan`

Composition order (title card → scenes by id → outro), the transition rule (default: hard cuts;
anything else named per scene pair), captions (on, word-timed; one style line), music (`off` | track
name per `music-kit.md`; ducking rule per `demo-stack.md`), loudness target **−14 LUFS**, export
target (1080p h264).
All *mechanics* — exact commands, versions, snippets — by pointer to `demo-stack.md`, never
restated: its freshness rule stays the single authority on pins.

### `## 6 — QC record`

A table `check | scene(s) | pass/fail | note`, check rows locked (mirroring Stage 6): money shot
visible · text legible at 1080p · captions present + synced · no capture yellow border · **no secret
/ no address that shouldn't be on screen** (hard fail) · per-scene duration within budget · total
duration within ±10% · audio present, loudness sane. Filled at Stage 6; re-render iterations
**append** corrected rows rather than overwriting — the bounded-loop history stays legible — and
residual imperfections carry forward into the Stage-7 watch.

### `## 7 — Publish block`

A `field | value` table, rows locked: **Upload target + account** (name only — the identity line),
**Title**, **Description** (with an explicit music-attribution slot), **Tags**, **Visibility**
(default unlisted), **URL**, **Verified logged-out** (date), **Resolves** (fixed value:
`submission-draft demo video URL`). Title/description/tags are drafted at Stage 1 — publish copy is
script, not an afterthought, so the approval covers what the world will read. URL and verification
rows stay `TBD` until Stage 8 fills them.

### `## 8 — Status ledger`

Append-only, columns `date | event | by`. Event vocabulary locked:

`scripted · approved · pre-flight verified · recorded (n/N scenes[, BLOCKED: ids]) · assembled ·
QC passed [residuals: …] · watched | delegated-review passed · uploaded (URL) · superseded-edit
(what changed)`

`approved` names its approver — the user, or the autopilot's conformance review. A fresh session
reads the last row and knows exactly where the demo stands: resume without forensics.

## Determinism rules

1. **Headings verbatim, order locked** — none added, removed, or renamed. Event-specific extras go
   *inside* existing sections, never as new headings.
2. **Locked tables keep their exact column sets**; inapplicable cells are `N/A`, never dropped
   columns or deleted locked rows.
3. The stamp `<!-- demo-script-schema: v1 -->` is **line 1** of the file.
4. **One script per campaign, extend-never-fork** (see *The artifact* above).
5. **Conformance check** — the copyable check below (§Conformance check): the file's `## ` lines
   must equal the nine locked headings, exact and in order — the mechanical half of any approval.
6. **No secrets** — env-var names and public identifiers only (a burner's public address is fine),
   per `conventions.md` §Safety.

Structural change to this schema happens only by PRD, bumping the version (`v1` → `v2`).

## Fill order — who writes which section, when

| Section | Written at | Filled/updated at |
|---|---|---|
| 0, 1, 2 (items + how-to-verify), 3 (all but `take`), 4, 5, 7 (title/description/tags) | Stage 1 (script) | — |
| 2 `✓` column | — | Stage 3 start (pre-flight verification) |
| 3 `take` column | — | Stage 3, per scene |
| 6 | — | Stage 6 (QC loop) |
| 7 URL + verified rows | — | Stage 8 (upload) |
| 8 | Stage 1 (`scripted` row) | stages append their locked vocabulary rows as they land |

The Stage-1 approval therefore covers the **whole production** — pre-flight plan, shot list,
narration, assembly intent, publish copy — not just the scenes.

## Conformance check (mechanical half of any approval)

Compare the file's `##` lines to the nine locked headings, exact and in order — PowerShell:

```powershell
$want = '## 0 — Production card','## 1 — Story & time budget',
        '## 2 — Pre-flight — set up before recording','## 3 — Shot list','## 4 — Narration script',
        '## 5 — Assembly plan','## 6 — QC record','## 7 — Publish block','## 8 — Status ledger'
$got = (Get-Content docs/demo/*-demo-script.md -Encoding UTF8) -match '^## '
if ((Compare-Object $want $got -SyncWindow 0) -or
    ((Get-Content docs/demo/*-demo-script.md -TotalCount 1 -Encoding UTF8) -ne '<!-- demo-script-schema: v1 -->'))
    { 'FAIL' } else { 'PASS' }
```

(`-Encoding UTF8` is load-bearing: Windows PowerShell 5.1 reads BOM-less UTF-8 as ANSI, the em-dash
headings mojibake, and a fully conforming script false-FAILs.)

Human/autopilot judgment — money shot right, weights honored, narration true — is the other half;
this check only proves the structure.

## Skeleton (copy this to start — never reconstruct structure from prose)

```markdown
<!-- demo-script-schema: v1 -->
# <Project> — demo script

## 0 — Production card

| field | value |
|---|---|
| Project | <name> |
| Event | <event> |
| Target length | <m:ss> |
| Resolution / fps | 1920×1080 @ 30 |
| Voice | Kokoro |
| Music | off |
| Wallet on camera | dappwright |
| Upload target | unlisted YouTube — <account name> |
| Schema | v1 |

## 1 — Story & time budget

Prove: <one sentence a judge can verify by watching>
Money shot: scene <id>.

| criterion | weight | seconds |
|---|---|---|
| *working demo* | *50%* | *90* |

## 2 — Pre-flight — set up before recording

| # | item | how to verify | ✓ |
|---|---|---|---|
| 1 | App running — *<start command>* | *<url responds>* | |
| 2 | Demo data — *<fixtures/state>* | *<check>* | |
| 3 | Wallet state — *<burner public addr · network · balance>* | *<check>* | |
| 4 | Browser hygiene — clean profile, 1920×1080, 100% zoom | *<check>* | |
| 5 | Desktop hygiene — notifications off, no secret on screen | *<check>* | |
| 6 | Capture toolchain — tollgate card green | *<report path>* | |
| 7 | Assets — title card, logo, outro QR, music file | *<paths>* | |

## 3 — Shot list

| id | seconds | visual (route/action/window) | narration cue | driver | wallet verbs | gate assertion | retakes | take |
|---|---|---|---|---|---|---|---|---|
| *S1* | *12* | */app — landing, click Try* | *S1 "Every builder knows…"* | *screencast* | *—* | *<final frame shows X>* | *3* | |

## 4 — Narration script

**S1** — <the exact words to speak>
words: <n> · planned: <s>s @ ~2.4 w/s · tone: <note> · gloss: <name → pronunciation>

## 5 — Assembly plan

Order: title card → S1 → … → outro. Transitions: hard cuts. Captions: on, word-timed, <style line>.
Music: off. Loudness: −14 LUFS. Export: 1080p h264. Mechanics: references/demo-stack.md.

## 6 — QC record

| check | scene(s) | pass/fail | note |
|---|---|---|---|
| money shot visible | | | |
| text legible at 1080p | | | |
| captions present + synced | | | |
| no capture yellow border | | | |
| no secret / no address that shouldn't be on screen | | | |
| per-scene duration within budget | | | |
| total duration within ±10% | | | |
| audio present, loudness sane | | | |

## 7 — Publish block

| field | value |
|---|---|
| Upload target + account | <target — account name> |
| Title | <title> |
| Description | <description; music attribution: <slot>> |
| Tags | <tags> |
| Visibility | unlisted |
| URL | TBD |
| Verified logged-out | TBD |
| Resolves | submission-draft demo video URL |

## 8 — Status ledger

| date | event | by |
|---|---|---|
| <date> | scripted | demo-studio |
```
