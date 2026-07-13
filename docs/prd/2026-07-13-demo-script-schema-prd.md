# PRD — Locked demo-script schema: one deterministic call sheet for every campaign

**Date:** 2026-07-13 · **Status:** implementation contract, pre-execution · **Owner seat:** demo-studio
**Ships as:** `references/demo-script-schema.md` (new) + scoped edits to demo-studio, its kickoff, the
guide, the autopilot, and the kit README.

## 1. Problem

The demo script is the campaign's single most human-facing artifact, and today its structure is one
sentence: demo-studio Stage 1 specifies a scene table (eight columns) and nothing else. Everything
around the shot list — what must be set up *before* recording, the narration as something a human can
actually read aloud, where the edit decisions live, what QC found, what got published where — is
invented fresh per campaign. Consequences:

- Project 1's script and project 99's script don't read the same. The user cannot open an arbitrary
  campaign's `docs/demo/*-demo-script.md` and know where anything is.
- The autopilot's Stage-1 conformance review has no deterministic anchor beyond the scene table — it
  can check judging-weight allocation but has nothing locked to check the rest of the production
  against.
- A resumed session can't tell from the artifact how far the demo got (scripted? recorded? QC'd?
  published?) without forensic reading.
- The "record it yourself" path (`demo-studio/SKILL.md` §When NOT to use) hands the user a shot list
  but no pre-flight checklist and no readable narration sheet — the two things a human recording
  their own demo needs most.

## 2. Goal

One locked schema, versioned `v1`, at `references/demo-script-schema.md`. Every demo script the kit
produces — interactive or autopilot, project 1 or project 99 — has byte-identical structure: the same
nine sections in the same order with the same headings and the same table columns. Reading it
top-to-bottom **is** producing the video: what to prove, what to set up, what to shoot, what to say,
how to cut it, what to check, where to publish, and how far it's gotten. Deterministic for machines
(locked headings + locked columns + an append-only status ledger = a mechanical conformance check and
trivial resume), readable for humans (a film-production call sheet, not a config dump).

## 3. The schema (normative)

The generated artifact keeps its path and name: `docs/demo/<YYYY-MM-DD>-demo-script.md` in the
project repo. Line 1 is the stamp `<!-- demo-script-schema: v1 -->`. Then nine `##` sections,
headings verbatim, order locked:

### `## 0 — Production card`

A two-column `field | value` table, rows locked: **Project**, **Event**, **Target length** (the
LENGTH kickoff field), **Resolution / fps**, **Voice** (VOICE field), **Music** (MUSIC field),
**Wallet on camera** (WALLET-ON-CAMERA field), **Upload target** (UPLOAD field — account *name*
only), **Schema** (`v1`). The card is the kickoff fields made durable — a fresh session reads the
production settings here, not from a lost prompt. No status row here; §8 is the status authority.

### `## 1 — Story & time budget`

- One sentence: **what the video must prove** (the brief's money shot restated as a claim a judge can
  verify by watching).
- **Money shot:** the scene id that carries it.
- The **judging-weight table**, columns locked: `criterion | weight | seconds`. Criteria and weights
  quoted from the pack's `event.md`; the seconds column allocates the target length across them and
  **must sum to the target**. This makes Stage 1's "allocate scene seconds by the judging weights"
  visible and checkable instead of implicit.

### `## 2 — Pre-flight — set up before recording`

The answer to "what do I set up prior to recording." A table, columns locked:
`# | item | how to verify | ✓`. Exactly **seven rows**, item classes locked:

1. **App running** — the exact start command(s) and the URL(s)/routes that must respond.
2. **Demo data** — seeded fixtures, accounts, and state the scenes assume exist.
3. **Wallet state** — burner **public** address, network, balance the scenes need, extension
   unlocked. (Wallet scenes off → `N/A` with reason.)
4. **Browser hygiene** — clean profile, 1920×1080 viewport, 100% zoom, no bookmarks bar, no stray
   extension popups.
5. **Desktop hygiene** — notifications / focus-assist off; **no secret reachable on screen** (.env
   closed, terminals cleared); monitor arrangement noted.
6. **Capture toolchain** — the tollgate session card's rows are green (cite the report; never
   re-probe here).
7. **Assets** — title-card text, logo path, outro QR / repo URL, music track file (MUSIC on only).

A class that doesn't apply is marked `N/A` + reason — **rows are never deleted**, so every script
always has the same seven rows in the same order. The `✓` column is filled at record time (Stage 3
start), not at script time.

