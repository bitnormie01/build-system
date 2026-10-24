# Model/Effort Routing — decide model + effort at every spawn, harness-gated

Every subagent spawn is a routing decision: which **model tier** and which **effort level** this
work actually needs. Blanket inheritance of the main seat's settings overspends on mechanical work
and — worse — lets judgment work run on whatever the session happened to boot with. This file is
the kit-wide doctrine: the ladder, the tiers, the seat settings, the main-session settings, the
harness gate that keeps it from misfiring in other agent applications, the boot probe, the dispatch
binding, and the escalation ladder. Design
record: `../docs/prd/2026-07-10-model-routing-prd.md`.

**In-session routing is Claude Code-only by design.** Everywhere else the harness gate resolves to
`routing: inherit` and nothing here fires — the external-pool kernel has its own per-CLI dispatch
(`task-contract.md` §6), and no other harness is ever sent Claude-Code knobs.

## The effort ladder (six levels, canonical)

`low | medium | high | xhigh | max | ultracode` — "Extra" is the user-facing name for `xhigh`.

- **Per-task / per-subagent dispatch uses five:** `low|medium|high|xhigh|max`. **`ultracode` is a
  main-session-only mode** — it is not accepted in agent-definition frontmatter or settings, and no
  dispatcher may try it on a spawn. The user sets it on their main seat (`/effort ultracode`) when
  they want that session's own orchestration to run at maximum depth.
- Legacy plan values `none`/`minimal` (pre-2026-07-10 grammar) are no longer emitted; a parser or
  dispatcher that meets them treats both as `low`.
- Effort is adaptive reasoning depth, not a fixed token budget — and it is a **dispatch
  parameter**: the agent being spawned never reads or decides it (`task-contract.md` §3).

## The model tiers (three, abstract — plans never name a model)

| Tier | Who runs at it | Rule |
|---|---|---|
| `top` | idea-forge, architect, mastermind judgment (the orchestrator seat), autopilot conformance approvals (the autopilot seat), resource-extractor, the gate-concierge closing pass — and every task that is `human_gate: true`, security-sensitive, or `effort: xhigh\|max` | **Pinned. Never downgraded, by anything** — not by escalation, not by budget, not by a campaign pin. |
| `standard` | the guide, typical executor tasks, adversarial reviewers, demo-studio, the gate-concierge preflight pass | The default when a task carries no `Model tier:` line. |
| `fast` | provably mechanical work only: scaffolding/config/boilerplate tasks at `effort: low`, log/summary chores | Never plan-touching work, never a gate's judgment, never anything pinned `top`. |

Per-seat tier and effort: §Seat settings.

**Why asymmetric:** a hard task on a weak model wastes retries *and* poisons every dependent task;
an easy task on a strong model only wastes tokens. Pins beat savings, always. Downgrade only what
is provably mechanical; when unsure, `standard`.

**Tier→model binding is campaign-resolved, never doctrine-hardcoded.** The Claude Code default
binding (runtime-binding text — aliases, never ids):

| Tier | Default alias | Effort floor (dispatch-time) |
|---|---|---|
| `top` | `opus` | `medium` |
| `standard` | `sonnet` | `high` |
| `fast` | `haiku` | `low` |

Each binding is **verified by the boot probe** (below), because a settings `availableModels`
allowlist silently substitutes a blocked model with no warning. **`standard` never binds to
`inherit`:** the seat that dispatches executors is the orchestrator, which runs at `top`, so
inherit would hand every `standard` spawn the `top` model and erase the tier. A campaign may
override any alias (the autopilot contract's field 16, or the orchestrator kickoff's ROUTING line —
e.g. bind `top` to a stronger alias the account has); a pin never overrides a `top` pin. On a
provider whose aliases resolve to older model families, bind full model ids in the Routing section
instead. The doctrine names no model ids; what a tier resolved to this campaign lives only in the
Routing section of the tollgate report.

**Effort floors are dispatch-time glue.** Dispatched effort = the authored (or seat) effort raised
to the bound tier's floor — never lowered. Plans keep authoring effort by task difficulty
(architect Stage 3); never raise an authored `Effort:` to compensate for a model — the floor does
that at dispatch, so plans stay portable. The pin rule tracks the dispatched effort. Floors are
recorded in the Routing section and do nothing under `routing: inherit`.

