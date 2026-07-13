# PRD — Locked README schema library: every project README from one of eight locked schemas

**Date:** 2026-07-13 · **Status:** implementation contract, pre-execution · **Owner seats:** architect
(picks + plans), executor (writes), gate-concierge (resolves TBDs)
**Ships as:** `references/readme-schemas.md` (new) + scoped edits to the architect, repo-bootstrap,
gate-concierge, and the kit README.

## 1. Problem

The project README is the first thing a judge reads, and it is the least governed artifact in the
kit. Doctrine mentions it exactly once: `repo-bootstrap.md` step 3 commits a *minimal stub*
(one-liner + "built with the build-system pipeline"). Nothing specifies the final README: no seat
owns upgrading the stub, no structure is locked, no gate checks it. Every campaign invents a README
shape — or ships the stub. Project 1's README and project 99's don't read the same, quality is
whatever the executor improvised, and there is no mechanical check an orchestrator gate can run.

## 2. Goal

A library of **eight locked schemas** at `references/readme-schemas.md`. Every kit-built project
README is generated from exactly one of them — chosen by the architect from a decision table, named
in the plan's README task, stamped in the file, and mechanically checkable. All eight share one
**judge-path spine**, so a judge who has navigated one kit README can navigate them all. Exactly
**one** sanctioned deviation exists (the event-mandated overlay, §5); the freeform "this project is
unique" escape is explicitly rejected.

## 3. The shared spine (normative — identical in all eight schemas)

Every schema opens with the same five blocks — the **judge path**: a judge reaches proof in three
scrolls, in any kit-built repo.

1. `# <Project>` — title line + a one-liner (≤ 140 chars). An optional badges line may follow.
2. `## Demo` — the demo video URL, the live/deployed link, and one screenshot or GIF. The section
   is mandatory; asset lines that don't exist yet ride as `TBD-post-build:<what>` (see §7) and
   asset lines that will never exist are simply omitted — never an `N/A` in a judge-facing file.
