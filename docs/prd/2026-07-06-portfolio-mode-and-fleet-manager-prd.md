# PRD — Portfolio Mode & Fleet Manager (multi-project hackathon campaigns)

- **Status:** approved by the user, **not yet built**. This document is the implementation contract.
- **Decided:** 2026-07-06, from a brainstorm session with the user. Design decisions below are final
  unless marked *open question* (§12).
- **Target:** this build-system kit (the repo this file lives in).
- **Implementer:** any future agent session. This file is written to be sufficient on its own —
  read it fully, then the referenced kit files, before editing anything.

## 0. How to use this PRD (implementing agent, read first)

1. Read this file end-to-end, then: `README.md`, `references/repo-bootstrap.md`,
   `references/conventions.md`, `references/roles.md`, `idea-forge/SKILL.md`, `guide/SKILL.md`,
   `gate-concierge/SKILL.md`, and every `prompts/INVOKE_*.md`. The upgrade touches the seams
   between them; editing one without knowing the others reintroduces the cross-file drift this
   kit has already paid to remove twice.
2. Follow the kit's own working conventions for the upgrade itself: dense doctrinal markdown in
   the existing voice; `../references/<file>` relative paths from skill directories; commit and
   push to `main` when done (no separate branch); commit message ends with the kit's standard
   `Co-Authored-By: Claude` trailer.
3. **Quality loop (mandatory):** after making all edits, run a multi-agent adversarial review
   before committing — 3–4 reviewer lenses (requirement coverage vs. this PRD; cross-file
   consistency; doctrine/safety contradictions; operational mechanics), each finding then
   adversarially verified by an independent skeptic; fix every confirmed finding. The two prior
   upgrades (commits `5aa56d6`…`4df3551`) used exactly this loop and it caught blocking defects
   both times. §9 lists the stale-text hotspots those reviews taught us to expect.
4. Scope discipline: build §3–§6. §11 is explicitly deferred — do not build it, even though it is
   sketched here.

## 1. Problem and goals

