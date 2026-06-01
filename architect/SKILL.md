---
name: architect
description: >
  Use this skill at the very START of any new build, before writing a single line of code, to
  turn a project idea (plus any reference docs) into an approved spec and a set of bite-sized,
  machine-parseable implementation plans that a mastermind/executor agent pool can build
  autonomously. Trigger it whenever the user says "architect this", "break this project down",
  "decompose this", "plan this build", "turn this idea/spec into tasks", or hands over a folder
  of docs and asks how to build it. Do NOT skip this and jump to coding even if the project
  "seems simple" — unplanned builds are where executors drift, duplicate work, and hallucinate
  interfaces.
---

# Architect

## What this is

The architect is the **front-end of an autonomous build pipeline**. It does not write the
product. It turns a fuzzy idea + reference docs into two artifacts the rest of the system can act on:

1. An **approved spec** — the single source of truth for *what* is being built and *why*.
2. A set of **plan documents** — one per independent subsystem — broken into bite-sized,
   test-first tasks, each self-contained enough for an executor with **zero session memory and no
   access to the architect's context** to build it correctly.

It then emits a **task manifest** (see `../references/task-contract.md`) so a mastermind/orchestrator
can load the work into a task DAG and distribute tasks across an executor pool — no copy-paste.

**Announce at start:** "I'm using the architect skill to decompose this project into a spec and
executor-ready plans."

## Why decompose at all

A single executor agent reasons best about work it can hold in context at once. When you hand a
fresh executor "build the prediction-market hook," it invents its own interfaces, picks its own
file layout, and 40 minutes later you have code that doesn't match the next task's assumptions.
When you hand it "Task 3: write the failing test for `OutcomeToken.mintFor(address,uint256)`, here
is the exact signature, here is the file path, here is the command to prove it fails" — it
succeeds, and so does the executor that picks up Task 4. **The plan is what makes a stateless,
rotating pool of executors behave like one coherent engineer.**

## Build on existing skills — do not reinvent

This skill orchestrates a proven chain. Use these if installed; otherwise follow the inline
fallback in `../references/pipeline-fallback.md`.

| Stage | Skill to invoke | Produces |
|-------|-----------------|----------|
| Spec  | `superpowers:brainstorming` (or `brainstorming`) | `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` |
| Plans | `superpowers:writing-plans` (or `writing-plans`) | `docs/superpowers/plans/YYYY-MM-DD-<subsystem>.md` |
| Review| plan-document-reviewer prompt | Approved / Issues per plan |

The architect's job is to run them **in order, with the right inputs, and to enforce the
executor-ready output contract** at the end — which vanilla superpowers does not do, because it
assumes same-session subagent execution. You are building for a multi-account, multi-agent pool
instead.

## The pipeline

Run these four stages in order. Do not start a stage until the previous one is approved.

### Stage 1 — Ingest

- Read the project idea and **every** reference doc the user pointed at (specs, API docs,
  hackathon rules, existing code). If a docs folder was given, list it and read the relevant files
  before asking anything.
- Establish: target platform/chain, language/runtime, hard deadline, and any non-negotiable
  constraints. Pull these into the spec header verbatim.

### Stage 2 — Brainstorm into a spec

- Invoke the brainstorming skill. Honor its **hard gate**: present a design and get explicit
  approval before any planning.
- **Decomposition gate (critical):** if the project spans multiple independent subsystems
  (e.g. contracts + off-chain worker + frontend + deploy), flag it immediately and split into
  sub-projects. Each subsystem gets its own spec→plan cycle. This is why a real build becomes 3–5
  plan files, not one giant one.
- Save the approved spec to `docs/superpowers/specs/`. Get the user to review the written spec
  before moving on.

### Stage 3 — Decompose into plans

- Invoke the writing-plans skill once per subsystem, feeding it the spec.
- Enforce **bite-sized TDD granularity**: each step is one 2–5 minute action
  (write failing test → run it to confirm fail → minimal implementation → run to confirm pass →
  commit).
- Enforce the **executor-ready contract** from `../references/task-contract.md`. Beyond standard
  writing-plans output, every task MUST also declare:
  - `provides:` — the interfaces/types/exports this task creates (so downstream tasks can name them)
  - `requires:` — the interfaces it consumes from earlier tasks (paste the actual signatures into
    the task body — never assume the executor "remembers" them)
  - `effort:` — the reasoning level for this task (`none|minimal|low|medium|high|xhigh`). You assign
    this because you're the only component that knows each task's difficulty: boilerplate/scaffolding
    `low`, normal feature work `medium`, tricky algorithms or security-sensitive code `high`/`xhigh`.
    It's the kernel's budget throttle (see `../references/task-contract.md` §6) — don't default
    everything to high.
  - a single **gate** command with expected result (this becomes the kernel's acceptance check)
- Apply `../references/conventions.md` (no placeholders, exact paths, complete code, strict-TS rules,
  key-safety rules).

### Stage 4 — Review and hand off

- Run the plan-document-reviewer over each plan (see `../references/task-contract.md` for the prompt).
  Fix any blocking issues inline.
- Generate the **task manifest** (`docs/superpowers/manifest.json`) per `../references/task-contract.md`.
  This is the bridge to the mastermind: a DAG of tasks with dependencies, files, gate commands, and
  provides/requires edges.
- **Commit and push the whole system to the repo** — spec, plans, and `manifest.json`. The repo is
  the single source of truth (`../references/conventions.md`); the mastermind and executors pull from
  it, so until you've pushed, the system doesn't exist for them. Regenerating later is just another
  commit — agents that boot afterward pick it up automatically.
- **Do NOT offer same-session subagent execution.** End by telling the user the manifest is committed
  and ready for their orchestrator to load and distribute. The architect's job ends at a built,
  reviewed, pushed, machine-parseable plan.

> Shared references: `../references/{task-contract,conventions}.md` are the same files all three
> roles follow — they are the structure, not skills, so sharing them does not break role isolation.

## Output layout

```
docs/superpowers/
├── specs/
│   └── YYYY-MM-DD-<topic>-design.md      # one per sub-project
├── plans/
│   └── YYYY-MM-DD-<subsystem>.md         # one per subsystem, bite-sized TDD tasks
└── manifest.json                          # the task DAG for the orchestrator (Stage 4)
```

## Hard rules

- **Strongest model only.** Decomposition quality is model-bound. Run the architect on your top
  reasoning seat (Opus/Claude). Never let a cheap executor write the plan — it produces vague tasks
  that drift the whole pool.
- **No placeholders, ever.** "TODO", "add error handling", "similar to Task N", or a step that
  says *what* without showing *how*, are plan failures. The executor has no context to fill them in.
- **Self-contained tasks.** Because executors are stateless and may run on different accounts, each
  task must carry the signatures it depends on. A task that references an undefined type is a bug.
- **The gate is the contract.** Every task ends in a runnable check with an expected result. If it
  can't be checked, it isn't done.

## When NOT to use this skill

- Editing an existing, well-understood file (just edit it).
- A one-off script under ~30 lines (just write it).
- Pure research/Q&A with no build deliverable.

Use it whenever the work is "build a thing" and that thing has more than a couple of moving parts.
