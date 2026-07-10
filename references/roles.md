# Roles

This is the kernel's wiring sheet and your map of the system. It documents which kit each role holds
and what the kernel delivers to whom. **It is not delivered into any pipeline role's context** — the
architect, mastermind, and executor see only their own kit plus the shared contract. (User-side seats
are different: the `guide` — the user's mission-control session — a manager-mode session, the
`gate-concierge` — the Step-3 seat (a preflight pass after the architect, a closing pass after the
build) that executes human-gated steps only on the user's per-gate consent — `demo-studio` — the
Step-2.5 seat that records and uploads the demo video only on the user's recording/upload consents —
and the `autopilot` — the full-campaign autonomous mode that performs the guide's handovers itself
under a locked campaign contract (`campaign-contract.md`) —
sit on the kernel/human side of the table and hold this map by design; they advise, verify,
unblock, and run consented gates, but never extract, ideate, plan, or build — the autopilot being
the one scoped exception: under its locked contract it orchestrates Step 2 inline, dispatching
executor subagents and never writing product code itself, and may run an MCP-bound step inline
under its documented row-17 fallback.) Keeping role boundaries
here (not in the pipeline agents) is what enforces isolation: no role can peek at another's skills.

**Autopilot mode** (`../autopilot/SKILL.md`) is a third way to *drive* the same configurations, not
a third configuration: one persistent session collects and locks the user's constraints and
consents up front (the campaign contract), then dispatches each pipeline step as a **fresh
subagent** (fresh context, so session discipline survives) and plays the orchestrator **inline**
for Step 2. Role isolation holds — each step subagent receives only its own kit + its kickoff +
the contract slice it consumes, never the map. (The row-17 inline fallback trades this locally:
a step it runs inline executes in the map-holding session — a documented, reported degradation,
never a silent one.)

## The three roles over one shared structure

All three follow the same shared structure — `task-contract.md`, `conventions.md`, and the repo
itself — but each holds an isolated, scoped skill kit. They never share skills; they only share the
architect's output (spec, plans, manifest) via the repo.

| Role | Skill kit (isolated) | Reads from repo | Writes to repo |
|------|----------------------|-----------------|----------------|
| **architect** | brainstorming, writing-plans (+ writing-skills optional) | idea + reference docs | spec, plans, `manifest.json` |
| **mastermind** | self-contained escalation doctrine (evidence-first diagnosis, failure classification, VERDICT protocol) — inlined in its SKILL.md, no external skills | failing task block + gate output (+ the failing worktree when available) | a structured `VERDICT: retry \| replan \| human` (logged by the kernel) |
| **executor** | self-contained build doctrine (test-first loop, verify-before-done, root-cause debugging, RESULT protocol) — inlined in its SKILL.md, no external skills | its one task + required upstream signatures | the built task (file changes in its worktree — the kernel gates, scope-checks, and commits them) |

Only the **architect** (and idea-forge / resource-extractor upstream of it) runs as an interactive
session where superpowers skills may exist — it is bootstrapped with **using-superpowers** when installed. When
superpowers is absent, the architect falls back to the **vendored pinned copies** embedded at
`references/vendor/superpowers/` (brainstorming + writing-plans, followed verbatim as documents;
see `vendor/superpowers/UPSTREAM.md`), with `pipeline-fallback.md` as a condensed checklist. The mastermind and executor kits are delivered into
**headless one-shot prompts** by the kernel: they can reference no external skill, so everything
they need is written inline in their SKILL.md files.

## Two run configurations

The three roles above are wired by a deterministic kernel in the **external-pool** config. There is a
second, default config that builds **inside Claude Code** with no kernel:

| Config | Planner | Builder | Who orchestrates |
|--------|---------|---------|------------------|
| **Claude-Code-native** (default) | resource-extractor → idea-forge → architect | Claude Code subagents (each = `executor`) | the **orchestrator** — one Claude Code session (`../orchestrator/SKILL.md`) that plays kernel + mastermind + reviewer |
| **External-pool** (optional) | resource-extractor → idea-forge → architect | stateless multi-account pool (each = `executor`) | a deterministic **kernel** (your code, not in here) + the `mastermind` on escalation |

In Claude-Code-native mode there is no kernel binary, no account rotation, and no headless kit
delivery: the orchestrator reads the plans from the repo, dispatches a subagent per task with the
`executor` kit + the task block per `../references/task-contract.md` §3, and does the gate/scope/commit
itself. Everything below about kernel delivery, rotation, and the effort→CLI-flag mapping is the
**external-pool** config; the orchestrator is the native-mode equivalent and holds those jobs itself.

