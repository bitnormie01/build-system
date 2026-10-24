# Invoke Orchestrator — copy-paste kickoff prompt

Paste this into a Claude Code session (your strong reasoning seat) **after the architect has committed a
spec + plans (+ optional `manifest.json`)** to run the build autonomously **inside Claude Code** — no
external kernel, no multi-account pool. The session becomes the orchestrator: it dispatches a subagent
per task, proves each gate, and commits. This is **Step 2**, after `prompts/INVOKE_ARCHITECT.md`.

**Session settings — set these before you paste** (values: `references/model-routing.md`
§Seat settings): tier `top` → Claude Code default alias `opus` · effort `high`.
- **Claude Code Desktop:** model picker in the row under the prompt box → `opus`; **Effort** in
  the same picker → `high` — or type `/model opus`, then `/effort high`, as your
  first two messages.
- **Claude Code CLI:** `claude --model opus --effort high` (or `/model opus` + `/effort high`).
- Set both explicitly in every new session — a fresh session otherwise starts at its model's
  default.
- A campaign that overrides the binding records it in the tollgate report's Routing section — use
  that alias instead.

## Running the pipeline (Claude-Code-native)

```
Step 0a — resource-extractor (optional): own session → commits the resource pack (its Stage 0 runs the campaign tollgate).
Step 0 — idea-forge (optional): own session → commits a brief, emits an architect kickoff block.
Step 1 — architect: fresh session, paste that block → commits spec + plans (+ manifest).
Step 2 — orchestrator: THIS prompt, fresh session → builds the plan via subagents, commits each task.
Step 2.5 — demo-studio (optional): after green → records the demo video, fills the submission's demo-video URL.
Step 3 — gate-concierge (optional, two passes): preflight may already run in parallel with Step 2
         (wallet/faucets/keys); the closing pass follows green (deploy, submission) — consent per gate.
```

The committed repo is the baton between every step — always sync before starting, push before done.

---

```
SESSION SETTINGS: tier top · effort high (references/model-routing.md §Seat settings). Start by
stating the exact model id you are running as. If it is below this campaign's top-tier binding,
warn me and wait for my go before anything else.

You are the ORCHESTRATOR for this build, running in Claude Code. Load and follow orchestrator/SKILL.md
(and its references/). There is NO external kernel — you are the kernel + mastermind + reviewer, and you
build by dispatching a fresh Claude Code subagent per task (playing the executor role, executor/SKILL.md).

Do this:
1. Sync the project repo below (the canonical repo — references/repo-bootstrap.md; never the
   build-system checkout) and read the spec, plans, conventions.md, and manifest.json if present.
2. Build the task DAG — prefer the manifest (it carries the human-gate flags); else parse the plans per
   task-contract.md §1 and derive human-gating from task content yourself. Then probe the tollgate's
   Stack requirements rows (docs/tollgate/*-tollgate.md, per references/tollgate.md), plus matrix
   row 9 (Node ≥20 + npm) when the stack is JS/TS — every
   compiler/CLI the plans assume must PASS before you dispatch anything; surface a FAIL to me with
   its fix hint now rather than letting the first task die on it as a pseudo-flake. Then resolve
   routing (references/model-routing.md): read or create the report's Routing section (matrix
   row 18) and install the executor effort variants; a FAIL just means routing: inherit — never a
   blocker.
3. For each dependency-ready task, in order:
   - If it deploys, moves funds, signs a tx, or uses a key/secret (its manifest `human_gate` flag, or
     evident from its steps): PAUSE and hand it to me — never run it yourself.
   - Otherwise dispatch a subagent with the executor kit + conventions + the full task block verbatim +
     the pasted `requires` signatures (task-contract.md §3) — bound per the routing you resolved in
     step 2: agent type = the effort variant executor-<dispatched effort> (task.effort raised to
     the tier floor), model = task.model_tier's verified binding, plus per-spawn effort where
     available, resolved model and effort logged (references/model-routing.md; under routing:
     inherit, a plain subagent as before).
   - Re-run the gate yourself, scope-check the declared Files, review the diff, then commit exactly those
     files with the task's commit message. Mark it done.
   - On failure: classify (flake / executor-miss / plan-bug / human) and retry-with-hint, route back to
     the architect to replan, or ask me. Do not power through or fake green.
4. Push. Report what was built, what passed its gate, and anything that needs me (human-gate steps,
   replans, blockers). Then OFFER the two post-build seats — Step 2.5 demo-studio
   (prompts/INVOKE_DEMO_STUDIO.md) records the demo video, and Step 3 gate-concierge
   (prompts/INVOKE_GATE_CONCIERGE.md) minimizes the human-gated tail — both on my per-gate/per-consent
   go; never launch either or run a gate/recording yourself.

REPO: [the project repo owner/name — from the guide's runsheet / the architect's report]

PLAN LOCATION: [repo path / branch, or "the synced canonical branch"]

REVIEW MODE: [autonomous — commit each gate-passed task and report at the end
             | checkpoint — show me each gate-passed diff before you commit it]

ROUTING (optional): [auto (default — per-task and per-seat model/effort per
references/model-routing.md and the tollgate's Routing section: tier bindings, effort floors,
escalation ladder) | pin all to <model alias> (never overrides a top pin) | inherit]
```

---

## Notes on using it

- **You are the orchestrator; subagents are executors.** Keep the split: dispatch tasks, prove gates,
  commit — don't hand-write the product code yourself. That discipline is what makes the build
  auditable.
- **Effort and model are per task.** Cheap/scaffolding tasks at `low`/`medium`, hard or
  security-sensitive ones at `high`/`xhigh` (`max` is the rare last rung) — bound at dispatch via
  the executor effort-variant agent type plus the task's model tier
  (`references/model-routing.md`; the native equivalent of the external kernel's CLI flags). A
  failed probe or a non-Claude-Code harness = `routing: inherit` — never a blocker; a missing
  Routing section isn't inherit — you create it at boot (step 2).
- **Human-gate is a hard stop.** Deploys, signed txs, and fund movements pause for you to run. The
  orchestrator prepares them but never executes them.
- **Sequential by default.** Parallelize only genuinely independent tasks, with worktree-isolated
  subagents and serialized commits (`orchestrator/SKILL.md` §Parallelism).
- **Same session or fresh?** You can continue in the architect's session, but a fresh orchestrator
  session (clean context, plan loaded from the repo) is cleaner for a long build.
