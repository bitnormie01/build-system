# Task Contract — the bridge from plans to your executor pool

This file defines the **exact, parseable shape** of a plan document and the **task DAG** it maps
to. It exists because superpowers' `writing-plans` produces plans for *same-session* execution; your
mastermind/executor pool is stateless and rotates across accounts. This contract makes the plans
machine-readable so an orchestrator can distribute them with no copy-paste, and keeps every task
self-contained so a stateless executor can't drift.

## 1. Plan document grammar

Every plan file under `docs/superpowers/plans/` MUST follow this structure. The orchestrator parses
it; deviations break the parser.

```markdown
# <Subsystem> Implementation Plan

**Goal:** <one sentence>
**Architecture:** <2-3 sentences>
**Tech Stack:** <key libs + versions>
**Source spec:** docs/superpowers/specs/<file>.md

---

### Task <N>: <short title>

**Files:**
- Create: `exact/path/to/file.ts`
- Modify: `exact/path/to/existing.ts:120-145`
- Test:   `tests/exact/path/to/file.test.ts`

**Depends on:** Task <M>, Task <K>        # omit if none
**Effort:** medium                         # none|minimal|low|medium|high|xhigh — match to task difficulty
**Provides:** `mintFor(address,uint256) -> uint256`, `type MarketId = bytes32`
**Requires:** `OutcomeToken.balanceOf(address) -> uint256`   # signatures pasted in steps below

- [ ] **Step 1: Write the failing test**
      ```ts
      <complete test code — no placeholders>
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `pnpm vitest run tests/.../file.test.ts`
      Expected: FAIL — "mintFor is not a function"
- [ ] **Step 3: Minimal implementation**
      ```ts
      <complete implementation code>
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- THIS IS THE GATE
      Run: `pnpm vitest run tests/.../file.test.ts`
      Expected: PASS
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      The kernel re-runs the gate, scope-checks the worktree against `Files:`, and commits exactly
      those declared paths itself, with the message below. This step stays in the task block (the
      executor receives the full block per §3) only so the plan reads end-to-end; it is **not** a
      command any agent runs — the executor never touches git and is told to skip it (see
      `../executor/SKILL.md`). The message here is the single authored source for the manifest's
      `commit` field — the two must match byte-for-byte.
      Message: `feat: <message>`
```

### Required fields, formally

| Token            | Rule |
|------------------|------|
| `### Task N:`    | Unique integer (or `N.M` for phased). Becomes the task id. |
| `**Files:**`     | Each line is `Create:` / `Modify:` / `Test:` + a backticked path. |
| `**Depends on:**`| Comma-separated `Task X` refs. Defines DAG edges. Omit if root. |
| `**Effort:**`    | Reasoning level the architect assigns to this task. One of `none\|minimal\|low\|medium\|high\|xhigh`. **Required on every task** — the §5 parser defaults a *missing* line to `medium`, so a dropped or mistyped Effort silently downgrades a hard or security-sensitive task; Stage-4 validation and the §4 reviewer flag its absence. The kernel maps it to the right CLI flag at dispatch (see §6). |
| `**Provides:**`  | Signatures/types/exports this task creates. Downstream tasks may name these. |
| `**Requires:**`  | Signatures consumed from upstream. MUST also appear inline in the step code. |
| `- [ ]`          | One atomic step. Code steps carry a fenced block; command steps carry `Run:`/`Expected:`. |
| The **gate**     | The last `Run:`/`Expected: PASS` step before commit. Exactly one per task. |

## 2. The task DAG (manifest.json)

Stage 4 of the architect emits `docs/superpowers/manifest.json`. This is what the mastermind loads.

**The manifest is a mechanical projection of the plans, never authored independently.** Each task's
`gate`, `files`, `effort`, `provides`, `requires`, and `commit` MUST match its plan task block
byte-for-byte — the manifest is the kernel's machine-readable *view* of the same facts the plan states
for humans and hands to the executor. **Precedence:** the plan is the authored source; the manifest
governs execution. If the two ever disagree, the manifest is *invalid* — regenerate it from the plans;
never "pick the one that looks right." The architect checks this equality at **Stage 4**, after the
manifest is generated (the §4 plan-reviewer runs earlier, over the plans alone, so it cannot). It
matters because a drifted field is the one class of bug neither the executor nor the kernel can catch
alone: the executor proves the **plan's** gate against the **plan's** files while
the kernel runs the **manifest's** gate and commits the **manifest's** files. If they differ, honest
work fails scope-check or a wrong check passes.

