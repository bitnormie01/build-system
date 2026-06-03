# Mastermind decision — move:2 escalation (2026-06-03, run 2)

**Verdict: HOLD for human / infra recovery. NOT a re-plan, NOT a re-decompose, NOT a plan fix.**
move:2's task, plan, and code are blameless. The gate never executed.

## Evidence

Escalated gate output:

```
repo sync failed: git worktree add -f /tmp/tollgate-worktrees/slot-0 main
failed in /tmp/tollgate-target:
```

This is a `SyncError` from `src/repo.ts:108-109`, raised **before** the gate command
(`sui move test`) ever runs. It tells us nothing about move:2.

Direct verification:
- `/tmp/tollgate-target` (configured `repo.dir`) **does not exist**.
- `/tmp/tollgate-worktrees` (configured `worktreeRoot`) **does not exist**.
- `syncWorktree` runs `git worktree add` with `cwd = repoDir`; that cwd is gone, so the
  command fails. The kernel never seeds/re-clones `repo.dir` (GitRepoOptions: "must already
  be a git repo"), so there is no recovery path — every task will now fail identically.
- `run2.log`: this run rebuilt the pipeline cleanly (agent:1/4/5, middleware:1/2/4 green;
  **move:1 passed gate, committed e43cfe9**, then move:2 dispatched). A `=== RESTART (detached)
  09:12:40 ===` followed; the kernel "recovered in-flight task move:2" and from that point
  every move:2 attempt died at repo-sync, not at the test.

## Root cause

The kernel was restarted at 09:12:40 and `/tmp` had been cleared in the interim. The canonical
repo and all worktrees live under ephemeral `/tmp` and did not survive. They are placed there
because `assertSafeRealRepo` refuses any path under `$HOME` in this nested layout (see config
`_comment` and memory `tollgate-build-wiring`). The safety guard pushed the single source of
truth onto non-durable storage.

This is a **third, distinct** failure mode, separate from the two prior move:2 escalations:
- `2026-06-03-move2-gate-failure.md` — stale-worktree merge-back clobbered move:1's files.
- this one — the entire canonical repo directory vanished (ephemeral `/tmp` wiped on restart).

## Impact — likely data loss

The product commits from run 2 (move:1 e43cfe9, agent:1/4/5, middleware:1/2/4) lived only in
`/tmp/tollgate-target`. No copy survives anywhere on disk; the product code never lived in the
`build-system` kit repo (the only repo with a GitHub remote). **Whether the work is recoverable
depends entirely on whether `/tmp/tollgate-target` had its own `origin` remote that was pushed
to** (commitTask pushes when `hasRemote()`). That cannot be verified now — the repo is gone.
If it had no remote, run 2's entire build output is lost and must be rebuilt from the manifest
(the manifest itself is safe in `build-system`, and move:1/2/3 already show `pending`).

## Human-review action items

1. **Move the canonical repo + worktree root onto durable storage.** Resolve the tension with
   `assertSafeRealRepo`: either relax the guard to permit a designated durable build path, or
   point `repo.dir`/`worktreeRoot` at a persistent volume that isn't `$HOME` and isn't `/tmp`.
2. **Give `repo.dir` a real `origin` remote and confirm pushes succeed**, so canonical state
   survives a sandbox/`/tmp` wipe. Single-source-of-truth must be durable, not ephemeral.
3. **Kernel: distinguish infra/sync faults from gate failures.** A `SyncError` happens before
   the gate and says nothing about the task — it must NOT consume task attempts or escalate to
   the mastermind as a correctness call. It burned 2/2 of move:2's attempts here. Halt/pause the
   run and alert instead.
4. **Kernel: a missing `repo.dir` should fail fast at startup**, not surface as a per-task gate
   failure. `syncWorktree` should detect an absent/invalid `repoDir` and stop the whole run.
5. **Stop the detached run** (restarted 09:12:40) — it will spin and escalate identically on
   every pending task until `repo.dir` is restored.

## Do NOT

- Do not re-plan or re-decompose move:2. Nothing about the task is implicated.
- Do not mark move:2 `failed` for cause. It is blocked on infrastructure, not on its spec.
