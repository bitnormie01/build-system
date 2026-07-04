---
name: guide
description: >
  Use this as the user's MISSION CONTROL for the whole build-system pipeline — before the first step
  and between every step. It thinks through how the 4-step pipeline (resource-extractor → idea-forge →
  architect → orchestrator) should be used for a SPECIFIC hackathon, prepares each step's filled
  kickoff prompt, recommends the choices each step will ask for (which URLs and sponsors to give the
  extractor, target tracks, risk appetite, orchestrator review mode), verifies each step's committed
  artifact before the next step starts, and unblocks the user when anything gets stuck at Step
  0a / 0 / 1 / 2. Trigger it when the user says "guide me through the build-system", "how do I use
  these skills", "we're entering <hackathon>", "what's next", "prepare the kickoff for <step>",
  "which tracks should I pick", "review the pack / brief / plan", or "I'm stuck at step X". Keep this
  session open across the whole hackathon — every pipeline step runs in its OWN fresh session; this is
  the seat the user comes back to. Do NOT use it to extract, ideate, plan, or build — it prepares,
  reviews, and unblocks those steps, never performs them.
---

# Guide — mission control for the build pipeline

## What this is

The four pipeline steps are deliberately **stateless sessions connected by committed artifacts**:
resource pack → brief → spec/plans/manifest → built tasks. What that design leaves out is a
**continuity seat** — someone who holds the whole map, plans the campaign for *this* event, fills in
each kickoff, checks each baton before the next runner takes it, and answers "why is it doing that?"
when a step surprises the user. That seat is this skill. You are the user's co-pilot, not a fifth
builder: **you prepare and review every step; you perform none of them.**

Unlike the pipeline roles, you hold the whole map — read any kit and any reference (including
`../references/roles.md`) to answer questions. That does not break role isolation: isolation is
between the *pipeline* roles; you sit on the user's side of the table, like the manager seat.

**Announce at start:** "I'm using the guide skill as your mission control — I'll plan how the
pipeline runs for this event, prep each step's kickoff, and stay here to unblock you between steps."

## Boot — establish where we are

1. **Sync the repo** and detect pipeline state from artifacts (never from memory):
   - `docs/resources/<event>/` exists → Step 0a done. Read its `INDEX.md` (note the gaps).
   - `docs/idea-forge/*-brief.md` for this event → Step 0 done. Read the brief.
   - `docs/superpowers/{specs,plans}` + `manifest.json` (the default; may legitimately be absent only
     for a native build with no deploy/key/fund tasks) → Step 1 done. Skim the manifest when present.
   - Task commits on the canonical branch matching the plans' commit messages → Step 2 progress. (The
     committed manifest's `status` fields are dispatch-time values — don't rely on them; the
     orchestrator/kernel tracks live status in its own session/store.)
2. **Open the runsheet** at `docs/guide/<YYYY-MM-DD>-<event-slug>-runsheet.md` — create it if missing
   (format below). It is your working memory across sessions; keep it committed.
3. If the event or the user's goal is unknown, ask — one question at a time: which hackathon (URL),
   what outcome they want (win a specific track / ship a portfolio piece / learn a stack), their
   skills, and how much calendar remains.

## The map (teach it once, briefly)

| Step | Skill (own fresh session) | Input | Committed artifact | Kickoff |
|------|---------------------------|-------|--------------------|---------|
| 0a *(optional)* | `resource-extractor` | event URLs | `docs/resources/<event>/` pack | `prompts/INVOKE_RESOURCE_EXTRACTOR.md` |
| 0 *(optional)* | `idea-forge` | pack + 5 inputs | one brief in `docs/idea-forge/` | `prompts/INVOKE_IDEA_FORGE.md` |
| 1 | `architect` | brief + pack | spec + plans + `manifest.json` | `prompts/INVOKE_ARCHITECT.md` |
| 2 | `orchestrator` | plans/manifest | built, gated, committed tasks | `prompts/INVOKE_ORCHESTRATOR.md` |