```json
{
  "project": "pythia",
  "spec": "docs/superpowers/specs/2026-05-23-pythia-prediction-market-hook-design.md",
  "subsystems": ["contracts", "fulfiller", "frontend", "deploy-and-demo"],
  "tasks": [
    {
      "id": "contracts:0.1",
      "subsystem": "contracts",
      "title": "Initialize repository",
      "plan": "docs/superpowers/plans/2026-05-23-pythia-contracts.md",
      "depends_on": [],
      "effort": "low",
      "files": {
        "create": ["contracts/foundry.toml", "contracts/.gitignore"],
        "modify": [],
        "test": []
      },
      "provides": [],
      "requires": [],
      "gate": { "run": "forge build", "expect": "Compiler run successful" },
      "commit": "chore: scaffold foundry project",
      "human_gate": false,
      "allow_empty": false,
      "status": "pending"
    }
  ]
}
```

### Field meaning

- `id`            — `"<subsystem>:<taskN>"`, globally unique. Primary key in your SQLite store.
- `depends_on`    — list of task ids that must reach `status: done` first. The scheduler only
                    dispatches tasks whose dependencies are all done.
- `effort`        — reasoning level for this task. The kernel translates it to the per-invocation
                    flag for whichever CLI/account it dispatches to (see §6). This is the main
                    throttle on how fast a task burns an account's budget — match it to difficulty,
                    don't run everything high.
- `gate`          — the command the kernel runs after the executor returns. PASS → commit + mark
                    done; FAIL → retry, then escalate.
- `files`         — **must be exhaustive.** The kernel's commit is scoped: it stages only the paths
                    declared here (plus incidental lockfiles) and **fails the task** if the worktree
                    contains any other change. A file the implementation genuinely needs but the
                    plan didn't declare is a plan bug, not executor discretion.
- `provides` /
  `requires`      — used by the orchestrator to inject upstream signatures into a task's prompt at
                    dispatch time, so a stateless executor on a rotated account never has to guess.
- `status`        — `pending` | `dispatched` | `building` | `gate_pending` | `done` | `failed`.
- `human_gate`    — **boolean, default `false`.** `true` on every task that deploys, moves funds, or
                    uses a key/secret. The kernel MUST pause a `human_gate: true` task for a human and
                    never auto-dispatch it (see `conventions.md` §Safety). This is the one
                    safety-critical dispatch field; its **canonical spelling is `human_gate`**
                    (snake_case, like `depends_on`) — no other spelling (`human-gate`) is valid.
- `allow_empty`   — boolean, default `false`. `true` only on tasks that legitimately change no files
                    (rare — verification-only or placeholder tasks). Absent the flag, the kernel fails
                    a task whose worktree contains no declared change.
- `provider`      — optional string. Pins a task to a specific pool/seat (e.g. `claude`) when it
                    genuinely needs the strong model. Omit by default; over-pinning starves the
                    architect/mastermind seat.

## 3. How the orchestrator consumes a task

For each ready task the mastermind builds the executor prompt as:

```
SYSTEM: You are an executor. Build exactly this task. Do not invent scope.
        Conventions: <inline references/conventions.md>
TASK:   <the full ### Task N block, verbatim>
CONTEXT (provided by upstream tasks you depend on):
        <every signature listed in this task's `requires`, pasted from the providers' `provides`>
ACCEPTANCE: run `<gate.run>` — it must output `<gate.expect>`. Return only after it passes.
```

This is the anti-drift mechanism: the executor's context is **the task plus exactly the upstream
interfaces it needs** — nothing more, nothing assumed.

The executor prompt carries no effort instruction — `task.effort` is not part of the prompt. The
kernel applies it as a **launch flag** on the CLI invocation that runs this prompt (see §6), the
same way it picks the model and account. Effort is a dispatch parameter, never something the agent
reads or decides.

### 3.1 What the executor returns (worker output protocol)

The executor ends its run with one of these two blocks — the **last lines it prints**, exact
format. The kernel scans worker output for the `RESULT:` marker; a `BLOCKED` report is classified
as a self-reported failure (with the REASON preserved as the diagnostic) instead of being mistaken
for success.

```
RESULT: DONE
FILES: <comma-separated repo-relative paths changed>
GATE: <the gate command's final output line(s) proving the pass>
```

```
RESULT: BLOCKED
REASON: <one or two lines — root cause found, or the plan gap hit>
```

The report is evidence, not authority: the kernel still runs the gate itself and scope-checks the
commit regardless of what the executor claims. `BLOCKED` exists so a stuck executor can fail
honestly and informatively — a fabricated `DONE` wastes a gate run and a retry; a good `REASON`
saves both.

<!-- EXECUTOR-KIT-END — sections below are orchestrator/kernel-side; the kernel does not deliver
     them to executors. Keep this marker: src/prompt.ts slices the executor's copy here. -->

