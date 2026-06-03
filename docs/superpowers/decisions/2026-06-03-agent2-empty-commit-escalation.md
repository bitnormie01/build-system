# Mastermind decision — agent:2 "gate failure" escalation (2026-06-03)

**Task escalated:** `agent:2` — payAndRetry.ts (autonomous 402 → pay → retry)
**Reported gate:** `npx vitest run packages/agent/src/payAndRetry.test.ts` → expect `passed`
**Actual escalation output:** `commit failed: task agent:2 produced no file changes (refusing an empty commit)`
**Failed attempts:** 2 (kernel retries exhausted, escalated to mastermind)

## Verdict: ACCEPT agent:2 as `done`. This was a spurious escalation, not a real failure. The defect is in the KERNEL — HOLD the build for human review.

NOT a re-plan, NOT a re-decompose. agent:2's product code is correct, complete, and
its gate passes. The escalation is a symptom of two kernel-mechanical defects.

## Evidence (verified, not asserted)

1. **agent:2 is already built and committed.** Commit `96a2c2f` ("feat(agent): add
   tollgate pay and retry fetch") added `payAndRetry.ts` (+191) and
   `payAndRetry.test.ts` (+173). Both present in HEAD tree.
2. **The gate genuinely passes.** After `npm install` in canonical `/tmp/tollgate-target`,
   `npx vitest run packages/agent/src/payAndRetry.test.ts` → **Test Files 1 passed,
   Tests 4 passed**. Output contains `passed`. Confirmed with my own eyes.
3. **`provides` are satisfied:** file exports `createTollgateFetch`, `TollgateFetch`,
   `TollgateFetchDeps`, and the three error classes; imports `buildPayTx` (shared:7),
   `PaymentChallengeSchema` (shared:2) per its `requires`. (No `openai` import, so the
   reopened-agent:1 openai gap does not affect this task.)
4. **The "empty commit" is the manifest-status desync.** A built task re-dispatched onto
   a fresh worktree at HEAD finds its file already present, produces no new changes, and
   the kernel's empty-commit guard refuses → escalated to me as a gate failure.

## CRITICAL — emergency containment already performed

While investigating I found the **canonical repo working tree had been completely wiped**:
all 816 tracked files deleted from disk and staged as deletions in the index of
`/tmp/tollgate-target`. HEAD (`96a2c2f`) was intact, so this was uncommitted corruption.
**One more kernel merge-back (`git add -A && git commit`) would have committed the deletion
of the entire project on top of agent:2's work.**

- Action taken: `git reset --hard HEAD` in `/tmp/tollgate-target` → all 816 files restored,
  working tree clean. Lossless (HEAD was intact).
- This is the `tollgate-stale-worktree-clobbers-canonical` pattern, now caught mid-flight
  and confirmed as an active, recurring threat.

## Systemic finding: the manifest is massively desynced from reality

The manifest records only **2 of 36 tasks done** (shared:1, dashboard:1) — yet the target
repo has **22 commits** representing ~20 built tasks across move, shared, middleware, agent,
dashboard, and deploy-demo. The scheduler's source of truth is frozen while executors keep
building and merging. Consequences:
- The scheduler re-dispatches already-built tasks → empty-commit escalations (this one;
  prior session saw the same for shared:1 / dashboard:1).
- DAG integrity is violated: agent:2 is genuinely `done` while its dependency agent:1 reads
  `pending` — a done→pending edge that only the desync can produce.

## Directives to the kernel / human reviewer

1. **Accept agent:2 = `done`** (this commit reconciles it, same pattern the prior session
   used for shared:1 / dashboard:1).
2. **Fix the merge-back status write (root cause #1).** The kernel must set a task `done`
   in the manifest atomically with merging its commit back to canonical. Until it does,
   every built task re-escalates and the manifest cannot be trusted.
3. **Fix the canonical-clobber (root cause #2, dangerous).** The kernel's worktree→canonical
   sync wiped the canonical working tree. It must never stage a stale/empty worktree tree
   over canonical, and must refuse a merge-back whose diff is a mass deletion of unrelated,
   passing files (a blast-radius guard already exists at v0.3 — verify it covers this path).
4. **HOLD further dispatch** until #2 and #3 land. Continuing will keep generating spurious
   escalations and risks re-triggering the clobber, which could commit next time.
5. **Reconcile the manifest** against committed reality before resuming — re-derive `done`
   from "deliverable committed at HEAD AND gate re-run green", task by task. Do not mass-mark
   on commit-presence alone; the prior agent:1/openai case proves a commit can exist while a
   dependency-resolving gate would still fail.

## Not for the architect (this is not a plan defect)

The plan and decomposition are sound; executors are meeting the task contract. Nothing here
routes to a re-plan. The fixes are in the kernel's merge-back / status-recording / worktree
sync logic.
