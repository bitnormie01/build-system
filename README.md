# Build System

A reusable, three-role system for autonomous builds. The **architect** turns an idea + docs into a
spec, plans, and a task manifest (plans include a README task locked to one of eight schemas —
`references/readme-schemas.md`). The **mastermind** owns correctness and integration. The
**executor** builds one task at a time. The build is driven either by **Claude Code itself** or by a
separate deterministic **kernel** (your code — speced, not in here) — see **Two ways to run it** below.

Each role boots with an isolated, scoped skill kit and the shared structure to follow. The only thing
they share is the architect's output, and they read and write it through the **project repo**, which is
the single source of truth. That repo is **not this build-system repo** — when the user doesn't provide
one, the first pipeline step that needs it creates it via the user's logged-in `gh`, named from the
event or the chosen project (`references/repo-bootstrap.md`).

Every campaign opens with a **requirements tollgate** (`references/tollgate.md`): Step 0a's Stage 0
(or the guide when 0a is skipped, or the autopilot at its own boot on a hands-off campaign) probes
every access/plugin/MCP/toolchain the planned steps will
need and commits per-step CLEAR/BLOCKED verdicts — so a missing capability is a fix-hint line on day
one, not a mid-execution roadblock. Fresh step sessions re-probe their own session cards (MCP
connections don't survive session boundaries), and the architect appends the project's stack
requirements for the orchestrator to probe before the first task. Spawns are also **routed**
(`references/model-routing.md`): every subagent dispatch binds a per-task model tier and effort
level — harness-gated (Claude Code only; anywhere else falls back to inherit), probe-verified, and
never a blocker.

After the build goes green, an optional **Step 2.5** — the `demo-studio` — produces the hackathon
demo video autonomously: it scripts the demo from the brief/spec/`event.md`, records the app
scene-by-scene on the user's machine (Playwright screencast for browser scenes, ffmpeg
gfxcapture/ddagrab for native/wallet-popup scenes), narrates with TTS and word-timed captions,
assembles with Remotion, runs a frame-level QC loop, has the user **watch** the final cut, then on a
separate consent uploads it and resolves the submission draft's demo-video URL
(`demo-studio/SKILL.md`; pinned toolchain in `references/demo-stack.md`; every script follows the
locked call-sheet schema in `references/demo-script-schema.md`).

An optional **Step 3** — the `gate-concierge` — minimizes the human-gated tail (faucets, testnet
deploy, provider accounts / API keys, wallet setup, the hackathon submission): it reports every gate
with the exact tools it would use, then executes only what the user green-lights, one consent per
gate (`gate-concierge/SKILL.md`). It runs in two passes: a **preflight** right after the architect
commits the plans (wallet / faucets / keys land in parallel while the build runs, guided by the
cross-campaign faucet library in `references/faucets/`) and a **closing** pass after the build goes
green (deploy, repo-flip, submission — pasted from the architect's pre-filled
`docs/gates/submission-draft.md`, its demo-video URL filled by Step 2.5).

## Two ways to run it

**New to the kit? Start with the `guide`** (`guide/SKILL.md`, kickoff `prompts/INVOKE_GUIDE.md`): a
persistent mission-control session that plans the pipeline for your specific event, fills in each
step's kickoff, verifies each committed artifact, and unblocks you between steps. Each pipeline step
still runs in its own fresh session; the guide is the seat you come back to.

**Want the whole campaign hands-off? That's `autopilot` mode** (`autopilot/SKILL.md`, kickoff
`prompts/INVOKE_AUTOPILOT.md`): one session collects your constraints and consents up front —
which steps, demo video, submission (identity-bound to the account your connected browser is
logged into), budget (`$0` default or funds-allowed) — locks them as a committed **campaign
contract** (`references/campaign-contract.md`), then dispatches each step as a fresh subagent
(Step 2 inline) and runs the pipeline to a submitted project. It stops only for hard blockers, and
no contract can authorize the never-consentable floor (mainnet, real funds, the user's main
wallet, payment/KYC). Guided mode remains the default and the right choice for a first campaign.

