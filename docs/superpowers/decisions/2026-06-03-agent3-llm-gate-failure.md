# Mastermind decision — agent:3 gate failure (2026-06-03)

**Task that failed:** `agent:3` — llm.ts (DGrid OpenAI-compatible client)
**Gate:** `npx vitest run packages/agent/src/llm.test.ts` → `Cannot find package 'openai'`
**Failed attempts:** 2 (kernel retries exhausted, escalated to mastermind)

## Verdict: reopen upstream `agent:1`; agent:3 is a symptom, not the defect.

NOT a re-plan of agent:3 and NOT a re-decompose. agent:3's product code (`llm.ts`)
is correct and matches spec. The failure is an incomplete upstream task plus a gate
too weak to catch it.

## Root cause (evidenced)

1. `agent:1` ("scaffold @tollgate/agent", commit `ffb465d`) committed
   `packages/agent/package.json` **without** the `openai ^6.41.0` dependency — even
   though its own plan (Task 1, Step 1) lists it explicitly.
   - `git show ffb465d:packages/agent/package.json` → deps = `@tollgate/shared` only.
2. agent:1's gate was `npx vitest run banner.test.ts`. banner.test never imports
   openai, so the gate passed green on a scaffold that had silently dropped a
   declared dependency. agent:1 was marked `done` on a gate that could not detect it.
3. Because openai was absent when agent:1 ran `npm install` (Step 4), node_modules
   never received it (`npm ls openai` → empty).
4. agent:3 wrote correct llm.ts, then tried to compensate by editing package.json to
   add openai (uncommitted `M` diff in slot-0) but **did not re-run `npm install`** →
   gate hit `Cannot find package 'openai'`.

Patching slot-0 locally would produce a false green: the canonical repo's committed
`packages/agent/package.json` still lacks openai, so every fresh worktree re-derived
from HEAD breaks again. The fix must land as a commit.

## Directives to the kernel

1. **Reopen `agent:1` → pending, re-dispatch.** Scope: commit
   `packages/agent/package.json` WITH `openai ^6.41.0` (per its plan Step 1) and run
   `npm install` (Step 4) so node_modules resolves openai in the canonical scaffold.
2. **Hold `agent:3` as blocked-on-agent:1, NOT failed.** Drop agent:3's working-tree
   package.json edit — that file is agent:1's responsibility. Re-dispatch agent:3
   after agent:1 lands correctly; its gate will then pass.
3. **Worktree hygiene (kernel):** slot-0 carried stale cross-task deletions
   (`D packages/middleware/src/nonceStore.*`) and sat on a middleware HEAD. Each task
   must run on a clean worktree at canonical HEAD to avoid contamination.

## Flag for re-planning (architect path)

Scaffold tasks that declare a runtime dependency must have a gate that proves the
dependency resolves (e.g. add an `import 'openai'` smoke check or `npm ls openai`
assertion to agent:1's gate). A scaffold gate that only tests a trivial banner cannot
detect a dropped dependency and lets incomplete scaffolds reach `done`. This pattern
(weak gate hides upstream omission) likely affects other scaffold tasks — audit all
`*:1` scaffold gates.