### `## 3 — Shot list`

The scene table, columns locked (nine):
`id | seconds | visual (route/action/window) | narration cue | driver | wallet verbs | gate assertion | retakes | take`

- `narration cue` — the scene id plus the first ~3 words of the scene's §4 line, ellipsed. An
  **anchor, not a source**: the full text lives only in §4.
- `driver` ∈ `screencast | gfxcapture | ddagrab`; `wallet verbs` abstract
  (`connect / approveTx / switchNetwork`); `retakes` = budget, default 3 — all unchanged from the
  current Stage-1 spec.
- `take` — **new**: filled during capture with the final take number, or `BLOCKED` when the scene
  degraded to a placeholder card. The capture record lives in the shot list itself.
- Rule: the `seconds` column sums to §1's target **within ±10%**.

### `## 4 — Narration script`

**The single source of narration text.** One block per scene, in scene order: the scene id, the
exact words to speak, the word count, the planned seconds at the planning rate, a tone note, and a
**pronunciation gloss** for project names / tickers / API names (the words TTS and humans both
mangle). Rules:

- Planning rate: **~2.4 words/second** (conversational demo pace). It is a *writing budget* only —
  authoritative timing at build is audio-first via the engine
  (`references/demo-stack.md`'s `computeDuration()` path), never this constant.
- Word count per scene must fit the scene's §3 seconds at the planning rate (±20% — narration
  breathes; the assembly is audio-first anyway).
- Editing the words means updating the word count and the §3 cue **in the same edit** — the
  single-source rule.
- When the user records their own voice, this section *is* the narration sheet: numbered, exact,
  glossed — readable at a glance mid-take.

### `## 5 — Assembly plan`

Composition order (title card → scenes by id → outro), the transition rule (default: hard cuts;
anything else named per scene pair), captions (on, word-timed; one style line), music
(`off` | track name + ducking rule per `references/music-kit.md`), loudness target −14 LUFS, export
target (1080p h264). All *mechanics* — exact commands, versions, snippets — by pointer to
`references/demo-stack.md`, never restated (its freshness rule stays the single authority on pins).

### `## 6 — QC record`

A table, columns locked: `check | scene(s) | pass/fail | note`. Check rows locked, mirroring Stage
6: money shot visible · text legible at 1080p · captions present + synced · no capture yellow border
· **no secret / no address that shouldn't be on screen** (hard fail) · per-scene duration within
budget · total duration within ±10% · audio present, loudness sane. Filled at Stage 6; re-render
iterations **append** corrected rows rather than overwriting (the bounded-loop history stays
legible); residual imperfections carry forward into the Stage-7 watch.

### `## 7 — Publish block`

`field | value` table, rows locked: **Upload target + account** (name only — the identity line),
**Title**, **Description** (with an explicit music-attribution slot), **Tags**, **Visibility**
(default unlisted), **URL**, **Verified logged-out** (date), **Resolves** (fixed value:
`submission-draft demo video URL`). Title/description/tags are drafted at Stage 1 — publish copy is
script, not an afterthought — so the approval covers them. URL and verification rows stay `TBD`
until Stage 8 fills them.

### `## 8 — Status ledger`