The **planning** front end is identical either way — `resource-extractor` (optional) → `idea-forge`
(optional) → `architect` produce a resource pack, a scoped brief, then a spec, plans, and a task DAG,
committed to the repo. What differs is who **builds** the plan:

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
├── guide/SKILL.md              # START HERE — mission control: plans the pipeline per event, preps kickoffs, verifies batons, helpdesk between steps
├── autopilot/SKILL.md          # hands-off mode: lock a campaign contract up front, then run every step autonomously (stops only on hard blockers)
├── resource-extractor/SKILL.md # Step 0a (optional): extract the hackathon's docs -> committed resource pack (drives Chrome for JS-heavy sites)
├── idea-forge/SKILL.md         # Step 0 (optional): blank start -> one scoped hackathon brief
├── architect/SKILL.md          # Step 1: idea+docs -> spec, plans, manifest.json (runs once, top model)
├── orchestrator/SKILL.md       # Step 2 (Claude-Code-native): drive the build in-session via subagents
├── demo-studio/SKILL.md        # Step 2.5 (optional): record + assemble the demo video autonomously — script → capture → Remotion → watch → upload
├── gate-concierge/SKILL.md     # Step 3 (optional): minimize the human-gated tail — gate ledger first, then consent-per-gate execution
├── mastermind/SKILL.md         # failure-judgment doctrine (external-pool escalation; orchestrator reuses it inline)
├── executor/SKILL.md           # build one task, test-first, prove the gate (dispatched to each subagent)
├── prompts/                    # copy-paste kickoffs
│   ├── INVOKE_GUIDE.md
│   ├── INVOKE_AUTOPILOT.md
│   ├── INVOKE_RESOURCE_EXTRACTOR.md
│   ├── INVOKE_IDEA_FORGE.md
│   ├── INVOKE_ARCHITECT.md
│   ├── INVOKE_ORCHESTRATOR.md
│   ├── INVOKE_DEMO_STUDIO.md
│   └── INVOKE_GATE_CONCIERGE.md
└── references/                 # SHARED structure (not skills) — all roles follow these
    ├── task-contract.md        # plan grammar + manifest DAG + executor prompt (the bridge)
    ├── conventions.md          # coding + decomposition rules + repo-as-source-of-truth
    ├── repo-bootstrap.md       # WHICH repo is canonical + who creates it (gh) when the user provides none
    ├── readme-schemas.md       # eight locked project-README schemas (judge-path spine; architect picks one, the README task builds it)
    ├── campaign-contract.md    # autopilot's locked instrument: contract schema, intake, consent forms + never-floor, identity checks, $0|funds-allowed
    ├── faucets/                # cross-campaign faucet playbooks — read before claiming, write back after (grows one commit per event)
    ├── tollgate.md             # requirements tollgate — the capability matrix probed at Step 0a (campaign) + per-step session cards
    ├── model-routing.md        # per-spawn model+effort routing: tiers, harness gate (CLAUDECODE), row-18 probe, escalation ladder
    ├── agents/                 # executor effort-variant agent templates (copied into the project repo's .claude/agents/ at boot)
    ├── demo-script-schema.md   # demo-studio's locked call-sheet script schema (deterministic across campaigns)
    ├── demo-stack.md           # demo-studio's pinned toolchain + exact capture/render/upload commands (re-verify before a run)
    ├── music-kit.md            # curated pre-cleared demo-video music manifest (metadata only; MP3s live off-repo)
    ├── roles.md                # role wiring + the two run configurations
    ├── ideation-rubric.md      # idea-forge's weighted decider
    ├── pipeline-fallback.md    # condensed spec/plan checklist (summary of the vendored method)
    ├── web3-seed-pack.md       # divergence fuel for idea-forge (Web3 events)
    └── vendor/superpowers/     # pinned MIT snapshot of brainstorming + writing-plans (UPSTREAM.md)
```

## How the kernel uses it

The kernel is the only pipeline-side component that knows all three kits exist — that is what enforces
isolation (user-side seats — the `guide`, a manager-mode session, the `gate-concierge`,
`demo-studio`, and the `autopilot` — hold the map by design; see `references/roles.md`). It has
two jobs:

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

The repo is the single source of truth — and "the repo" means the **project repo**
(`references/repo-bootstrap.md`), never this build-system checkout, which is doctrine only (its sanctioned write-backs are the
public-facts-only reference libraries — `references/faucets/` playbooks, `references/demo-stack.md`
re-verified pins, `references/music-kit.md` cleared tracks; `references/repo-bootstrap.md`). Every
role, every dispatch: **resolve and sync the canonical project repo before
starting; commit and push before reporting done.** Local files are never trusted. This is what lets
the architect regenerate the system mid-build and have the next agent that boots pick it up
automatically — it pulled, so it sees it.

## Where the kernel fits

```
architect ──commit──> repo (spec/plans/manifest) <──pull── mastermind
                          │                                     │ judgment
                          ▼ (kernel reads, schedules, rotates)   ▼
                       KERNEL ──delivers kit + task──> executor ──files + passing gate──> KERNEL ──scoped commit──> repo
                          └────────── rotates executor on limit ──────────┘
```

The kernel + manifest parser is the separate build; `references/task-contract.md` §5 specifies the
grammar it targets.

## Planned upgrades (approved PRDs, not yet built)

- **Portfolio mode & fleet manager** — N-projects-per-hackathon campaigns (shared hub repo,
  portfolio-aware idea-forge, read-only fleet-manager seat, per-owner kickoff deck). The
  implementation contract is `docs/prd/2026-07-06-portfolio-mode-and-fleet-manager-prd.md` —
  a future session implements from that file alone; read its §0 before touching anything.
*(Demo studio — autonomous demo-video recording — has shipped; see `demo-studio/SKILL.md` and
`references/demo-stack.md`. Its PRD `docs/prd/2026-07-09-demo-studio-prd.md` remains the design
record.)*