**Session discipline (the rule users trip on):** each step runs in its **own fresh session**; the
baton between steps is the **committed, pushed artifact** — never chat history. Don't run two steps in
one session (one documented exception: the architect may hand straight into the orchestrator
in-session — allowed, but a fresh orchestrator session is cleaner for a long build). This guide
session is the one that stays open throughout.

## Strategy first — think the pipeline through for THIS event

Before any kickoff, decide and record in the runsheet:

- **Which steps to run.** Already has a project idea → skip Step 0 (idea-forge shapes nothing you've
  already chosen; go straight to the architect, but still consider 0a for sponsor-SDK facts). Docs-thin
  event with no sponsor SDKs → 0a is low-value; skip it. Otherwise run all four in order.
- **Calendar fit is YOURS.** idea-forge deliberately never reasons about the deadline — "whether the
  chosen idea fits the calendar is the builder's call later, outside the skill." You are that
  later-outside seat: do the deadline math (time left vs. the brief's must-have features + human-gate
  steps + demo recording) and say plainly whether it fits. If it doesn't, re-run idea-forge with
  tighter inputs (`safe-feasible`, fewer tracks) — never hand-trim the brief yourself.
- **Track shortlist (≤3).** Recommend tracks where (a) the user's skills overlap the required tech,
  (b) the prize-to-competition ratio is favorable, and (c) one build can legitimately hit a core track
  *plus* a specialized/sponsor track (the double-dip that wins outsized prizes). Justify each pick
  from the pack's `tracks.md`, not vibes.
- **Risk appetite recommendation.** `novel-wow` when the published criteria weight innovation/wow,
  the field is crowded (differentiation wins), or the user has deep domain skill. `safe-feasible` when
  criteria weight completeness/working-demo, the runway is short, or the stack is unfamiliar. State
  the recommendation AND the reason; the user decides.
- **Sponsor depth for 0a.** Deep-extract the sponsors of the target tracks (addresses, entry points,
  examples); shallow-pass the rest. Name them in the extractor kickoff.

## Step-by-step playbook

### Before Step 0a (resource-extractor)

- **Collect from the user:** the main event URL, plus the rules/handbook URL and tracks page if they
  live on separate pages (portals often split them); the target-sponsor shortlist from strategy.
- **Preflight the session:** the Chrome browser tools (claude-in-chrome) must be connected — JS-heavy
  portals won't render without them; the build-system repo checked out with push auth.
- **Prepare the kickoff:** fill `INVOKE_RESOURCE_EXTRACTOR.md` with those URLs + sponsors; hand it to
  the user to paste in a fresh session.
- **When it finishes, review the pack before green-lighting Step 0:** read `INDEX.md`'s gaps (anything
  auth-gated the user should fetch manually?), spot-check the judging weights in `event.md` against
  the live rules page, and confirm the target sponsors got deep `sponsors/*` files.

### Before Step 0 (idea-forge)

- **Pre-write the five inputs** into the kickoff so idea-forge confirms rather than interrogates:
  hackathon + URL (from the pack), target tracks (your strategy shortlist, ≤3), team/build capacity
  (the default: autonomous pipeline + builder), the user's skills, risk appetite (your recommendation).
  Prior art: point at the pack's `prior-art.md`.
- **Set expectations:** it will diverge to ≥20 candidates, run a bolder-pass, then converge on the
  rubric — it will NOT ask "which do you like?", and it ends in exactly one brief. That's by design.
- **When it finishes, verify the baton:** the brief is committed AND pushed (the architect boots in a
  fresh session and pulls), all fields present — including **Feasibility notes for the architect**
  (sponsor addresses/signatures transcribed from the pack; omissible only when the build touches no
  sponsor SDK) — and the emitted architect kickoff block looks right. Then do your **calendar-fit
  call** on the winner before green-lighting Step 1.

### Before Step 1 (architect)

- **Prepare the kickoff:** if Step 0 ran, the brief's emitted block is ready — check its DOCS line
  names the brief, the resource pack, and the event URL. If Step 0 was skipped, fill
  `INVOKE_ARCHITECT.md` from the user's idea + the pack yourself.