Append-only, columns `date | event | by`. Event vocabulary locked:
`scripted · approved · pre-flight verified · recorded (n/N scenes[, BLOCKED: ids]) · assembled ·
QC passed [residuals: …] · watched | delegated-review passed · uploaded (URL) · superseded-edit
(what changed)`. `approved` names its approver (the user, or the autopilot's conformance review).
A fresh session reads the last row and knows exactly where the demo stands — resume without
forensics.

### Determinism rules (normative, stated in the schema file)

1. Headings verbatim, order locked, none added, removed, or renamed. Event-specific extras go
   *inside* existing sections, never as new headings.
2. Locked tables keep their exact column sets; inapplicable cells are `N/A`, never dropped columns
   or deleted locked rows.
3. The stamp `<!-- demo-script-schema: v1 -->` is line 1 of the file.
4. **One script per campaign**, created once at Stage 1 and extended thereafter — the same
   extend-never-fork rule as the gate ledger and the tollgate report. A material re-script after
   approval is an in-place edit + a `superseded-edit` ledger row + a fresh approval, never a second
   file.
5. **Conformance check** (documented in the schema file as a copyable one-liner): extract the
   file's `^## ` lines and compare to the nine locked headings, exact and in order. This is the
   mechanical half of any script approval — human/autopilot judgment is the other half.
6. No secrets — env-var names and public identifiers only (a burner's public address is fine), per
   `references/conventions.md` §Safety.

The schema file ends with a **copyable skeleton** — the stamp, all nine headings, every locked
table's header row, and one italicized example row each — so Stage 1 starts by copying it, never by
reconstructing structure from prose.

## 4. Fill order — who writes which section, when

| Section | Written at | Filled/updated at |
|---|---|---|
| 0, 1, 2 (items + how-to-verify), 3 (all but `take`), 4, 5, 7 (title/description/tags) | Stage 1 (script) | — |
| 2 `✓` column | — | Stage 3 start (pre-flight verification) |
| 3 `take` column | — | Stage 3, per scene |
| 6 | — | Stage 6 (QC loop) |
| 7 URL + verified rows | — | Stage 8 (upload) |
| 8 | Stage 1 (`scripted`) | every stage appends |

The Stage-1 approval therefore covers the **whole production** — pre-flight plan, shot list,
narration, assembly intent, publish copy — not just the scenes. In an autopilot campaign the
conformance review checks contract fields (length, money shot, judging-weight allocation) **plus**
schema conformance (determinism rule 5).

## 5. Change map (the implementation contract — these files, exactly)

1. **NEW `references/demo-script-schema.md`** — everything in §3, the fill-order table, and the
   closing skeleton. Tone and density match the kit's reference files.
2. **`demo-studio/SKILL.md`** —
   - Boot paragraph: add the schema to the must-read references.
   - Stage 1: the artifact sentence delegates structure to the schema (copy the skeleton; fill §§0–5
     and §7's copy rows; §8 `scripted` row); the inline eight-column list is replaced by the
     schema's shot-list columns (narration moves to §4, cue anchors in §3); the judging-weight
     allocation now lands in §1's table; the approval sentence covers the whole script; the
     autopilot clause gains schema conformance.
   - Stage 3: verify §2 and tick `✓` before the first take; record the `take` column per scene.
   - Stage 4: "each scene's narration line" → the scene's §4 text.
   - Stage 6: findings recorded in §6.
   - Stage 7: residuals surfaced *from §6*.
   - Stage 8: fill §7's URL/verified rows; ledger evidence unchanged; §8 rows append throughout.
   - §When NOT to use, last bullet: the stopped-at-Stage-1 script is "a usable pre-flight checklist,
     shot list, and narration sheet on its own."
3. **`prompts/INVOKE_DEMO_STUDIO.md`** — step 2 cites the schema (copy skeleton → fill → commit →
   approval); the "Script first" note gains the call-sheet framing.
4. **`guide/SKILL.md`** — the Step 2.5 pipeline-table row's output cell cites the locked schema.
5. **`autopilot/SKILL.md`** — the demo-script approval sentence gains "contract conformance plus the
   schema's locked-headings check (`../references/demo-script-schema.md`)".
6. **`README.md`** — the repo tree gains the new reference file; the demo-studio/reference blurb
   gains one clause.

Untouched by design: `references/demo-stack.md` (pins stay there; the schema points),
`references/repo-bootstrap.md` (artifact path unchanged), `references/tollgate.md`,
`references/campaign-contract.md` (fields 9/10/12 semantics unchanged — the schema records them,
it doesn't redefine them).

## 6. Non-goals

- No new tooling, dependencies, or probes. No change to capture/assembly mechanics.
- No new consents and no change to the two existing ones or the WATCH policy — the schema *records*
  the production; the SKILL still governs it.
- No retroactive migration of any existing campaign's script.
- Schema evolution only by PRD: structural change bumps `v1` → `v2` with a new contract.

## 7. Decided defaults (creativity items the user delegated)

- **Call-sheet framing** — the schema reads as a production call sheet: card → prep → shots → sides
  → edit → dailies-check → release → log.
- **Narration single-sourced in §4** with cue anchors in §3 — a table cell is unreadable as a
  narration sheet, and two copies of the words is drift by construction.
- **2.4 words/second planning rate**, engine-authoritative timing at build; ±20% per-scene word
  fit; ±10% total-duration rule.
- **Seven locked pre-flight classes**, `N/A`-never-delete — constant shape beats minimal length.
- **`take` column in the shot list** — capture evidence lives where the plan lives.
- **Publish copy drafted at Stage 1** — the approval covers what the world will read.
- **Append-only §8 ledger** with a locked event vocabulary — resume by reading one row.
- **Embedded skeleton** — structure is copied, never reconstructed.