## 4. Plan-document-reviewer prompt (Stage 4)

Dispatch this over each plan before generating the manifest.

```
You are a plan document reviewer. Verify this plan is complete and ready for autonomous,
stateless execution across a pool of agents.

Plan: <PLAN_PATH>     Spec: <SPEC_PATH>

Check:
- Completeness:   no TODO/placeholder/empty steps; code steps have complete code.
- Spec alignment: every spec requirement maps to a task; no major scope creep.
- Decomposition:  tasks are 2-5 min steps; clear boundaries; one gate per task.
- Self-containment: every `Requires:` signature is pasted into the task body, not assumed.
- DAG validity:   every `Depends on:` points to a task that `Provides:` what this task `Requires:`.
- Files exhaustive: every file the steps create/modify/test appears in `Files:` — the kernel's
  commit is scoped to exactly that list and fails the task on any undeclared change.
- Effort present:  every task has an `**Effort:**` line — a missing one silently dispatches at
  `medium` (§5), so a dropped line on a hard or security-sensitive task is a real defect.
- Human-gate:      flag any task whose steps deploy, move funds, or use a key/secret — each MUST
  carry `human_gate: true` in the manifest (§2), or the autonomous pool will run it. (You read the
  plan, so you name the tasks that need gating; the manifest generator/validator sets and checks the
  flag — see architect `SKILL.md` Stage 4.)

Only flag issues that would make an executor build the wrong thing or get stuck. Approve otherwise.

Output:
  Status: Approved | Issues Found
  Issues: [Task X, Step Y]: <issue> — <why it breaks execution>
```

## 5. Parser note (for when you build the kernel adapter)

The grammar above is regex-friendly:
- Task boundaries: `^### Task (\S+):\s*(.+)$`
- Effort: `^\*\*Effort:\*\*\s*(none|minimal|low|medium|high|xhigh)` — default to `medium` if absent.
- Steps: `^- \[[ x]\] \*\*Step \d+:`
- Gate: the last step whose body contains `Expected: PASS` (or `Expected: <success string>`).
- Files: lines matching `^- (Create|Modify|Test):\s*\`(.+?)\``

Map each parsed task to a row in your task table; store `provides`/`requires` as JSON columns so the
scheduler can resolve the dependency edges and assemble executor context at dispatch. The manifest's
`gate`, `files`, `effort`, `provides`, `requires`, and `commit` are the **projection** of these parsed
plan values — they must match the plan byte-for-byte (§2 precedence). The parser defaults a missing
`Effort:` to `medium` for resilience, but that is a fallback for malformed input, not a license to
omit it — the producer side (architect Stage 4, §4 reviewer) requires the line on every task.

## 6. Effort → CLI flag mapping (kernel dispatch)

The kernel reads `task.effort` and sets it as a launch flag on the fresh, non-interactive invocation
for whichever CLI/account runs the task. Effort is set **per dispatch**, never mutated mid-run — each
task is a one-shot, so "changing effort for the next phase" is just the next task carrying a
different value. Both CLIs accept the same six levels (`none|minimal|low|medium|high|xhigh`).

| CLI | Per-task dispatch (effort + model + headless) |
|-----|-----------------------------------------------|
| **Codex** | `codex exec -m <model> -c model_reasoning_effort="<effort>" "<prompt>"` — `-c` overrides config; or pre-define `[profiles.*]` blocks and pass `--profile <name>`. |
| **Claude Code** | `claude -p --model <model> --effort <effort> "<prompt>"` — or set `CLAUDE_CODE_EFFORT_LEVEL=<effort>` in that spawn's env. |

Caveats the kernel must respect:

- **Codex resume freezes settings.** `codex exec resume --last` keeps the original session's model
  and effort — you cannot override them on resume. For per-task effort, dispatch each task as a
  fresh `codex exec`, not a resume.
- **Flag is authoritative.** A role kit may carry a default `effort:` in its skill frontmatter
  (Claude Code) or config (Codex), but the kernel's per-task flag must win — the manifest is the
  single source of truth, same as everywhere else.
- **Effort is the budget throttle.** Higher effort drains an account's window faster, so a task's
  effort directly affects how soon the kernel rotates. Cheap tasks at `low`/`medium`, hard ones at
  `high`/`xhigh` — the architect assigns this during decomposition because it's the component that
  knows each task's difficulty.

Suggested defaults by role: architect `high`/`xhigh`, mastermind `medium`/`high`, executor per-task
from the manifest (most tasks `low`/`medium`, genuinely hard or security-sensitive ones `high`).