## The kernel's two jobs (external-pool config)

The kernel is deterministic code, not an LLM. It is the only **pipeline-side** component that knows
all three kits exist — that's what makes isolation possible. (User-side seats — the `guide`, a
manager-mode session, the `gate-concierge`, `demo-studio`, and the `autopilot` — also hold the
map, by design; see the note at the top of this file.)

1. **Deliver the right kit at boot.** Before any agent works, the kernel assembles its context:
   that role's `SKILL.md` + `references/task-contract.md` + `references/conventions.md` + (for the
   executor) the one task block and the upstream signatures it `requires`. The kernel never delivers
   another role's kit, and never delivers this `roles.md`.
2. **Rotate the executor on rate-limit.** When an account hits its limit, the kernel swaps to the
   next available account and re-dispatches — re-delivering the executor kit fresh. The account is
   just a credential; the kit and task come from the single source each time, so a rotation changes
   nothing the executor can observe.

When it dispatches a task, the kernel also sets that task's reasoning **effort** as a launch flag on
the CLI invocation (`task.effort` → the per-CLI flag in `task-contract.md` §6) — per dispatch, never
mutated mid-run. Effort is the budget throttle, so it influences how soon a rotation happens.

The kernel also runs the deterministic plumbing around these: compute dependency-ready tasks from
the manifest, run gate commands, record status, and escalate judgment calls to the mastermind. None
of that lives in an LLM.

## Two operating modes, same wiring

The kernel's jobs above are mode-independent. What differs is who turns the crank:

- **Loop mode** (`kernel run`) — the kernel iterates autonomously; the mastermind is consulted only
  on escalation. Best unattended.
- **Manager mode** — a strong LLM session (the mastermind seat, in practice) drives the kernel's
  verbs one step at a time and **reviews every gate-passed diff before the kernel commits it**. The
  mastermind's review duty from the table above moves inline, in front of each commit, instead of
  before merge. Kit isolation, gates, scoped commits, and rotation stay in the kernel either way.
  Protocol: the kernel repo's `MANAGER.md`.

## Boot discipline (all roles)

Every role, every dispatch, follows the same two-sided repo rule (full text in `conventions.md`):

1. **Resolve, then sync the canonical repo first** — "the repo" is the **project repo**, resolved
   (and created, if the user provided none) per `repo-bootstrap.md`; never the build-system kit
   checkout. Work from it, not from stale local files.
2. **Commit and push before reporting done** — output isn't real until it's in the repo.

This is what lets the architect regenerate the system mid-build and have the next agent that boots
pick up the change automatically — it pulled, so it sees it.

## Mid-build regeneration (what the kernel owes in-flight work)

"The next agent that boots pulls the new system" holds only for agents that have **not started**.
Tasks already dispatched against the *previous* manifest are the hazard: a stateless executor got its
task block and upstream signatures at dispatch and does **not** re-read the manifest mid-run, so it
cannot know the plan changed under it. When the architect regenerates spec/plans/manifest during an
active build, the kernel MUST:

1. **Quiesce, don't clobber.** Refuse to commit any in-flight task whose `id`, `files`, `gate`, or
   `provides` changed under it; re-dispatch it fresh against the new manifest.
2. **Invalidate stale consumers.** If a task's `provides` signature changed, every already-committed
   task built against the *old* signature is now wrong — mark its subtree for replan/rebuild. Two
   committed files disagreeing is exactly the case "the file wins over memory" does **not** resolve.

Because regeneration disrupts running work, prefer to land it at a checkpoint (no tasks dispatched).
Regenerating between builds is free; regenerating during one is a controlled operation, not a casual
push.

## Delivery matrix (what the kernel hands each role)

| Delivered | architect | mastermind | executor |
|-----------|:---------:|:----------:|:--------:|
| own `SKILL.md` | ✓ | ✓ | ✓ |
| `task-contract.md` | ✓ | ✓ | sliced* |
| `conventions.md` | ✓ | ✓ | ✓ |
| spec / plans (from repo) | writes | reads | — |
| `manifest.json` (from repo) | writes | reads | — |
| one task block + its `requires` signatures | — | — | ✓ |
| another role's kit | ✗ | ✗ | ✗ |
| this `roles.md` | ✗ | ✗ | ✗ |

\* The executor receives `task-contract.md` only up to the `EXECUTOR-KIT-END` marker (§1–§3.1 —
the plan grammar, field meanings, and its own output protocol). §4–§6 are reviewer/kernel-side
material an executor never acts on; slicing them out cuts every dispatch's prompt weight.
