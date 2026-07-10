# Conventions

The architect injects these into every plan, and the orchestrator pastes them into every executor
prompt. They are the standing rules a stateless executor needs but can't infer.

## Decomposition discipline

- **DRY, YAGNI, TDD, frequent commits.** Every feature task is: failing test → confirm fail →
  minimal code → confirm pass → commit. No feature code lands without a test that drove it.
- **One responsibility per file.** Prefer small, focused files. Files that change together live
  together; split by responsibility, not by technical layer.
- **No placeholders.** "TODO", "add validation", "handle edge cases", "similar to Task N", or a step
  that says what to do without showing how — all forbidden. The executor has no context to fill
  gaps. Repeat code rather than cross-referencing; tasks may be built out of order on different
  accounts.
- **Exact paths, complete code, exact commands.** Every file path is literal. Every code step shows
  the full code. Every command step shows the command and its expected output.
- **Self-containment over brevity.** If a task uses a type or function from an earlier task, paste
  that signature into this task. Never rely on "the executor will remember" — it won't; it may be a
  different agent on a different account.

## TypeScript / Node

- **`strict` mode on.** ESM modules. Node ≥ 20.
- **Never `as any`.** When a cast is unavoidable, use `as unknown as T` with an explicit target
  type `T`. A bare `as any` in a plan is a review-blocking issue.
- Pin meaningful dependency versions in the plan's Tech Stack header (e.g. `viem ^2.21.0`).
- Prefer named exports; one clear public surface per module.

## Solidity (when relevant)

- Pin the compiler (`pragma solidity 0.8.x;` and matching `foundry.toml`).
- `SPDX-License-Identifier` on every file.
- Tests are Foundry: unit + invariant + fork where the spec calls for it. The gate command is the
  specific `forge test --match-test ...` for that task, with expected pass output.

## Sui Move (when relevant)

- Pin the toolchain: the `sui` CLI version in the plan's Tech Stack header and `edition = "2024"`
  (or the spec's pinned edition) in `Move.toml`.
- **No hardcoded addresses.** Package and dependency addresses go through named addresses in
  `Move.toml`; deployed object/package IDs live in config or env var names, never in source.
- Capability-gated entry points: any function that mutates owner-controlled state takes the
  capability object as a parameter — never an address-equality check. Make ownership/transfer
  decisions (`key`/`store`, shared vs owned) explicit in the task body, not implied.
- Abort codes are named `const` values, one per failure mode — a bare `abort 0` is a
  review-blocking issue.
- Tests are `sui move test`, colocated `#[test]` modules. The gate command is the specific
  `sui move test --filter <test_name>` (or test module) for that task, with expected pass output.
  On-chain integration steps against a network are separate tasks and `human_gate: true` when they
  spend or deploy.

## Safety (non-negotiable)

- **Never put a private key, mnemonic, or secret in plaintext** in a plan, task, prompt, commit, or
  log. Plans reference secrets only as env var names (e.g. `DEPLOYER_PK`), never values.
- A key that has been exposed anywhere is **compromised** — the plan must treat it as burned and
  rotate, never reuse. (A campaign **burner wallet** — fresh, testnet-only, faucet-funded — is
  created as disposable, so exposure burns nothing of value; the minimize-exposure and never-commit
  rules still apply to it — see `../gate-concierge/SKILL.md`.)
- Deployment / key-operation / fund-movement steps are flagged `human_gate: true` in the manifest
  (canonical spelling — snake_case, defined in `task-contract.md` §2; never `human-gate`). The
  autonomous pool prepares them but a human runs them. Executors never broadcast signed transactions
  or move funds autonomously. "A human runs them" has three valid forms: the user executes the step
  directly; the user gives an explicit per-gate "continue" to the **gate-concierge** — a
  user-side seat (`../gate-concierge/SKILL.md`) that executes it under their eyes with their granted
  tooling; or the user **pre-consents in a locked campaign contract** (autopilot mode —
  `campaign-contract.md`), which enumerates the gate classes specifically, and the autopilot
  executes those under the same evidence/ledger rules the concierge follows. In every form the
  pipeline itself never auto-runs a gated step. In the interactive forms, consent never carries
  from one gate to the next; under a locked contract, consent carries exactly as far as the
  contract's enumeration and no further — and the never-consentable floor
  (`campaign-contract.md` §Never-consentable floor) is beyond any consent form.

## Spec / plan hygiene

- Each subsystem produces working, independently testable software on its own.
- The spec is the single source of truth. On any conflict between agent memory and a written
  file, **the file wins** — always.
- State lives in files (`manifest.json`, the plans, the spec), not in an agent's head, so that a
  fresh or rotated agent can pick up mid-build with zero loss.

## The repo is the single source of truth

These files don't live "on disk somewhere" — they live in the **git repo**. "The repo" means the
**project repo**, never the build-system kit checkout — `repo-bootstrap.md` defines the
distinction, the boot-time resolution order, and how the first step that needs it creates the
project repo via the user's logged-in `gh` when none was provided. Local working copies go
stale the moment the architect regenerates the system or another worker commits. So every agent, in
every role, obeys the same two-sided rule:

- **Before starting any work — sync from the repo.** Fetch and check out the canonical branch, then
  read the spec, plans, `manifest.json`, and these conventions *from the synced repo*. Never act on
  whatever local files happen to be lying around in the sandbox — they may predate the current
  system. The kernel places each worker on a fresh worktree at canonical `HEAD`; if you ever doubt
  freshness, re-sync before reading.
- **Before reporting done — get your output into the repo.** Your output isn't real until it's a
  commit on the canonical branch (or a pushed branch the mastermind merges). Nothing important stays
  only in a local working copy. **Who runs `git commit` depends on the role:** the architect and
  mastermind commit and push their own artifacts. The **executor never commits** — the kernel
  re-runs the task's gate and then commits exactly the task's declared files itself, so the
  executor's job ends at "files changed in the worktree, gate passing."

On any conflict, the **committed repo state wins** over a local copy — same principle as "the file
wins over memory," one level up. This is what lets the architect change the system mid-build and
have the next agent that boots automatically pick up the new version: it pulled, so it sees it.
