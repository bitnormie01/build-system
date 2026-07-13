# README schemas (v1) — every project README from one of eight locked schemas

The project README is the first thing a judge reads, and before this file it was the least governed
artifact in the kit: a bootstrap stub, then whatever the executor improvised. This library ends
that. Every kit-built project README is generated from exactly **one of eight locked schemas** —
chosen by the architect from the decision table below, named in the plan's README task, stamped in
the file, and mechanically checkable. All eight share one **judge-path spine**, so a judge who has
navigated one kit README can navigate them all; only the middle varies, by product shape.

Who does what: the **architect** picks the schema and emits the README task (Stage 3,
`../architect/SKILL.md`); an **executor** writes the README as an ordinary plan task; the
**gate-concierge's closing pass** resolves its `TBD-post-build:` lines
(`../gate-concierge/SKILL.md`). Design record: `../docs/prd/2026-07-13-readme-schemas-prd.md`.

## The artifact

- **Path:** `README.md` at the **project repo** root (`repo-bootstrap.md`). The bootstrap stub is
  temporary; the plan's README task replaces it.
- **Line 1** is the stamp: `<!-- readme-schema: R<n>-<name> v1 -->`, or
  `<!-- readme-schema: R<n>-<name> v1 + event-overlay -->` when the overlay (below) is present.
- The **kit's own README is exempt** — it is doctrine, not a project artifact. Monorepos: the root
  README uses R1–R7 by the product's shape; **per-package** READMEs use R8.

## The judge-path spine (locked — identical in all eight schemas)

Every schema opens with the same five blocks, so a judge reaches proof in three scrolls:

