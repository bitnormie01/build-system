# Pipeline Fallback (condensed checklist)

Resolution order for the architect's spec/plan stages: (1) installed `superpowers:brainstorming` /
`superpowers:writing-plans` skills — the maintained source; (2) the **vendored full texts** at
`vendor/superpowers/{brainstorming,writing-plans}/SKILL.md` — a pinned snapshot embedded in this
repo (see `vendor/superpowers/UPSTREAM.md`); follow them verbatim as documents when superpowers is
not installed; (3) this file — a condensed checklist of the same flow, kept as a quick self-check,
not a substitute for the full method.

## Stage 2 fallback — brainstorm into a spec

Hard gate: do not plan or code until a design is presented and the user approves it.

1. Explore project context — read the idea and all reference docs.
2. **Scope check first.** If the request spans multiple independent subsystems, stop and propose a
   decomposition into sub-projects before going deep. Each sub-project gets its own spec → plan
   cycle.
3. Ask clarifying questions **one at a time** (purpose, constraints, success criteria). Prefer
   multiple-choice.
4. Propose 2–3 approaches with trade-offs; lead with your recommendation and why.
5. Present the design in sections scaled to complexity; get approval per section.
6. Write the approved spec to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` and commit.
7. Self-review the spec: placeholder scan, internal consistency, scope check, ambiguity check. Fix
   inline.
8. Ask the user to review the written spec before planning.

Spec sections to cover: executive summary, architecture, components, data flow, error handling,
testing strategy, and (for builds) deployment.

## Stage 3 fallback — write the plans

For each subsystem, produce a plan file under `docs/superpowers/plans/` following the grammar in
`task-contract.md`. Discipline:

- Map the file structure first — which files each task creates/modifies, one responsibility each.
- Decompose into bite-sized tasks; each step is one 2–5 minute action.
- TDD ordering: failing test → confirm fail → minimal code → confirm pass → commit.
- Apply `conventions.md` to every task.
- Add `Provides:` / `Requires:`, an `Effort:` line (required; `low|medium|high|xhigh|max`), a
  `Model tier:` line where it differs from `standard` (pin rule: gated/security/`xhigh|max` tasks
  are `top` — `model-routing.md`), and exactly one gate per task (the contract's extension over
  vanilla
  writing-plans).

### Plan self-review (run yourself, no subagent needed)

1. **Spec coverage** — point each spec requirement to a task; list gaps and add tasks for them.
2. **Placeholder scan** — remove every forbidden pattern from `conventions.md`.
3. **Type consistency** — a method named `clearLayers()` in Task 3 and `clearFullLayers()` in Task 7
   is a bug. Names, signatures, and property names must match across tasks. This is the single most
   common failure when tasks are built by different stateless executors — check it hard.

## Stage 4 fallback — review and manifest

- Run the reviewer prompt from `task-contract.md` over each plan; fix blocking issues inline.
- Emit `docs/superpowers/manifest.json` as a **projection of the plans** (`task-contract.md` §2):
  every task's `gate`, `files`, `effort`, `provides`, `requires`, and `commit` — plus `model_tier`,
  present iff the plan carries a `Model tier:` line — byte-match its plan
  block; every deploy/key/fund task carries `human_gate: true`; every task has an `Effort:` line;
  no gated/security/`xhigh|max` task carries a `Model tier:` below `top` (`model-routing.md`).
- Validate — all six Stage-4 checks: clean parse + valid DAG, zero unmatched `requires`,
  manifest⇄plan equality, Effort present, human-gate coverage, model-tier pin coverage (kernel
  validator if available, else by hand — see `../architect/SKILL.md` Stage 4). Not done until it
  passes.
- Stop planning and hand off to the build per architect Stage 4: **Claude-Code-native** (the
  `orchestrator` builds it in-session via subagents) or **external-pool** (stop at the manifest for a
  separate kernel). Do not use the vendored `writing-plans` raw execution handoff, and do not emit its
  `REQUIRED SUB-SKILL` header.