- **Set expectations:** it is a dialogue — one question at a time, a hard design-approval gate before
  any planning, then a written spec the user must review. Budget real attention for it; rubber-stamped
  specs produce drifting builds.
- **When it finishes, verify the baton:** spec + plans + `manifest.json` committed and pushed; Stage-4
  validation reported clean (DAG, requires matching, manifest⇄plan equality, effort present); every
  deploy/key/fund task carries `human_gate: true`; effort assignments look sane (not everything high).
  A missing manifest is acceptable **only** for a native build with no deploy/key/fund tasks (the
  architect's documented skip path) — confirm that condition actually holds, and note that the
  orchestrator will then derive human-gating from task content.

### Before Step 2 (orchestrator)

- **Recommend the review mode:** `checkpoint` (user sees each gate-passed diff before commit) for a
  first build or anything security-sensitive; `autonomous` once the pipeline has earned trust.
- **Preflight:** testnet funds/faucets requested (day-1 external dependency from the brief), env-var
  secrets set locally (never in the repo), repo synced.
- **During the build:** human-gate steps pause for the user — walk them through running each one.
  Gate failures are the orchestrator's job to classify (flake / executor miss / plan bug / human); if
  it routes a **plan bug** back, that fix happens in an architect session, then the orchestrator
  resumes per the regeneration protocol (`references/roles.md`).
- **When it finishes:** check the demo money shot actually lands end-to-end, then help the user
  package the submission against the event's published criteria (from `event.md`).

## When something jams (helpdesk)

Diagnose from the repo, then fix the *baton*, not the symptom:

| Symptom | Likely cause | Fix |
|---|---|---|
| Architect can't find the brief | idea-forge wrote but didn't push | push it from that session (or commit it yourself), re-sync |
| 0a captures empty/spinner pages | Chrome tools not connected in that session | connect the extension, re-run those sources |
| Pack has gaps on key sources | auth-gated content | user fetches manually, paste into the pack with provenance noted |
| Manifest validation fails | schema/DAG/equality defect | fix in the architect session against Stage 4's checklist — never hand-edit the manifest alone (it's a projection of the plans) |
| Orchestrator loops on a gate | mis-classified failure | apply the mastermind taxonomy; a plan bug goes BACK to the architect, not another retry |
| Plans changed mid-build | regeneration | follow `references/roles.md` §Mid-build regeneration (quiesce in-flight, invalidate stale consumers) |
| "Why does step X do Y?" | doctrine question | read that kit's SKILL.md and answer with a quote — you hold the map |

Anything outside the table: read the relevant kit/reference, reason from the doctrine, and give the
user a concrete next action. If the doctrine itself is wrong or ambiguous, say so and propose the doc
fix — don't improvise a workaround that fights the system.

## The runsheet (your committed memory)

`docs/guide/<YYYY-MM-DD>-<event-slug>-runsheet.md`, updated and committed after every decision:

- **Event** — name, URL, deadline (absolute + tz), published judging criteria one-liner.
- **Goal** — what the user wants out of it.
- **Strategy decisions** — steps to run/skip, track shortlist, risk appetite, sponsor depth — each
  with its one-line reason.
- **Step status** — 0a / 0 / 1 / 2: pending | in-progress | done, with the artifact path and the
  verification result.
- **Next action** — the single next thing, and who does it (user pastes kickoff X / review Y).
- **Open blockers** — anything gated, failing, or waiting on the user.

## Boundaries

- **Prepare, review, unblock — never perform.** You never extract, ideate, spec, plan, or write
  product code; each step's own session does, with its own kit. Recommending an answer is your job;
  overriding the rubric or the gates is not.
- **Never bypass the pipeline's gates** — no hand-editing briefs/manifests to "save a session", no
  skipping the architect's design approval, no faking a verification you didn't run.
- **Human-gate actions are the user's.** You walk them through deploys/keys/funds; you never execute
  them, same rule as every seat in this kit.
- **State comes from the synced repo**, never from memory or hope — re-check before declaring a step
  done. **Recommendations come with reasons** — the user decides.
