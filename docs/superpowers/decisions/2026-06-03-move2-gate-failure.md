# Mastermind decision — move:2 gate failure (2026-06-03)

**Task that failed:** `move:2` — mock_usd demo coin (6-decimal mintable stablecoin)
**Gate:** `sui move test --path move/tollgate` → `No such file or directory (os error 2)`
**Failed attempts:** 2 (kernel retries exhausted, escalated to mastermind)

## Verdict: HOLD the build for kernel/human repair. move:2 is blameless.

NOT a re-plan and NOT a re-decompose. move:2's task spec, DAG edge (`depends_on:
move:1`), and gate are all correct. The gate did not fail on the test — it failed
because the package directory it points at **no longer exists on the canonical
branch**. This is committed corruption of the canonical history, which is the
kernel's integration to fix, not the executor's or the architect's.

Re-planning or re-dispatching move:2 as-is would loop forever: every fresh worktree
is cut from a HEAD that is missing its dependency.

## Root cause (evidenced)

The canonical branch silently lost the entire Move package between move:1 landing and
move:2 being dispatched.

1. `move:1` ("scaffold tollgate Move package", commit `cb46ae6`) correctly landed
   `move/tollgate/Move.toml`, `Move.lock`, `sources/.gitkeep`, `tests/.gitkeep`.
   Status `done` is legitimate — the files were really committed.
2. The **very next commit**, `253e0b4` (`middleware:4` — "self-contained paid tool
   handlers"), shows: **2 files added** (`packages/middleware/src/tools.ts` +
   `.test.ts` — its real work) and **353 files deleted — every one of them under
   `move/tollgate/`** (`git show 253e0b4 --name-status` → non-move deletions: zero).
3. History is **linear, no merge commit** (`git log --graph`). So `253e0b4` did not
   "merge away" move/ — the kernel committed middleware:4's **entire stale worktree
   tree** as the new canonical state. That worktree was branched from a base BEFORE
   `cb46ae6` (i.e. `d1c5dc6`), so it never contained move/; replacing HEAD with it
   reverted move:1 wholesale.
4. `move:2`'s executor was then dispatched on a fresh worktree at canonical HEAD
   (`9d7ff14`), which no longer contains `move/tollgate` →
   `sui move test --path move/tollgate` → `No such file or directory`. move:2's code
   never ran against its dependency.

Verified: `git cat-file -e HEAD:move/tollgate/Move.toml` → **absent from HEAD**;
present at `cb46ae6`. `git log --diff-filter=D -- move/tollgate/Move.toml` → `253e0b4`.

## Why this is an escalation of the agent:3 finding

The 2026-06-03 agent:3 decision already flagged: *"slot-0 carried stale cross-task
deletions … each task must run on a clean worktree at canonical HEAD."* There the
contamination only sat in a **working tree**. Here the same stale-base worktree was
**committed to main**, so the corruption is now permanent in history and will keep
breaking every move task. The hygiene bug graduated from latent to load-bearing.

## Directives to the kernel / human (recovery order)

1. **PAUSE dispatch.** The mechanism is systemic: any task whose worktree base
   predates a concurrently-landed sibling can silently revert that sibling on
   merge-back. Do not run more tasks until the integration path is fixed.
2. **Fix the integration (kernel bug, root cause).** A task's result must be applied
   as **its own diff** onto canonical HEAD (rebase-then-cherry-pick / 3-way apply of
   only the task's declared files), **never** by replacing HEAD with the worktree's
   full tree. Worktrees must be re-based to current canonical HEAD immediately before
   merge-back. With `concurrency: 2` this race is reproducible, not a fluke.
3. **Restore move:1's output** to canonical HEAD: reinstate
   `move/tollgate/{Move.toml, Move.lock, sources/.gitkeep, tests/.gitkeep}` from
   `cb46ae6`. **Do NOT** restore `move/tollgate/build/` — move:1 also wrongly
   committed ~350 files of compiled bytecode output; add `move/tollgate/build/` to
   `.gitignore` as part of the restore.
4. **Audit the whole branch for other silent clobbers.** For every committed task,
   assert it only touched its own declared files and deleted no sibling's. `253e0b4`
   is the confirmed offender; with this race, others may be hiding (they passed
   because their own gates — npm/vitest in `packages/` — never touch the clobbered
   paths).
5. **Reset the canonical working tree.** `/tmp/tollgate-target` currently has its
   **entire source tree staged as deleted** (32 `D` entries spanning every package +
   root config) with no merge in progress — left mid-operation by the broken
   integration. `git reset --hard` to a known-good HEAD after the restore.
6. **Hold `move:2` (and `move:3`) as blocked-on-canonical-repair, NOT failed.**
   Re-dispatch on clean worktrees once steps 2–5 land; the gate will then run against
   a real package.

## Flag for re-planning (architect path)

Minor, secondary to the kernel bug: move:1's gate (`sui move build`) proves the
package compiles but says nothing about whether its files survive integration, and it
let the compiled `build/` output get committed. Scaffold tasks that create a package
directory should `.gitignore` build output and the kernel should treat any task that
**deletes files it did not declare** as an automatic integration failure, not a
commit.
