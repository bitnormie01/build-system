# Roles

This is the kernel's wiring sheet and your map of the system. It documents which kit each role holds
and what the kernel delivers to whom. **It is not delivered into any agent's context** — agents see
only their own kit plus the shared contract. Keeping role boundaries here (not in the agents) is what
enforces isolation: no role can peek at another's skills.

## The three roles over one shared structure

All three follow the same shared structure — `task-contract.md`, `conventions.md`, and the repo
itself — but each holds an isolated, scoped skill kit. They never share skills; they only share the
architect's output (spec, plans, manifest) via the repo.

| Role | Skill kit (isolated) | Reads from repo | Writes to repo |
|------|----------------------|-----------------|----------------|
| **architect** | brainstorming, writing-plans (+ writing-skills optional) | idea + reference docs | spec, plans, `manifest.json` |
| **mastermind** | verification-before-completion, requesting-code-review, finishing-a-development-branch, using-git-worktrees (+ dispatching-parallel-agents, subagent-driven-development as doctrine) | spec, plans, manifest, returned task results | review verdicts, merges, status updates |
| **executor** | test-driven-development, verification-before-completion, systematic-debugging, receiving-code-review | its one task + required upstream signatures | the built task (commit on its worktree branch) |

All three are bootstrapped with **using-superpowers** so their kits trigger reliably.

## The kernel's two jobs (and only these)

The kernel is deterministic code, not an LLM. It is the **only** component that knows all three kits
exist — that's what makes isolation possible.

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

## Boot discipline (all roles)

Every role, every dispatch, follows the same two-sided repo rule (full text in `conventions.md`):

1. **Sync the canonical repo first** — work from it, not from stale local files.
2. **Commit and push before reporting done** — output isn't real until it's in the repo.

This is what lets the architect regenerate the system mid-build and have the next agent that boots
pick up the change automatically — it pulled, so it sees it.

## Delivery matrix (what the kernel hands each role)

| Delivered | architect | mastermind | executor |
|-----------|:---------:|:----------:|:--------:|
| own `SKILL.md` | ✓ | ✓ | ✓ |
| `task-contract.md` | ✓ | ✓ | ✓ |
| `conventions.md` | ✓ | ✓ | ✓ |
| spec / plans (from repo) | writes | reads | — |
| `manifest.json` (from repo) | writes | reads | — |
| one task block + its `requires` signatures | — | — | ✓ |
| another role's kit | ✗ | ✗ | ✗ |
| this `roles.md` | ✗ | ✗ | ✗ |
