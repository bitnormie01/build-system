# Mastermind decision — dashboard:1 "failure" (2026-06-03)

## Verdict
**dashboard:1 is DONE — not a real failure. Do NOT re-plan, do NOT re-decompose.**
**The run is HELD for human/kernel review of two kernel-level state bugs (below).**

## What was escalated
Task `dashboard:1` (Scaffold the Vite React app) "failed its gate after retries". Actual gate output:
`commit failed: task dashboard:1 produced no file changes (refusing an empty commit)`.
That is not a test failure — the executor produced an empty diff.

## Diagnosis (evidence)
- All 9 of dashboard:1's declared files exist in canonical HEAD (`600c1ef feat: scaffold dashboard vite app`).
- I re-ran the gate myself in a clean worktree (slot-0):
  - `npx vitest run --config packages/dashboard/vitest.config.ts packages/dashboard/src/Hello.test.tsx` → **Tests 1 passed (1)**.
  - shared:1 gate (its dependency) `npx vitest run packages/shared/src/version.test.ts` → **1 passed**.
- So the deliverable is genuinely complete and committed. The empty diff is because the executor was
  re-dispatched onto a fresh worktree cut at HEAD that **already contained** the committed scaffold.

## Root cause #1 — manifest status desync (cause of this escalation)
The kernel is **not marking tasks `done` after a successful merge-back**. Every one of the 36 tasks is
still `pending`, yet 7 are already committed in HEAD and built:
`move:1, move:2, move:3, shared:1, agent:1, agent:3, dashboard:1`.
The scheduler therefore re-dispatches already-built tasks → empty diff → spurious "no file changes"
failure. dashboard:1 was simply the first to surface; `move:1`, `agent:1`, etc. are identical landmines
that will each escalate the same way.

**Kernel fix required:** on merge-back, set the task `status` to `done`, and reconcile the existing
committed-but-`pending` tasks listed above. Until then, the escalate path will keep firing false alarms.

## Root cause #2 — canonical working tree clobbered (LATENT, HIGH SEVERITY)
`/tmp/tollgate-target` HEAD (`600c1ef`) is intact and contains the full build, **but its working tree
has 785 staged deletions** — every tracked file is staged for removal while HEAD is fine. This is the
known `tollgate-stale-worktree-clobbers-canonical` failure mode, live.
- The build is still fully recoverable (deletions are uncommitted).
- **Danger:** any `git commit` in that repo — including a kernel merge-back that applies a stale
  worktree's full tree — will wipe the entire build from `main`.

**Action:** do not run any merge-back until the kernel's merge-back logic is fixed to merge *changes*
(not apply a full stale tree), and the canonical working tree is restored (`git -C /tmp/tollgate-target
checkout -- .` against HEAD `600c1ef`). I did not touch the canonical repo's git state to avoid
colliding with an in-flight kernel operation.

## What I changed
- Manifest: `shared:1` and `dashboard:1` → `status: done` (both gate-verified by me, evidence above).
  Manifest is untracked kernel-side state, so this is a local reconciliation, not a build-repo commit.
- I did NOT mark `move:1/2/3` or `agent:1/3` done — their work is committed but I have not run their
  gates. They belong to the same desync and the kernel fix should reconcile them.

## Recommended next steps (for the kernel/human, in order)
1. Restore canonical working tree from HEAD `600c1ef`; confirm `move`, `packages/*` are present.
2. Fix merge-back to never apply a stale full tree (root cause #2).
3. Fix merge-back to mark task `done` on success + reconcile the 7 committed-but-pending tasks (#1).
4. Resume the run. dashboard:2 stays correctly blocked (needs shared:5, still pending) — nothing
   downstream is unsafely unblocked by my two status updates.