1. `# <Project>` — title + a one-liner (≤ 140 chars). An optional badges line may follow.
2. `## Demo` — demo video URL, live/deployed link, one screenshot or GIF. The section is mandatory;
   assets that don't exist *yet* ride as `TBD-post-build:<what>` lines (§TBD markers); assets that
   will never exist are simply omitted — never an `N/A` in a judge-facing file. (An R8 sub-package
   may point its Demo line at the root README's assets.)
3. `## What it does` — problem → solution in 3–6 sentences, judge-readable, no jargon wall.
4. `## Quickstart` — the fewest copy-paste commands that show the money shot locally.
5. `## Built at <event>` — event, track(s)/bounties targeted, team, and what was built **during**
   the event (the kit's honesty ethos, stated where judges look for it).

Then the schema's **middle** (below), then the **overlay slot** (§The event overlay), then the
shared **tail**: `## Roadmap` *(optional — known limitations + next steps)* and `## License`.

## The eight schemas

Middle sections are locked headings, in locked order; `*(optional)*` sections may be omitted whole —
never renamed, reordered, or replaced.

| id | name | pick when | middle sections (locked order) |
|---|---|---|---|
| R1 | `web-app` | hosted UI / full-stack dApp — the product is what you click | `## How it works` · `## Tech stack` · `## Run locally` · `## Contract addresses` *(optional — on-chain builds)* |
| R2 | `contract-protocol` | the contracts/protocol ARE the product | `## Contract addresses` · `## How it works` · `## Security notes` · `## Build & test` · `## Deploy` |
| R3 | `cli-tool` | CLI / library / SDK / dev tool | `## Install` · `## Usage` · `## Commands / API reference` · `## How it works` |
| R4 | `api-service` | backend / API / indexer / oracle | `## Endpoints` · `## Run it` · `## How it works` · `## Example requests` |
| R5 | `agent-ai` | AI agent / LLM app / bot | `## How the agent works` · `## Prompts & safety` · `## Run it` · `## Tech stack` |
| R6 | `game-interactive` | game / interactive / creative piece | `## Play it` · `## Screenshots` · `## How it works` · `## Run locally` |
| R7 | `data-ml` | data pipeline / ML / analytics | `## Results` · `## Method` · `## Dataset` · `## Reproduce` |
| R8 | `minimal` | weekend spike; or any monorepo sub-package README | `## How it works` |

Section content notes (the headings are locked; these guide what goes under them):

- **Contract addresses** (R1/R2) — a `network | address | explorer` table; testnet during the
  hackathon. Addresses are public identifiers, fine to commit.
- **Run locally / Run it** (R1/R4/R5/R6) — start commands + an env-var table with **names and
  purposes only, never values** (`conventions.md` §Safety).
- **Security notes** (R2) — trust assumptions and known limits; "unaudited" stated plainly (the
  honesty rule beats marketing).
- **Deploy** (R2) — testnet deploy instructions (the kit's standing rule: testnet, never mainnet,
  during the hackathon).
- **Play it** (R6) — the playable link + the controls.
- **Usage** (R3) — examples before reference: show the tool doing its best trick in the first block.
- **How the agent works** (R5) — the loop, the tools, the models used and why; **Prompts & safety**
  says what it will and won't do.
- **Results** (R7) — the headline numbers/plots first; **Dataset** names source + license.

Tie-breakers: UI **and** contracts → R1 when the demo is the UI, R2 when the contracts are the
pitch. An agent with a web front → R5 when the agent loop is the innovation, R1 when the product is
the interface. A tool with a hosted playground → R3; the playground link rides in `## Demo`.

**Nearest-schema rule (the rejected exception):** nothing fits perfectly → pick the nearest schema
and use its optional sections — **never invent a structure**. There is no freeform escape; that is
the random-schema drift this library exists to end. A user-provided repo with a real pre-existing
README is restructured **into** the nearest schema — content preserved, structure locked — never
silently discarded, and never a ninth shape.

## The event overlay — the only sanctioned exception

Some events mandate README content or sections (captured **verbatim** in the pack's `event.md`
under submission format/requirements). External submission rules outrank kit doctrine —
non-compliance risks disqualification. Protocol:

- Required sections insert in the **overlay slot** (between the middle and the tail), under the
  **event's own verbatim headings** — the kit adds no wrapper heading of its own.
- The stamp gains ` + event-overlay`.
- The README task **enumerates the overlay headings**, so the conformance check stays mechanical.
- The overlay governs *README structure only* — it never overrides the never-consentable floor, the
  no-secrets rule, or any safety doctrine.

## TBD markers

Facts that don't exist until post-build gates land — deployed addresses, live demo link, demo video
URL, public repo URL — ride as `TBD-post-build:<what>` lines, exactly the submission draft's rule
(named build outputs only, nothing vaguer). The **gate-concierge's closing pass** resolves them from
the same outputs that resolve the draft's (plus the demo-video URL copied from the draft, which
demo-studio resolves there). TBD lines are body text, so the heading-based conformance check
naturally ignores them.

## Determinism rules

1. **Stamp on line 1** (§The artifact).
2. **Headings verbatim, order locked.** Optional sections omitted whole or present verbatim — never
   renamed, reordered, or replaced. No invented headings outside the overlay slot (the lock covers
   the `#`/`##` levels; `###`-and-deeper sub-headings are free within a section).
3. **The spine is identical across schemas** — never customized per project.
4. **No secrets** — env-var *names* only; addresses are public identifiers
   (`conventions.md` §Safety).
5. **Nearest-schema rule** — no freeform escape (§The eight schemas).
6. Structural change to this library only by PRD, bumping `v1` → `v2`.

## The README task (what the architect emits — Stage 3)

One **ordinary** plan task, no new grammar:

- **Body:** the schema id + version (e.g. `R2-contract-protocol v1`), the **resolved heading list**
  pasted concrete (the `# <Project>` title row, spine with the real event name, middles minus
  omitted optionals, overlay headings quoted from `event.md`, tail), the concrete stamp line, and
  the TBD lines to carry.
- **Placement:** late in the DAG — after the tasks that create what it documents.
- **`Files:`** `README.md`. **Gate:** the conformance check below with the resolved list,
  semicolon-joined onto the task's single `Run:` line (expected output `PASS`).
- **Effort/tier:** assigned like any task — typically `medium`/`standard`; it is judge-facing
  prose, not scaffolding.
- **Monorepo:** one README task **per package README** as well — same spec, schema R8, with
  `Files:` and the gate's path pointing at that package's README.

## Conformance check (the README task's gate)

Compare the README's `#`/`## ` heading lines (fence-aware) to the resolved list, in order, plus the
stamp — every comparison **literal and case-sensitive**. The README task pastes fully **concrete**
strings; wildcards appear nowhere. The example below is R2-contract-protocol v1, no overlay,
Roadmap present:

```powershell
$want = @('# HookMarket','## Demo','## What it does','## Quickstart',
          '## Built at ETHGlobal Cannes 2026','## Contract addresses','## How it works',
          '## Security notes','## Build & test','## Deploy','## Roadmap','## License')
$stamp = '<!-- readme-schema: R2-contract-protocol v1 -->'
$lines = Get-Content README.md -Encoding UTF8
$inFence = $false
$got = foreach ($l in $lines) {
  if ($l -match '^```') { $inFence = -not $inFence }
  elseif (-not $inFence -and $l -cmatch '^#{1,2} ') { $l } }
$ok = ($got.Count -eq $want.Count)
if ($ok) { for ($i = 0; $i -lt $want.Count; $i++) { if ($got[$i] -cne $want[$i]) { $ok = $false } } }
if ($ok -and ($lines[0] -ceq $stamp)) { 'PASS' } else { 'FAIL' }
```

- `-Encoding UTF8` is load-bearing: Windows PowerShell 5.1 reads BOM-less UTF-8 as ANSI and
  non-ASCII characters mojibake into a false FAIL.
- The literal `-ceq`/`-cne`/`-cmatch` operators are load-bearing too: `-like` would parse a
  bracketed event name (`[Online]`) as a wildcard class and false-FAIL a conforming README, and
  case-insensitive compares cannot enforce "headings verbatim". Comparing `$stamp` literally also
  binds the stamp to the chosen schema id and the ` + event-overlay` suffix — a wrong-schema or
  malformed stamp fails.
- The fence toggle keeps `#` comment lines inside Quickstart/Build code blocks from counting as
  headings. Only the `#`/`##` levels are locked — `###`-and-deeper sub-headings are free within a
  section — and TBD lines are body text, invisible to the check.
- **In the plan, the gate rides the task's single `Run:` line semicolon-joined** — the same
  statements on one line, expected output `PASS` (`task-contract.md` §1's one-command gate).
