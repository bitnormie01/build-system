# Invoke Orchestrator — copy-paste kickoff prompt

Paste this into a Claude Code session (your strong reasoning seat) **after the architect has committed a
spec + plans (+ optional `manifest.json`)** to run the build autonomously **inside Claude Code** — no
external kernel, no multi-account pool. The session becomes the orchestrator: it dispatches a subagent
per task, proves each gate, and commits. This is **Step 2**, after `prompts/INVOKE_ARCHITECT.md`.

## Running the pipeline (Claude-Code-native)

```
Step 0 — idea-forge (optional): own session → commits a brief, emits an architect kickoff block.
Step 1 — architect: fresh session, paste that block → commits spec + plans (+ manifest).
Step 2 — orchestrator: THIS prompt, fresh session → builds the plan via subagents, commits each task.
```

The committed repo is the baton between every step — always sync before starting, push before done.

---

```
You are the ORCHESTRATOR for this build, running in Claude Code. Load and follow orchestrator/SKILL.md
(and its references/). There is NO external kernel — you are the kernel + mastermind + reviewer, and you
build by dispatching a fresh Claude Code subagent per task (playing the executor role, executor/SKILL.md).

Do this:
1. Sync the canonical repo and read the spec, plans, conventions.md, and manifest.json if present.
2. Build the task DAG — prefer the manifest (it carries the human-gate flags); else parse the plans per
   task-contract.md §1 and derive human-gating from task content yourself.
3. For each dependency-ready task, in order:
   - If it deploys, moves funds, signs a tx, or uses a key/secret (its manifest `human_gate` flag, or
     evident from its steps): PAUSE and hand it to me — never run it yourself.
   - Otherwise dispatch a subagent with the executor kit + conventions + the full task block verbatim +
     the pasted `requires` signatures (task-contract.md §3). Set its effort from task.effort.
   - Re-run the gate yourself, scope-check the declared Files, review the diff, then commit exactly those
     files with the task's commit message. Mark it done.
   - On failure: classify (flake / executor-miss / plan-bug / human) and retry-with-hint, route back to
     the architect to replan, or ask me. Do not power through or fake green.
4. Push. Report what was built, what passed its gate, and anything that needs me (human-gate steps,
   replans, blockers).

PLAN LOCATION: [repo path / branch, or "the synced canonical branch"]

REVIEW MODE: [autonomous — commit each gate-passed task and report at the end
             | checkpoint — show me each gate-passed diff before you commit it]
```

---

## Notes on using it

- **You are the orchestrator; subagents are executors.** Keep the split: dispatch tasks, prove gates,
  commit — don't hand-write the product code yourself. That discipline is what makes the build
  auditable.
- **Effort is per task.** Cheap/scaffolding tasks at `low`/`medium`, hard or security-sensitive ones at
  `high`/`xhigh` — set it as the subagent's effort when you dispatch (the native equivalent of the
  external kernel's CLI effort flag).
- **Human-gate is a hard stop.** Deploys, signed txs, and fund movements pause for you to run. The
  orchestrator prepares them but never executes them.
- **Sequential by default.** Parallelize only genuinely independent tasks, with worktree-isolated
  subagents and serialized commits (`orchestrator/SKILL.md` §Parallelism).
- **Same session or fresh?** You can continue in the architect's session, but a fresh orchestrator
  session (clean context, plan loaded from the repo) is cleaner for a long build.
