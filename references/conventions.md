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

## Safety (non-negotiable)

- **Never put a private key, mnemonic, or secret in plaintext** in a plan, task, prompt, commit, or
  log. Plans reference secrets only as env var names (e.g. `DEPLOYER_PK`), never values.
- A key that has been exposed anywhere is **compromised** — the plan must treat it as burned and
  rotate, never reuse.
- Deployment / key-operation steps are flagged `human-gate: true` in the manifest. The autonomous
  pool prepares them but a human runs them. Executors never broadcast signed transactions or move
  funds autonomously.

## Spec / plan hygiene

- Each subsystem produces working, independently testable software on its own.
- The spec is the single source of truth. On any conflict between agent memory and a written
  file, **the file wins** — always.
- State lives in files (`manifest.json`, the plans, the spec), not in an agent's head, so that a
  fresh or rotated agent can pick up mid-build with zero loss.

## The repo is the single source of truth

These files don't live "on disk somewhere" — they live in the **git repo**. Local working copies go
stale the moment the architect regenerates the system or another worker commits. So every agent, in
every role, obeys the same two-sided rule:

- **Before starting any work — sync from the repo.** Fetch and check out the canonical branch, then
  read the spec, plans, `manifest.json`, and these conventions *from the synced repo*. Never act on
  whatever local files happen to be lying around in the sandbox — they may predate the current
  system. The kernel places each worker on a fresh worktree at canonical `HEAD`; if you ever doubt
  freshness, re-sync before reading.
- **Before reporting done — commit and push back to the repo.** Your output isn't real until it's a
  commit on the canonical branch (or a pushed branch the mastermind merges). Nothing important stays
  only in a local working copy.

On any conflict, the **committed repo state wins** over a local copy — same principle as "the file
wins over memory," one level up. This is what lets the architect change the system mid-build and
have the next agent that boots automatically pick up the new version: it pulled, so it sees it.