## Seat settings (kit-static: tier + effort per seat)

Every seat runs at a deliberate tier **and** effort, not only executor tasks. Tiers bind to models
per campaign (§The model tiers); the effort column is the ladder value the seat runs at. A **main
session** is set by the user before its first message (§Main-session settings); a **spawn** is
bound by its dispatcher (§Dispatch binding). This table is the single source for these values —
other files cite it; only the `prompts/INVOKE_*.md` Session-settings lines repeat them, and they
must match. Design record: `../docs/prd/2026-10-24-seat-settings-routing-v2-prd.md`.

| Seat | Runs as | Tier | Effort |
|---|---|---|---|
| guide | main session | `standard` | `high` |
| resource-extractor — Step 0a, incl. the Stage-0 tollgate | main session; autopilot spawn | `top` | `high` |
| idea-forge — Step 0, incl. the autopilot's calendar-fit re-run | main session; autopilot spawn | `top` | `max` |
| architect — Step 1, or a subtree/full regeneration | main session; autopilot spawn | `top` | `xhigh` |
| architect — one-task plan-bug fix | main session | `top` | `high` |
| spec/plan-document reviewer fan-out | spawn (architect) | `standard` | `high` |
| gate-concierge — preflight pass | main session; autopilot spawn | `standard` | `high` |
| orchestrator — Step 2, mastermind judgment inline | main session | `top` | `high` |
| executor task | spawn (orchestrator, autopilot) | the task's `Model tier:` (pin rule applies) | the task's `Effort:`, raised to the tier floor |
| demo-studio — Step 2.5 | main session; autopilot spawn | `standard` | `high` |
| independent frame/audio review — autopilot, `auto-publish-after-qc` | spawn (autopilot) | `standard` | `high` |
| gate-concierge — closing pass | main session | `top` | `high` |
| autopilot Step-3 dispatch | spawn (autopilot) | `standard`; `top` if it would execute any `human_gate: true` task | `high` |
| autopilot | main session | `top` | `high` |
| mastermind one-shot — external pool | kernel CLI dispatch | `top` | `xhigh` |
| manager-mode session — external pool | main session | `top` | `high` |
| row-17 / row-18 probe subagent | spawn | the tier under test | `low` |
| log/summary chore subagent — only when a dispatcher spawns one | spawn | `fast` | the `fast` floor |

- `max` stays the rare, deliberate rung: idea-forge (one-shot, short output, highest leverage) is
  its only seat default.
- A user may raise a main session above its row; no dispatcher ever binds a seat below it. Seat
  rows never weaken the pin rule — every `top` row is pinned like any `top` task.
- Under `routing: inherit` the spawn rows are moot (everything inherits); the main-session rows
  still apply, because the user sets them.

## Main-session settings (the user's knob)

No seat can change its own model or effort: a main session runs at whatever the user set before
its first message. So every kickoff in `../prompts/` opens with its seat's **Session settings**
block (values from §Seat settings), and the guide hands every kickoff over with it.

- **Claude Code Desktop:** the model picker in the row under the prompt box (it can change
  mid-session); effort under **Effort** in the same picker (Cmd+Shift+E on macOS) — "Extra" there
  is `xhigh`. Typing `/model <alias>` then `/effort <level>` as the first messages also works.
- **Claude Code CLI:** `claude --model <alias> --effort <level>`, or `/model` + `/effort` inside
  the session.
- **Set both explicitly, every new session.** Several current models start at `medium` when
  nothing sets a level, and `max` applies to the current session only. Never set seat effort
  through settings `effortLevel` / `modelSettings`: they reject `max` and apply to every session
  in the folder.
- **Self-check.** Each kickoff tells the session to state the exact model id it runs as before
  anything else. An interactive `top` seat that resolves below the campaign's `top` binding warns
  and waits for the user's go (this generalizes the Routing section's planning-step warning). A
  dispatched step subagent only states it — its dispatcher logs drift. Effort cannot be
  self-verified: the user attests it, and the guide records it in the runsheet.

## The harness gate (run before any knob is touched)

Capability probe, never name-matching — once per campaign, re-checked cheaply at each dispatcher
boot:

1. **Identity.** Claude Code sets `CLAUDECODE=1` in every subprocess it spawns. Probe from a
   shell: PowerShell `$env:CLAUDECODE -eq "1"`; POSIX `[ "$CLAUDECODE" = "1" ]`. Not set → not
   Claude Code.
2. **Knobs.** In Claude Code the Agent tool accepts a per-spawn `model`. Effort has two
   mechanisms: **(a) per-spawn `effort`** on the Agent tool for non-fork subagents, where the build
   exposes it — probe it as a capability (the dispatcher's own Agent tool lists an `effort`
   parameter), never by version number; and **(b) the executor variant files** (agent-definition
   frontmatter `effort:`, below), which work in every build. Executors always dispatch through (b)
   — the variants also carry the executor's tool set without `Agent` — and additionally pass (a)
   with the same value when it exists. Every other spawn (step seats, reviewer fan-outs, probes)
   uses (a); without it, that spawn inherits its dispatcher's effort, logged as degraded in the
   Routing section.
   Not Claude Code: an external-pool kernel context uses `task-contract.md` §6 (per-CLI flags,
   its own concern); **any other harness → `routing: inherit`** — log it in the Routing section
   and dispatch everything at inherited settings.
3. **Hard rules.**
   - **Degraded, never blocking.** A campaign that can't route still builds — at inherit. No
     routing condition is ever a hard stop.
   - **Never emulate effort.** Effort is a budget knob the runtime honors or doesn't; "think
     extra hard about this" in a prompt is not a substitute and is forbidden as one.
   - **Overrides live in dispatch-time glue only.** Committed plans and manifests carry the
     abstract ladder and tiers; only the dispatcher — after probing its own runtime — binds them
     (this is what makes the plans portable to any harness).

### Settings that defeat routing (row 18 probes them)

- `CLAUDE_CODE_EFFORT_LEVEL` set → it outranks per-spawn `effort`, variant frontmatter and the
  session level, so every routed effort is ignored. Warning + fix hint: remove it from the shell
  environment and from any settings `env` block.
- `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` set → per-spawn and frontmatter `model` are ignored, so tiers
  stop binding. Same warning + fix.
- `CLAUDE_CODE_SUBAGENT_MODEL` set → only a spawn that passes no `model` picks it up; dispatchers
  always pass one. Note it, no warning.
- **Safety-classifier fallback:** a flagged request re-runs on a fallback model and the session
  stays there. The per-dispatch resolved-model log is how drift shows up; settings
  `switchModelsOnFlag: false` makes Claude Code ask instead — the user's call, never set for them.
- **`availableModels`** silently substitutes a blocked model — why the probe checks resolved ids.

None of these is a blocker (degraded, never blocking): each becomes a warning line in the Routing
section, which the guide surfaces before Step 2.

## The boot probe (tollgate row 18) and the Routing section

Row 18 of the tollgate matrix (`tollgate.md`) — class **degraded**; probed wherever the campaign
tollgate runs, and by any dispatcher booting without a Routing section. Steps (read-only):

1. Harness identity per the gate above.
2. **Effort mechanism:** does this session's Agent tool list a per-spawn `effort` parameter →
   `per-spawn`; else `variants-only`.
3. **One trivial subagent per tier the campaign will use**, spawned with that tier's binding (and
   per-spawn `effort: low` when available), whose whole task is: *"report the exact model id you
   are running as."* Requested vs resolved catches the silent-fallback case. One probe per tier,
   not per effort level.
4. **Variant files:** check the five executor variant files exist in the **project repo's**
   `.claude/agents/`. The check is read-only, like every probe (`tollgate.md` §Probe rules);
   **installing them is the dispatcher's boot action, not the probe's** — the dispatcher copies
   them from the kit checkout's `references/agents/` and commits (project-repo config is a
   sanctioned write) before its first dispatch, per §Dispatch binding below.
5. **Settings that defeat routing** (§above): read `CLAUDE_CODE_EFFORT_LEVEL`,
   `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` and `CLAUDE_CODE_SUBAGENT_MODEL` (PowerShell `$env:NAME`;
   POSIX `printenv NAME`).