3. `## What it does` — problem → solution in 3–6 sentences, judge-readable (no jargon wall).
4. `## Quickstart` — the fewest copy-paste commands that show the money shot locally.
5. `## Built at <event>` — event, track(s)/bounties targeted, team, and what was built **during**
   the event (the kit's honesty ethos, stated where judges look for it).

Then the schema-specific **middle** (2–4 locked sections, §4), then the **overlay slot** (§5), then
the shared **tail**:

- `## Roadmap` *(optional)* — known limitations + next steps.
- `## License`

## 4. The eight schemas (normative)

Each schema in `references/readme-schemas.md` carries: id, **pick when** (one line), and its locked
middle-section list in order — with `*(optional)*` markers where a section may be omitted whole.

| id | name | pick when | middle sections (locked order) |
|---|---|---|---|
| R1 | `web-app` | hosted UI / full-stack dApp — the product is what you click | How it works · Tech stack · Run locally (env-var **names** table) · Contract addresses *(optional — on-chain builds)* |
| R2 | `contract-protocol` | the contracts/protocol ARE the product | Contract addresses (network \| address \| explorer) · How it works · Security notes (trust assumptions; "unaudited" stated plainly) · Build & test · Deploy (testnet) |
| R3 | `cli-tool` | CLI / library / SDK / dev tool | Install · Usage (examples first) · Commands / API reference · How it works |
| R4 | `api-service` | backend / API / indexer / oracle | Endpoints · Run it (env-var **names** table) · How it works · Example requests |
| R5 | `agent-ai` | AI agent / LLM app / bot | How the agent works (loop, tools, models used) · Prompts & safety (what it will and won't do) · Run it · Tech stack |
| R6 | `game-interactive` | game / interactive / creative piece | Play it (link + controls) · Screenshots · How it works · Run locally |
| R7 | `data-ml` | data pipeline / ML / analytics | Results (headline numbers first) · Method · Dataset (source + license) · Reproduce |
| R8 | `minimal` | weekend spike; **or any monorepo sub-package README** | How it works (single section; spine + tail otherwise) |

Monorepo rule: the **root** README uses R1–R7 by the product's shape; **per-package** READMEs use
R8. User-provided repo with a real pre-existing README: the README task restructures it **into**
the nearest schema — content preserved, structure locked — it never silently discards the user's
text and never invents a ninth shape.

## 5. The one exception: the event overlay (kept) — and the one rejected

**Kept — event-mandated README requirements.** Some events require specific README content or
sections (captured verbatim in the pack's `event.md` under submission format/requirements). External
submission rules outrank kit doctrine — non-compliance risks disqualification, which fails the whole
campaign. Protocol: required sections insert in the **overlay slot** (between the middle and the
tail), under the **event's own verbatim headings** (the kit adds no "Event requirements" heading of
its own); the stamp gains `+ event-overlay`; the README task enumerates the overlay headings so the
conformance check stays mechanical. This is the *only* way a heading not in the schema may appear.

**Rejected — the freeform "unique project" escape.** Every real shape is covered by
nearest-schema + optional sections + the overlay. A freeform exception is precisely the
random-schema drift this feature exists to end: if nothing fits, pick the nearest schema and use its
optional sections — never invent a structure. Stated as a determinism rule.

## 6. Determinism rules (normative, stated in the file)

1. **Stamp** — line 1 of the README: `<!-- readme-schema: R<n>-<name> v1 -->`, or
   `<!-- readme-schema: R<n>-<name> v1 + event-overlay -->` when the overlay is present.
2. **Headings verbatim, order locked.** Optional sections may be omitted whole — never renamed,
   reordered, or replaced. No invented headings outside the overlay slot.
3. **The spine is identical across schemas** — never customized per project.
4. **No secrets** — env-var *names* only; addresses are public identifiers
   (`conventions.md` §Safety).
5. **Nearest-schema rule** — the rejected freeform exception, stated (§5).
6. Structural change to the library only by PRD, bumping `v1` → `v2`.
7. **Conformance check** — a documented PowerShell one-liner comparing the README's `^#`/`^## `
   lines against the chosen schema's heading list (+ enumerated overlay headings) in order, plus the
   stamp. This is the README task's **gate command**.

## 7. TBD markers — same doctrine as the submission draft

Facts that don't exist until post-build gates land (deployed addresses, live demo link, demo video
URL, public repo URL) ride in the README as `TBD-post-build:<what>` lines — named build outputs
only, exactly the submission draft's rule. The conformance check ignores TBD lines. The
**gate-concierge's closing pass** resolves them from its own outputs in the same breath it resolves
the draft's (it already holds every one of these facts at that moment).

## 8. Who does what

- **repo-bootstrap step 3** (mechanics unchanged): the stub stays minimal; one added sentence marks
  it temporary — replaced by the plan's README task per `readme-schemas.md`.
- **architect Stage 3**: picks the schema from the decision table and emits a **README task** in the
  final plan — a normal task, no new grammar: the task body names the schema id + any overlay
  headings (quoted from `event.md`), its `Files:` list is `README.md`, its gate is the conformance
  check, and it sits late in the DAG (after the tasks that create what it documents), with
  `TBD-post-build:` lines for facts later still. Effort/tier assigned like any task (typically
  `medium`/`standard` — it is judge-facing prose, not scaffolding).
- **gate-concierge closing pass**: the Submission bullet gains "resolve the README's
  `TBD-post-build:` lines from the same outputs".
- **orchestrator / executor / autopilot / demo-studio / idea-forge**: no changes — the README task
  is a normal plan task; the video URL reaches the README via the concierge from the draft.

## 9. Change map (the implementation contract — these files, exactly)

1. **NEW `references/readme-schemas.md`** — the spine (§3), the eight schemas with pick-when +
   locked section lists (§4), the overlay protocol + rejected-freeform statement (§5), the
   determinism rules (§6), the TBD rule (§7), the README-task spec (what the architect's task block
   must contain, §8), the decision table, and the conformance check with a copyable one-liner.
2. **`architect/SKILL.md`** — one Stage-3 bullet (after the executor-ready contract bullet): emit
   the README task per `../references/readme-schemas.md` (schema id from its decision table, overlay
   headings from `event.md`, gate = its conformance check, late in the DAG, TBD rule).
3. **`references/repo-bootstrap.md`** — step 3: the added "temporary stub" sentence (§8).
4. **`gate-concierge/SKILL.md`** — the closing-pass Submission bullet clause (§8).
5. **`README.md`** — the repo tree gains `readme-schemas.md`; the Step-1/architect description
   gains one clause naming the locked README task.

Untouched by design: `references/task-contract.md` (no new grammar — the README task is ordinary),
the manifest validation checks (the task's own gate does the checking), all INVOKE prompts (the
architect's existing deliverables language already covers plans; the README task is inside them).

## 10. Non-goals

- The **kit's own README** is doctrine, not a project artifact — exempt.
- No retroactive migration of existing project repos.
- No new manifest validation checks, no task-contract grammar changes.
- Badges are optional and never required (no external-service claims pinned in doctrine).
- The overlay never overrides the never-consentable floor, the no-secrets rule, or any safety
  doctrine — it governs *README structure* only.

## 11. Decided defaults (the user delegated these)

- **Eight schemas** (within the asked 5–10): fewer would force bad fits; more would blur pick-when
  boundaries.
- **Spine-first design** — determinism where judges look first; variety only in the middle.
- **Positional overlay under the event's verbatim headings** — the event's words, never a kit
  wrapper heading, so the submission reads exactly as the event demanded.
- **R8 doubles as the monorepo sub-package schema** — one minimal shape instead of a ninth.
- **README task is ordinary plan grammar** — determinism enforced by the task body + gate, not new
  fields; keeps task-contract stable.
- **TBD mirroring** — reuses the submission draft's proven marker + the concierge's existing
  resolution moment; no new machinery.
- **Exception verdict**: exactly one exception (event overlay) is worth keeping — disqualification
  risk outranks structural purity; the freeform escape is rejected outright.

## 12. Post-review corrections (adversarial review, 2026-07-13 — applied in the implementation commit)

The multi-lens review confirmed 15 findings (3 refuted). The contract amendments:

1. **The conformance check ships as a short copyable block, not a strict one-liner** — and the
   library states how it reaches the plan: **semicolon-joined onto the task's single `Run:` line**,
   expected output `PASS` (task-contract §1's one-command gate is untouched).
2. **The check is literal, case-sensitive, fence-aware, and covers the H1 title row** (as §6.7
   contracted: `^#`/`^## `): `-ceq`/`-cne`/`-cmatch` replace `-like`, the README task pastes fully
   concrete strings (no wildcards anywhere — the template's example is concrete), and the stamp is
   compared by literal equality, binding it to the chosen schema id and the ` + event-overlay`
   suffix. Root causes, empirically reproduced in review: `-like` parses bracketed event names
   (`[Online]`) as wildcard classes → false FAIL, and an unterminated `[` throws mid-loop → false
   PASS; case-insensitive compares can't enforce "headings verbatim"; a `^## `-only `$got` both
   missed the title and false-FAILed anyone pasting the task's title-inclusive resolved list; `#`
   comment lines inside Quickstart fences counted as headings.
3. **Rule 2 clarified:** the lock covers the `#`/`##` heading levels; `###`-and-deeper sub-headings
   are free within a section.
4. **Monorepo authoring path:** one README task *per package README* (schema R8), same spec, with
   per-path `Files:` and gate — closing the §8 single-task underspecification.
5. **Accepted additions** (serve the determinism goal; kept): the tie-breakers paragraph in the
   decision table, and the R8 sub-package note pointing its Demo line at the root README's assets.
6. **Section content notes** gain the two dropped §4 parentheticals: R2 `Deploy` (testnet) and R6
   `Play it` (link + controls).