The user builds **~4 projects per hackathon** — one for themself, three for friends (each friend a
registered participant who owns and submits their own project). Today the kit is strictly
single-project: one campaign = one project repo = one chain of sessions. Running it 4× by hand
works but wastes the shared work (one event's docs extracted four times), risks four sessions
independently converging on the same idea, and gives the user no single place to see where all
four projects stand.

**Goals:**

- **G1 — Single-go generation:** one decision session takes the user from "we're entering
  <event>" to N (default 4) distinct, committed briefs with ready-to-paste kickoffs for every
  downstream step of every project.
- **G2 — No quality drop (hard constraint, shaped every decision):** every existing quality gate
  survives at N×: the buildability wall, the design-approval dialogue, per-task gates and
  scope-checks, consent-per-gate. Where a mechanism could not preserve quality at N× it was cut
  from scope (§11) rather than weakened.
- **G3 — Fleet visibility:** a read-only seat that explains where every project stands and what
  the single next action is, per project — and never executes anything.

**Non-goals:** a mega-session that holds all four builds (violates the kit's fresh-session
discipline; context rot is a quality drop by construction); any weakening of consent or safety
doctrine; automating the human out of spec review.

## 2. The quality model (why the design has this shape)

Where quality comes from in the pipeline, and what happens to each source at N=4:

| Stage | Parallelizes? | Reasoning |
|---|---|---|
| 0a pack | **Share one** | One careful extraction, N consumers. N packs = waste + drift risk. |
| 0 ideation | **No — portfolio-aware instead** | N independent idea-forge runs read the same pack and rubric → overlapping winners that compete with each other. Selection must be joint. |
| 1 architect | **No — serialize or distribute the human** | Spec approval is where quality lives ("rubber-stamped specs produce drifting builds"). N simultaneous design dialogues divide attention N ways. |
| 2 build | **Yes, fully** | Stateless orchestrators over isolated repos; the kit was built for this. Constraint is account rate limits, not quality. |
| 3 gates | **Mostly** | Per-project ledgers work as-is; contention is physical (one browser, faucet cooldowns per IP/address, one inbox). |

**Design principles derived:** parallelize machine work; serialize (or distribute to friends) human
judgment; make ideation portfolio-aware; keep every project's artifacts isolated in its own repo;
coordinate through committed artifacts only, exactly like the rest of the kit.

## 3. Feature A — Campaign hub (changes to `references/repo-bootstrap.md`)

**Concept:** a portfolio campaign = **one hub repo + N project repos**.

- The **hub** is the event-named repo Step 0a already creates (`<event-slug>-<YYYY>`). In
  portfolio mode it is **never renamed** — it persists as the campaign's shared home. Amend
  repo-bootstrap's "The rename step" accordingly: the rename applies to single-project campaigns
  only.
- **Artifact homes (normative):**

  | Artifact | Lives in |
  |---|---|
  | resource pack `docs/resources/<event>/` | hub |
  | all N briefs `docs/idea-forge/*-brief.md` | hub |
  | fleet board + kickoff deck `docs/fleet/` | hub |
  | spec/plans/`manifest.json` (`docs/superpowers/`) | each project repo |
  | gate ledger + submission draft (`docs/gates/`) | each project repo |
  | runsheet (`docs/guide/`) | each project repo |
  | product code | each project repo |

- **Project repos:** created private, project-named, one per brief, at idea-forge Step 4 (§4) —
  same creation protocol as today (`gh repo create <project-slug> --private --description
  "<one-line solution>" --clone`, run from outside the kit checkout).
- **Cross-repo reads:** a session may clone the kit checkout + the hub + its own project repo.
  Kickoff `DOCS:` entries that point into the hub must carry the hub's `owner/name` alongside the
  path so a fresh session knows which clone to read (extend the DOCS convention in the
  architect/idea-forge kickoffs with an example).
- **Collaborator access:** private repos + friends' own GitHub accounts means the hub (read) and
  each friend's project repo (write) need collaborator invites —
  `gh api` / `gh repo` collaborator add, run by the repo creator. Write this into the portfolio
  section of repo-bootstrap and into the fleet deck's per-owner preamble (§5).
- **Single-project campaigns are unchanged.** Portfolio behavior activates only when a kickoff
  declares it (§4's `PORTFOLIO:` field); the default path stays exactly as today.
- **Edge case:** portfolio campaign with Step 0a skipped → the idea-forge portfolio session
  creates the hub itself (event-named, same naming table) before committing briefs.

**Acceptance:** repo-bootstrap reads coherently for both modes; the naming table covers the hub;
the rename step is explicitly single-project; artifact-homes table present; a fresh agent
following only repo-bootstrap can answer "where does artifact X live in a portfolio campaign?"
for every artifact type.

## 4. Feature B — Idea-forge portfolio mode (changes to `idea-forge/SKILL.md` + `prompts/INVOKE_IDEA_FORGE.md`)

The load-bearing feature. One session, one divergence, N convergences.

- **Kickoff fields (new):** `PORTFOLIO: N slots` with, per slot: owner name, that owner's builder
  skill set, risk appetite, and (optional) preferred tracks. The existing five inputs remain;
  inputs 3–5 become per-slot where they differ. Single-project = omit the field entirely.
- **Divergence widening:** scale the candidate floor with N — ≥20 for N=1 (unchanged), plus ~5
  per additional slot (≥35 for N=4), and the field must cover **at least N distinct tracks**.
  Bolder-pass unchanged.
- **Convergence loop (the distinctness machinery):** converge as today for slot 1 (using slot 1's
  skills/risk appetite in the rubric) → commit that winner → **add it to the occupied-space set**
  → re-score the surviving field for slot 2 with two additions:
  1. **Occupied-space knockout:** any candidate sharing an already-picked brief's core mechanism /
     wedge is out — this reuses the existing white-space classification with prior picks as the
     prior art.
  2. **Track partition preference:** prefer each winner to be the champion of a *different* track
     (rank #4 of one list is weaker by construction; #1-of-its-track × 4 is not). Same track for
     two winners is allowed only when that track pays multiple ranked prizes — say so explicitly
     in the brief's "why it wins".
  Repeat until N slots are filled.
- **Thin-field rule (quality contract):** the buildability wall and the judge head-to-head stay
  absolute for every slot. If the field only supports K < N genuinely winnable, distinct briefs,
  emit K and state why — **never pad to N**. This sentence must appear in the skill.
- **"One brief, never a list" is preserved, per slot:** each slot still converges to exactly one
  committed brief; the skill still never ends on a menu. Portfolio mode is N committed decisions,
  not one list of N options. Scope the existing hard guardrail's wording so it reads correctly in
  both modes.
- **Step 4 per winner:** commit the brief to the **hub** (`docs/idea-forge/`), create that
  project's repo (private, project-named — §3), then emit that slot's architect kickoff block
  with: `REPO:` = the new project repo; `DOCS:` = the hub-qualified brief + pack paths + event
  URL; `CONSTRAINTS` carrying the slot owner's stack. Owner name goes in the brief header.
- **Compliance preamble (one paragraph in the skill):** before generating, check the pack's
  `event.md` for submissions-per-person limits, team-registration rules, built-during-event and
  AI-disclosure clauses; flag anything that constrains an N-project portfolio. Distinct tracks and
  distinct stacks are preferred partly for this reason. Each owner must be able to explain their
  project in judge Q&A — record the owner on each brief.

**Acceptance:** given a pack with ≥4 tracks, a portfolio run produces 4 briefs, no two sharing a
primary track or core mechanism, each individually passing the existing brief checklist, each with
an owner and a well-formed architect kickoff block pointing at its own repo; given a deliberately
thin field, it produces fewer with explicit rationale.

## 5. Feature C — Fleet manager (new `fleet-manager/SKILL.md` + `prompts/INVOKE_FLEET_MANAGER.md`)

A **read-only user-side seat**, one session per hackathon, above the per-project pipeline. In
portfolio campaigns it supersedes per-project guide sessions (the guide remains the seat for
single-project campaigns — add one cross-reference paragraph to `guide/SKILL.md`, nothing more).

- **Boot:** resolve the hub from the kickoff's `HUB:` field; enumerate project repos from the
  hub's briefs/board; sync kit + hub + every project repo; derive each project's state **from
  committed artifacts only** — reuse the guide's boot detection verbatim, per repo: pack → brief →
  spec/plans/manifest → task progress (manifest tasks vs. their unique plan commit messages in
  `git log`) → gate-ledger row statuses → submission evidence.
- **Writes exactly one thing:** `docs/fleet/<event>-board.md` in the hub (plus the kickoff deck
  below). Per project: owner · pipeline step · tasks built/total · gates done/pending/declined ·
  blockers · deadline runway · **the single next action and who does it**. Plus two cross-project
  sections only this seat can own:
  - **Decision queue** — every pending human moment across all projects (spec approvals waiting,
    gate consents pending, Tier-B moments), ordered; this is how N projects' human judgment gets
    serialized instead of parallelized.
  - **Triage** — when runway < remaining work, the portfolio-level call (cut scope on C, fold
    effort into B) with reasons; recommendation only, the user decides.
- **Kickoff deck:** `docs/fleet/<event>-kickoff-deck.md` in the hub — every remaining kickoff for
  every project (steps 0a/0 shared; 1/2/3 per project), filled (`REPO:`/`DOCS:`/`MODE:`/owner),
  in dependency order, **grouped per owner** so each friend copies their own section and runs it
  on their own machine/account. Per-owner preamble: collaborator-access check, which Claude
  account runs it, and the shared-resource rules (§6). Regenerate the deck whenever state changes;
  it is the "single go" artifact — one decision session, then everyone pastes from the deck.
- **Boundaries (hard):** never extracts, ideates, specs, builds, runs gates, or edits any pipeline
  artifact; writes only under the hub's `docs/fleet/`; never launches sessions itself; recommends
  with reasons. Consent stays per-gate with each project's own concierge session — the fleet
  manager's queue *lists* pending consents, it never grants them. Add the seat to
  `references/roles.md`'s user-side seat list.
- **Trigger discipline:** same as the concierge — only on the user's ask; never self-triggers.

**Acceptance:** pointed at a hub + ≥2 project repos in different pipeline states, the board
correctly derives each state from artifacts alone (no memory), the decision queue lists the right
pending human moments, and the deck's kickoffs are well-formed and paste-ready; the skill contains
the never-performs boundary and the roles.md list includes it.

## 6. Cross-cutting operational rules (write into the touched files, not left in this PRD)

- **Spec-review serialization:** default = the decision queue staggers the N architect reviews for
  the user, one at a time. Preferred variant = **each friend drives their own architect session**
  (their attention is parallel capacity, and the owner who approved their own spec can defend it
  in judge Q&A). The deck's OWNER grouping supports both; the fleet board records which was used.
- **Accounts and rate limits:** N orchestrators on one Claude account throttle each other.
  Recommend per-owner accounts for Step 2 (the repos make builds location-independent); otherwise
  stagger builds. One sentence in the deck preamble.
- **Physical contention (Step 3):** one burner wallet **per project**, never shared (faucet
  cooldowns key per address; the faucet library records this). Faucet claims from one IP:
  staggered — or each owner runs their own concierge on their own machine. Browser-driven gates on
  one machine serialize. Provider accounts / API keys belong to each project's **owner** (their
  email) — cleaner ownership and the submission must come from their account anyway.
- **Compliance:** the §4 preamble plus a fleet-board column: "owner can demo & explain: yes/no".

## 7. Quality invariants that must survive (the review's checklist)

The adversarial review (§0.3) must verify each of these still holds after the edits:

1. Consent-per-gate and never-self-trigger (concierge AND fleet manager).
2. Buildability wall absolute; thin-field rule present; no padding to N.
3. "One brief, never a list" preserved per slot; no menus.
4. Repo isolation: no project reads or writes another project's repo; hub is read-shared,
   `docs/fleet/` is the only fleet-written path.
5. Kit checkout stays read-only except `references/faucets/` write-back.
6. No secrets in any artifact; env-var names + locations only.
7. Session discipline: fresh session per step per project; no seat holds build content for
   multiple projects (the fleet manager holds *status*, read from repos, only).
8. Manifest-is-a-projection, executor-never-commits, orchestrator-never-plays-concierge — all
   untouched.
9. Single-project campaigns behave exactly as before every edit (default-path regression check).

## 8. File-by-file change map

| File | Change |
|---|---|
| `references/repo-bootstrap.md` | portfolio section: hub concept, rename-step scoping, artifact-homes table, collaborator access, hub-creation edge case |
| `idea-forge/SKILL.md` | portfolio mode: PORTFOLIO input, per-slot inputs, divergence scaling, convergence loop w/ occupied-space + track partition, thin-field rule, per-winner Step 4, compliance preamble, guardrail rescoping |
| `prompts/INVOKE_IDEA_FORGE.md` | `PORTFOLIO:` field + per-slot sub-fields + portfolio notes |
| `fleet-manager/SKILL.md` | **new** — §5 |
| `prompts/INVOKE_FLEET_MANAGER.md` | **new** — HUB field, read-only contract, board/deck/queue duties |
| `guide/SKILL.md` | one paragraph: portfolio campaigns → fleet-manager supersedes the guide; guide stays the single-project seat |
| `references/roles.md` | add fleet-manager to the user-side seats |
| `prompts/INVOKE_ARCHITECT.md` | DOCS convention note: hub-qualified paths in portfolio campaigns |
| `gate-concierge/SKILL.md` | 2–3 lines: portfolio contention rules (per-project wallet already present; add staggering + per-owner pointers) |
| `README.md` | portfolio paragraph, files-tree additions, remove/adjust the "Planned upgrades" pointer to this PRD |
| `references/task-contract.md`, `orchestrator/SKILL.md`, `executor/SKILL.md`, `mastermind/SKILL.md`, `resource-extractor/SKILL.md` | **no change expected** — verify, don't assume |

## 9. Known stale-text hotspots (sweep these — learned from the last two reviews)

Singular-assumption phrasing that will contradict portfolio mode unless touched:

- `repo-bootstrap.md`: "The rename step", the naming table's "First seat to need the repo" rows,
  "One project repo per campaign" hard rule (must become "per project; a portfolio campaign is a
  hub + N project repos").
- `idea-forge/SKILL.md`: "The one output", "One brief, never a list", "end in exactly one brief"
  phrasing in the description frontmatter and guardrails.
- `guide/SKILL.md`: "One open seat", the map table, runsheet singular.
- `prompts/INVOKE_GUIDE.md`: "five fresh sessions" note, the ASCII diagram.
- `README.md`: both pipeline diagrams/descriptions.
- Frontmatter descriptions are triggers — new/changed trigger phrases ("we're entering X with 4
  projects", "portfolio", "fleet status", "where do all my projects stand") must route to
  idea-forge portfolio mode / fleet-manager, and must NOT create a state-condition self-trigger
  (the review that caught this class of bug: gate-concierge's "when the orchestrator finishes").

## 10. Implementation order

1. `repo-bootstrap.md` (foundation — everything else cites it)
2. idea-forge portfolio mode + its kickoff
3. `fleet-manager/SKILL.md` + its kickoff + roles.md
4. deck emission + guide/README/architect-prompt/concierge touch-ups
5. §9 sweep across the whole repo (grep for singular phrasing, "one brief", "rename", diagrams)
6. adversarial review per §0.3 → fix confirmed findings
7. one commit to `main`, push.

## 11. Deferred — conductor seat (do NOT build; recorded so the next design starts here)

A session that dispatches each autonomous pipeline step as a fresh background agent (fresh
subagent = fresh context, so session discipline survives) and funnels all human moments into the
fleet board's decision queue. Deferred because: it is a new seat with real failure modes (it must
never answer an architect's design question itself, never grant a consent from the queue), and the
deck flow (§5) delivers most of the value with zero new trust surface. **Precondition to build:**
one real portfolio campaign completed on the deck flow, with the decision queue's semantics
validated by actual use.

## 12. Open questions (ask the user at implementation kickoff — do not guess)

1. Default N=4 confirmed? Slot owners/skills supplied in the idea-forge kickoff, or collected
   one-at-a-time in session?
2. Friends drive their own architect sessions (recommended) or does the user review all N specs
   via the queue?
3. Friends' GitHub usernames for collaborator invites — collected where? (Suggest: fleet kickoff.)
4. Hub visibility at submission time — hubs hold no product code; stay private forever?
