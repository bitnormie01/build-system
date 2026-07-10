# Model/Effort Routing — decide model + effort at every spawn, harness-gated

Every subagent spawn is a routing decision: which **model tier** and which **effort level** this
work actually needs. Blanket inheritance of the main seat's settings overspends on mechanical work
and — worse — lets judgment work run on whatever the session happened to boot with. This file is
the kit-wide doctrine: the ladder, the tiers, the harness gate that keeps it from misfiring in
other agent applications, the boot probe, the dispatch binding, and the escalation ladder. Design
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
| `top` | idea-forge, architect, mastermind judgment, autopilot conformance approvals, resource-extractor — and every task that is `human_gate: true`, security-sensitive, or `effort: xhigh\|max` | **Pinned. Never downgraded, by anything** — not by escalation, not by budget, not by a campaign pin. |
| `standard` | typical executor tasks, adversarial reviewers, demo-studio, gate-concierge | The default when a task carries no `Model tier:` line. |
| `fast` | provably mechanical work only: scaffolding/config/boilerplate tasks at `effort: low`, log/summary chores | Never plan-touching work, never a gate's judgment, never anything pinned `top`. |

**Why asymmetric:** a hard task on a weak model wastes retries *and* poisons every dependent task;
an easy task on a strong model only wastes tokens. Pins beat savings, always. Downgrade only what
is provably mechanical; when unsure, `standard`.

**Tier→model binding is campaign-resolved, never doctrine-hardcoded.** In Claude Code, `top` binds
to the session's strongest available alias, `standard` to inherit, `fast` to the fastest cheap
alias — each **verified by the boot probe** (below), because a settings `availableModels`
allowlist silently substitutes a blocked model with no warning. The doctrine names no model ids;
what a tier resolved to this campaign lives only in the Routing section of the tollgate report.

## The harness gate (run before any knob is touched)

Capability probe, never name-matching — once per campaign, re-checked cheaply at each dispatcher
boot:

1. **Identity.** Claude Code sets `CLAUDECODE=1` in every subprocess it spawns. Probe from a
   shell: PowerShell `$env:CLAUDECODE -eq "1"`; POSIX `[ "$CLAUDECODE" = "1" ]`. Not set → not
   Claude Code.
2. **Knobs.** In Claude Code: the Agent tool is present and accepts a per-spawn `model`; the
   effort mechanism is the **executor variant files** (below) — there is no call-time `effort`
   parameter on the Agent tool in current builds, so effort rides the agent *definition*.
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

## The boot probe (tollgate row 18) and the Routing section

Row 18 of the tollgate matrix (`tollgate.md`) — class **degraded**; probed wherever the campaign
tollgate runs, and by any dispatcher booting without a Routing section. Steps (read-only):

1. Harness identity per the gate above.
2. **One trivial subagent per tier the campaign will use**, spawned with that tier's binding, whose
   whole task is: *"report the exact model id you are running as."* Requested vs resolved catches
   the silent-fallback case. One probe per tier, not per effort level.
3. Effort mechanism: check the five executor variant files exist in the **project repo's**
   `.claude/agents/`. The check is read-only, like every probe (`tollgate.md` §Probe rules);
   **installing them is the dispatcher's boot action, not the probe's** — the dispatcher copies
   them from the kit checkout's `references/agents/` and commits (project-repo config is a
   sanctioned write) before its first dispatch, per §Dispatch binding below.

Write the results as a **Routing** section of the tollgate report (sibling of Stack requirements):
harness; knobs available; tier→alias map with the **probe-verified resolved model id** per tier;
effort mechanism state (variants installed y/n); campaign pin overrides (the autopilot contract's
field 16, or the orchestrator kickoff's ROUTING line). Later dispatchers read this section instead
of re-deriving, and re-verify it cheaply at their own boot — same freshness rule as session-scoped
rows. **Warn** in the section when the main session's model resolves below `top` while planning
steps (0/1) are planned — the kit's "strongest model only" guardrails, now a checkable line.

## The executor variant files (`references/agents/`)

Five thin agent definitions — `executor-low.md`, `executor-medium.md`, `executor-high.md`,
`executor-xhigh.md`, `executor-max.md` — identical except `name:` and frontmatter `effort:`. Their
`tools:` list is the executor's working set **without `Agent`** (executors never spawn agents),
and their body defers entirely to the dispatch prompt (the orchestrator still delivers the
executor kit + task block per `task-contract.md` §3 — the variant carries the *knob*, not the
doctrine). Installed by the dispatcher at boot (probe step 3). Dispatching a task then reads:
**agent type = `executor-<task.effort>`, `model` = the tier's verified binding.** `max` dispatches
are rare and deliberate — the ladder's last rung, not a default.

## Dispatch binding (who decides what, when)

- **Architect (Stage 3)** assigns per-task `effort` (as always) and `Model tier:` — the only seat
  that knows task difficulty. Pin rules above; don't default everything up.
- **Orchestrator** — at boot, resolve routing (read or create the Routing section, install
  variants); per dispatch, bind agent type from `effort` and `model` from `model_tier`, and **log
  the resolved model in the dispatch record** (auditability; catches drift). Under
  `routing: inherit`, dispatch exactly as before this doctrine existed.
- **Autopilot** — step-seat tiers are kit-static: Steps 0a, 0, 1 dispatch at `top`;
  Steps 2.5, 3 and reviewer fan-outs at `standard`; Step 2's tasks per their manifest fields. The
  contract's field 16 (`campaign-contract.md`) can pin campaign-wide; a pin never overrides a
  `top` pin.
- **Escalation ladder** (executor-miss class only — the mastermind taxonomy is unchanged):
  retry 1 = as-is with a concrete hint; retry 2 = +1 effort step; final retry = +1 model tier
  (caps: `max`, `top`). **The pin rule tracks the *dispatched* effort, not just the authored
  one:** any dispatch at `xhigh|max` — including a retry escalated into it — runs at `top`
  immediately, without waiting for the final-retry tier bump. Flakes re-dispatch as-is; plan bugs
  route to the architect — never
  up-tiered through.

## Boundaries

- **Routing optimizes; it never weakens.** No gate, review, scope-check, or QC loop changes
  because a spawn was cheap. A `fast` dispatch that fails its gate escalates like any other.
- **No vendor model id in doctrine or plans** — aliases appear only in runtime-binding text and
  the campaign's Routing section, which the probe re-verifies every campaign (nothing here goes
  stale by design).
- **The gate runs first, every time.** No Routing section and no probe → you are at
  `routing: inherit`, and that is a fine place to be.
