# Pipeline Fallback

Use this only when the `superpowers:brainstorming` and `superpowers:writing-plans` skills are NOT
installed in the current environment. It reproduces their essential behavior inline so the architect
kit is portable to any agent. If superpowers IS installed, invoke those skills instead — they're the
maintained source.

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
- Add `Provides:` / `Requires:` and exactly one gate per task (the contract's extension over vanilla
  writing-plans).

### Plan self-review (run yourself, no subagent needed)

1. **Spec coverage** — point each spec requirement to a task; list gaps and add tasks for them.
2. **Placeholder scan** — remove every forbidden pattern from `conventions.md`.
3. **Type consistency** — a method named `clearLayers()` in Task 3 and `clearFullLayers()` in Task 7
   is a bug. Names, signatures, and property names must match across tasks. This is the single most
   common failure when tasks are built by different stateless executors — check it hard.

## Stage 4 fallback — review and manifest

- Run the reviewer prompt from `task-contract.md` over each plan; fix blocking issues inline.
- Emit `docs/superpowers/manifest.json` per the contract.
- Stop. Hand off to the orchestrator. Do not execute tasks in this session.
