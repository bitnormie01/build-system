# Build System

A reusable, three-role system for autonomous builds. The **architect** turns an idea + docs into a
spec, plans, and a task manifest. The **mastermind** owns correctness and integration. The
**executor** builds one task at a time. A deterministic **kernel** (your code — speced, not in here)
brokers the whole thing.

Each role boots with an isolated, scoped skill kit and the shared structure to follow — never each
other's skills. The only thing they share is the architect's output, and they read and write it
through the **git repo**, which is the single source of truth.

## Files

```
build-system/
├── README.md
├── architect/SKILL.md          # idea+docs -> spec, plans, manifest.json (runs once, top model)
├── mastermind/SKILL.md         # coordination + gatekeeping judgment
├── executor/SKILL.md           # build one task, test-first, prove the gate
├── prompts/INVOKE_ARCHITECT.md # copy-paste kickoff for the architect
└── references/                 # SHARED structure (not skills) — all roles follow these
    ├── task-contract.md        # plan grammar + manifest.json DAG schema (the bridge)
    ├── conventions.md          # coding + decomposition rules + repo-as-source-of-truth
    ├── roles.md                # kernel/human wiring: which kit each role holds, delivery matrix
    ├── pipeline-fallback.md    # condensed spec/plan checklist (summary of the vendored method)
    └── vendor/superpowers/     # pinned MIT snapshot of brainstorming + writing-plans
                                #   (architect's fallback when superpowers isn't installed; UPSTREAM.md)
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
