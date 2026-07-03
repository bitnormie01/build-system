# Build System

A reusable, three-role system for autonomous builds. The **architect** turns an idea + docs into a
spec, plans, and a task manifest. The **mastermind** owns correctness and integration. The
**executor** builds one task at a time. The build is driven either by **Claude Code itself** or by a
separate deterministic **kernel** (your code — speced, not in here) — see **Two ways to run it** below.

Each role boots with an isolated, scoped skill kit and the shared structure to follow. The only thing
they share is the architect's output, and they read and write it through the **git repo**, which is the
single source of truth.

## Two ways to run it

The **planning** front end is identical either way — `idea-forge` (optional) → `architect` produce a
spec, plans, and a task DAG, committed to the repo. What differs is who **builds** the plan:

- **Claude-Code-native (default, no kernel).** A Claude Code session is the `orchestrator`
  (`orchestrator/SKILL.md`): it reads the plans and dispatches a fresh **subagent** per task (each
  playing the `executor` role), then re-runs every gate, scope-checks, reviews the diff, and commits.
  The one session plays kernel + mastermind + reviewer; subagents are the executor pool. Nothing
  outside Claude Code is required. Kickoff: `prompts/INVOKE_ORCHESTRATOR.md`.
- **External-pool (optional).** A separate deterministic **kernel** (your code — speced here, not
  shipped here) loads `manifest.json`, distributes tasks across a stateless multi-account executor
  pool, runs gates, scoped-commits, rotates accounts on rate limits, and escalates to the `mastermind`.
  Use this to build across many accounts in parallel, outside Claude Code.

The **"How the kernel uses it"** and **"Where the kernel fits"** sections below describe the
external-pool config; for the Claude-Code-native build read `orchestrator/SKILL.md`.

## Files

```
build-system/
├── README.md
├── idea-forge/SKILL.md         # Step 0 (optional): blank start -> one scoped hackathon brief
├── architect/SKILL.md          # Step 1: idea+docs -> spec, plans, manifest.json (runs once, top model)
├── orchestrator/SKILL.md       # Step 2 (Claude-Code-native): drive the build in-session via subagents
├── mastermind/SKILL.md         # failure-judgment doctrine (external-pool escalation; orchestrator reuses it inline)
├── executor/SKILL.md           # build one task, test-first, prove the gate (dispatched to each subagent)
├── prompts/                    # copy-paste kickoffs
│   ├── INVOKE_IDEA_FORGE.md
│   ├── INVOKE_ARCHITECT.md
│   └── INVOKE_ORCHESTRATOR.md
└── references/                 # SHARED structure (not skills) — all roles follow these
    ├── task-contract.md        # plan grammar + manifest DAG + executor prompt (the bridge)
    ├── conventions.md          # coding + decomposition rules + repo-as-source-of-truth
    ├── roles.md                # role wiring + the two run configurations
    ├── ideation-rubric.md      # idea-forge's weighted decider
    ├── pipeline-fallback.md    # condensed spec/plan checklist (summary of the vendored method)
    ├── web3-seed-pack.md       # divergence fuel for idea-forge (Web3 events)
    └── vendor/superpowers/     # pinned MIT snapshot of brainstorming + writing-plans (UPSTREAM.md)
```

## How the kernel uses it

The kernel is the only component that knows all three kits exist — that is what enforces isolation.
It has two jobs (see `references/roles.md`):

1. **Deliver the right kit at boot** — assemble each agent's context: its own `SKILL.md` +
   `task-contract.md` + `conventions.md` (+ the executor's one task and required signatures). It
   never hands an agent another role's kit or `roles.md`.
2. **Rotate the executor on rate-limit** — swap accounts and re-deliver the executor kit fresh. The
   account is just a credential; nothing the executor sees changes across a rotation.

The kernel runs in two modes over the same invariants: the autonomous loop (`kernel run`) for
unattended builds, and **manager mode**, where a strong LLM session drives the kernel's subcommands
one step at a time and reviews every gate-passed diff before it is committed — see the kernel
repo's `MANAGER.md`. In manager mode the managing session takes over the mastermind's review duty;
the kernel still owns gates, scoped commits, and rotation.

## The one rule everything depends on

The repo is the single source of truth. Every role, every dispatch: **sync the canonical repo before
starting; commit and push before reporting done.** Local files are never trusted. This is what lets
the architect regenerate the system mid-build and have the next agent that boots pick it up
automatically — it pulled, so it sees it.

## Where the kernel fits

```
architect ──commit──> repo (spec/plans/manifest) <──pull── mastermind
                          │                                     │ judgment
                          ▼ (kernel reads, schedules, rotates)   ▼
                       KERNEL ──delivers kit + task──> executor ──commit/push──> repo
                          └────────── rotates executor on limit ──────────┘
```

The kernel + manifest parser is the separate build; `references/task-contract.md` §5 specifies the
grammar it targets.