Write the results as a **Routing** section of the tollgate report (sibling of Stack requirements):
harness; knobs available; effort mechanism (`per-spawn` | `variants-only`); tier→alias map with the
**probe-verified resolved model id** and the **effort floor** per tier; ladder (`tier-first` |
`effort-first`); effort-variant install state (installed y/n); campaign pin overrides (the autopilot
contract's field 16, or the orchestrator kickoff's ROUTING line); **warnings** — the
main-session-below-`top` warning below, plus one line per setting that defeats routing (§above).
Later dispatchers read this section instead
of re-deriving, and re-verify it cheaply at their own boot — same freshness rule as session-scoped
rows. **Warn** in the section when the main session's model resolves below `top` while planning
steps (0/1) are planned — the kit's "strongest model only" guardrails, now a checkable line.

## The executor variant files (`references/agents/`)

Five thin agent definitions — `executor-low.md`, `executor-medium.md`, `executor-high.md`,
`executor-xhigh.md`, `executor-max.md` — identical except `name:` and frontmatter `effort:`. Their
`tools:` list is the executor's working set **without `Agent`** (executors never spawn agents),
and their body defers entirely to the dispatch prompt (the orchestrator still delivers the
executor kit + task block per `task-contract.md` §3 — the variant carries the *knob*, not the
doctrine). Installed by the dispatcher at boot (probe step 4). Dispatching a task then reads:
**agent type = `executor-<dispatched effort>`, `model` = the tier's verified binding** (plus
per-spawn `effort` = the same value where available). `max` dispatches
are rare and deliberate — the ladder's last rung, not a default.

## Dispatch binding (who decides what, when)

- **Architect (Stage 3)** assigns per-task `effort` (as always) and `Model tier:` — the only seat
  that knows task difficulty. Pin rules above; don't default everything up. It authors effort for
  difficulty only — tier floors are applied at dispatch, never written into plans — and dispatches
  its reviewer fan-outs at §Seat settings' reviewer row.
- **Orchestrator** — at boot, resolve routing (read or create the Routing section, install
  variants); per dispatch, bind agent type from the dispatched effort (authored, raised to the tier
  floor), `model` from `model_tier`, per-spawn `effort` when available, and **log the resolved
  model and dispatched effort in the dispatch record** (auditability; catches drift). Under
  `routing: inherit`, dispatch exactly as before this doctrine existed.
- **Autopilot** — step seats bind per §Seat settings — per-spawn `model` always, per-spawn
  `effort` when the Routing section shows `per-spawn` (else inherited from the autopilot's own
  effort, logged as degraded); a Step-3 dispatch that would execute any `human_gate: true` task
  binds `top`; Step 2's tasks per their manifest fields, with the floors and ladder the
  orchestrator applies. The contract's field 16 (`campaign-contract.md`) can pin campaign-wide; a
  pin never overrides a `top` pin.
- **Escalation ladder** (executor-miss class only — the mastermind taxonomy is unchanged). Efforts
  here are *dispatched* efforts (authored effort raised to the tier floor). Retry 1 = as-is with a
  concrete hint. Then, by the task's dispatched tier:
  - **`standard`** (ladder `tier-first`, the Claude Code default) — retry 2 = +1 model tier at the
    same effort (→ `top`); final retry = +1 effort step (cap `max`). On the default binding the
    next `standard` effort step costs more than `top` at the current step and scores lower
    (evidence: the PRD).
  - **`fast` and `top`** — retry 2 = +1 effort step; final retry = +1 model tier (caps `max`/`top`).
    When the tier is already capped, the final retry repeats retry 2's settings with a fresh hint.
  - Every rung applies the floor of the tier it lands on (a `fast` task promoted to `standard`
    dispatches at least at the `standard` floor).

  **The pin rule tracks the *dispatched* effort, not just the authored one:** any dispatch at
  `xhigh|max` — including a retry escalated into it — runs at `top` immediately. Flakes
  re-dispatch as-is; plan bugs route to the architect — never up-tiered through.

## Boundaries

- **Routing optimizes; it never weakens.** No gate, review, scope-check, or QC loop changes
  because a spawn was cheap. A `fast` dispatch that fails its gate escalates like any other.
- **No vendor model id in doctrine or plans** — aliases appear only in runtime-binding text and
  the campaign's Routing section, which the probe re-verifies every campaign (nothing here goes
  stale by design).
- **The gate runs first, every time.** No Routing section and no probe → you are at
  `routing: inherit`, and that is a fine place to be.
