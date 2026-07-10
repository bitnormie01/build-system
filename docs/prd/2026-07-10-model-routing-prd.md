# PRD — Model/effort routing (per-spawn model + effort, decided at every dispatch, harness-gated)

**Status:** approved implementation contract. Requested by the user 2026-07-10: *"set up efforts and
models at step 0a and after architect step (or wherever appropriate — you decide) … at every spawn it
overrides to decide model and effort (if possible) and then spawns the sub-agent accordingly, to be
efficient at every sub-agent spawn … before triggering such deciding, it should know where it is
running — Claude Code or another agent application (Codex, …) — so it doesn't conflict in other
applications."* User-locked decisions: (1) the effort ladder is the runtime's six levels —
`low / medium / high / xhigh ("Extra") / max / ultracode`; (2) placement is this PRD's call;
(3) shipping agent-type variant files is approved.

**Scope note:** in-session routing is designed **for Claude Code only** (the user's directive). Other
harnesses are handled by the harness gate (§4): detect → not Claude Code → inherit everything (the
external-pool kernel's per-CLI dispatch in `task-contract.md` §6 already covers Codex at the CLI
level and is corrected, not extended, here).

## 0. How to use this PRD (read first)

1. Read this end-to-end, then: `references/task-contract.md` (§1–§6), `references/tollgate.md`,
   `orchestrator/SKILL.md`, `autopilot/SKILL.md`, `architect/SKILL.md` Stage 3–4,
   `references/campaign-contract.md`, `guide/SKILL.md` §Before Step 2.
2. **Grounding (verified 2026-07-10 against live Claude Code docs — sub-agents.md,
   model-config.md, env-vars.md).** Facts this design builds on:
   - Agent-tool per-spawn `model` param: aliases `sonnet|opus|haiku|fable|best|default|opusplan`
     or pinned ids; a per-spawn value overrides agent-definition frontmatter.
   - **No call-time `effort` param on the Agent tool in current builds.** Per-spawn effort comes
     from the agent **definition** (`.claude/agents/*.md` frontmatter `effort:
     low|medium|high|xhigh|max`) — hence the variant files (§6.2).
   - Session/campaign defaults: `CLAUDE_CODE_SUBAGENT_MODEL` (value `inherit` = fall through),
     `CLAUDE_CODE_EFFORT_LEVEL`, settings `effortLevel` (does not accept `max`/`ultracode`);
     `/effort` accepts all six incl. `ultracode` (session-only, v2.1.203+); headless
     `claude -p --model <m> --effort <e>`.
   - Harness detection: **`CLAUDECODE=1`** is set in every subprocess Claude Code spawns (Bash,
     PowerShell, hooks, stdio MCP); `CLAUDE_CODE_CHILD_SESSION=1` in shell-like children.
   - Subagents inherit the parent's model + effort when nothing overrides. Nested subagent spawn
     exists (v2.1.172+, depth ≤5, needs `tools: Agent`) — **not relied on here**.
   - **`availableModels` allowlist silently falls back** a blocked model request with no warning —
     so a requested model is never trusted; the probe verifies the *resolved* model (§5).
   - Effort is adaptive, not a fixed token budget.
   **Freshness rule:** none of these are pinned as doctrine facts at run time — the boot probe
   (§5) *is* the re-verification, every campaign. The doctrine hardcodes no model ids; aliases and
   tier maps are resolved per campaign.
3. **Quality loop:** implement all of §8, then a multi-agent adversarial review (ultracode
   standing opt-in): three lenses — PRD coverage; consistency/mechanics (Windows-executable
   probes, cross-refs, no contradictions incl. frontmatter descriptions); **grammar/parse drift**
   (the §1 plan grammar, §2 manifest equality set, §4 reviewer, and §5 parser regexes must stay
   mutually consistent after the effort-enum and model-tier changes — this is the load-bearing
   lens). Verify findings, fix confirmed ones, re-check mechanically, commit.
4. Two commits to `main`: this PRD, then the implementation exactly to it.

## 1. Goals and non-goals

- **G1 — Every spawn is a routing decision.** Task subagents (orchestrator/autopilot Step 2),
  step subagents (autopilot 0a/0/1/2.5/3), and reviewer fan-outs each get a deliberate
  model + effort, bound at dispatch from committed values — not blanket inheritance of the main
  seat's settings.
- **G2 — Know where you run before touching a knob.** The harness gate (§4) resolves the runtime
  once per campaign (`CLAUDECODE=1` + knob probe) and records it; a harness without the knobs gets
  `routing: inherit` — never a guessed flag, never prompt-emulated effort, never a conflict in
  Codex or any other application.
- **G3 — Plans stay portable.** Committed plans/manifests carry only the abstract ladder
  (`effort`) and abstract `model_tier` (`top|standard|fast`) — never a vendor model id. Binding
  tier→model happens only in the dispatcher, after its own probe.
- **G4 — Asymmetric policy, enforced.** Judgment/security/plan-touching work is never downgraded
  (pinned `top`); downgrades only on provably mechanical work; failures escalate up the ladder
  (§6.4). The kit's prose-only "strongest model" guardrails become mechanically checkable.
- **G5 — Verified, not assumed.** The probe confirms the *resolved* model per tier (silent-fallback
  defense); every dispatch logs what actually ran.
- **Non-goals:** in-session routing adapters for Codex/other harnesses (deferred §12 — the gate
  makes absence safe); changing the external-pool kernel's dispatch design (§6 of task-contract is
  corrected only); per-subagent thinking-token budgets; dynamic mid-task effort changes (a task is
  a one-shot — unchanged).

## 2. The three decision points (placement — this PRD's call)

1. **Campaign boot probe** — wherever the campaign tollgate runs (0a Stage 0 / guide skip-0a /
   autopilot boot) *and* at orchestrator boot when no Routing section exists yet: run the harness
   gate + knob probe (§5), write the **Routing** section into the tollgate report. Routing is a
   capability question; the tollgate is the capability checker — new **row 18**.
2. **Architect Stage 3** — the only seat that knows task difficulty already assigns per-task
   `effort`; it now also assigns per-task **`model_tier`** with the same
   don't-default-everything-up discipline and the §3 pin rules.
3. **Dispatch binding** — the orchestrator (inline or standalone) and the autopilot bind
   `effort` + `model_tier` + step-seat tiers to the knobs the Routing section confirmed, and log
   the resolved model per dispatch.

## 3. The ladder and the tiers (canonical, kit-wide)

**Effort ladder (six levels, user-locked):** `low | medium | high | xhigh | max | ultracode`.
- "Extra" is the user-facing name for `xhigh` — doctrine writes `xhigh`.
- **Per-task `Effort:` takes `low|medium|high|xhigh|max` (five).** `ultracode` is a
  **main-session-only mode** (not accepted in agent frontmatter or settings; it is a session-level
  orchestration mode) — never a per-task or per-subagent dispatch value. The doctrine says this
  explicitly so no dispatcher tries it.
- **Legacy migration:** the old plan-grammar enum `none|minimal|low|medium|high|xhigh` shrinks:
  `none`/`minimal` are no longer emitted (architect) and alias to `low` when read (parser/
  dispatcher resilience); `max` joins the enum. Grammar §1, parser §5, reviewer §4, and §6 update
  together (§7.2).

**Model tiers (three, abstract):** `top | standard | fast`.
- `top` — idea-forge, architect, mastermind judgment, autopilot conformance approvals,
  resource-extractor, and every task that is `human_gate: true`, security-sensitive, or
  `effort: xhigh|max` (**pinned — never downgraded, by anything**).
- `standard` — typical executor tasks, adversarial reviewers, demo-studio, gate-concierge.
- `fast` — provably mechanical work only: scaffolding/config/boilerplate tasks at `effort:
  low`, log/summary chores. Never plan-touching, never gates' judgment.
- Tier→model binding is campaign-resolved (§5): by default in Claude Code `top` → the session's
  strongest available alias (probe-verified), `standard` → inherit, `fast` → the fastest
  cheap alias (e.g. `haiku`, probe-verified). No id is hardcoded in doctrine.
- **Asymmetry rationale (recorded):** a hard task on a weak model wastes retries and poisons
  dependents; an easy task on a strong model only wastes tokens — so pins beat savings, always.

## 4. The harness gate (before any knob is touched)

Capability probe, never name-matching, run once per campaign and re-checked at each dispatcher
boot:

1. **Identity:** `CLAUDECODE` env var in a spawned shell (`$env:CLAUDECODE -eq "1"` /
   `[ "$CLAUDECODE" = "1" ]`) → Claude Code. Not set → not Claude Code.
2. **Knobs:** in Claude Code, confirm the Agent tool is present and accepts `model`; confirm the
   effort mechanism (agent-variant files installable, §6.2). Elsewhere: the external-pool kernel
   context uses `task-contract.md` §6 (CLI flags — already per-CLI); any other harness →
   **`routing: inherit`**, logged, everything runs at inherited settings.
3. **Hard rules:** routing failure is **degraded, never blocking** (a build that can't route
   builds at inherit); never emulate effort via prompt wording ("think harder") — effort is a
   budget knob, not a persona; overrides live only in dispatch-time glue, never in committed
   plans (G3).

## 5. Boot probe + the Routing section (tollgate row 18)

**Row 18** (added to the matrix): *subagent model/effort knobs resolved + verified* — class
**degraded** (FAIL → `routing: inherit`); needed by Step 2 and any campaign step that dispatches
subagents (autopilot campaigns: always). Probe (read-only, Windows-executable):
1. Harness identity per §4.1.
2. For each tier the campaign will use, dispatch **one trivial subagent** with that tier's binding
   whose whole task is "report the exact model id you are running as" — compare requested vs
   resolved (catches the `availableModels` silent fallback). One per tier, not per level.
3. Confirm the effort mechanism: the variant files exist in the project repo's `.claude/agents/`
   (install them if absent — §6.2; this is project-repo config, a sanctioned write, committed).

Results go in a **Routing** section of the tollgate report (sibling of Stack requirements):
harness; knobs available; tier→alias map with the **probe-verified resolved id** per tier; effort
mechanism state (variants installed y/n); campaign pin overrides (from the autopilot contract
field 16 or the orchestrator kickoff's ROUTING line, §7). Whoever probes writes it; later
dispatchers read it instead of re-deriving — and re-verify cheaply at their own boot (same rule as
session-scoped rows).

## 6. Grammar, manifest, and dispatch changes

### 6.1 Plan grammar + manifest (`task-contract.md`)
- §1 `**Effort:**` enum → `low|medium|high|xhigh|max` (required, as today; missing → parser
  defaults `medium`, unchanged). New **optional** line `**Model tier:**` `top|standard|fast` —
  absent → `standard`, except the §3 pin rule (reviewer enforces `top` where pinned).
- §2 manifest: optional `model_tier` field, default `standard`; when present it joins the
  byte-match equality set. Existing manifests without it stay valid.
- §3: fix the stale claim — `task.effort` is a dispatch parameter bound to **the runtime's
  resolved effort knob** (Claude-Code-native: the executor variant files, §6.2; external-pool: §6
  CLI flags) — not "the Agent tool's effort parameter".
- §4 reviewer: enum update + one new check: pinned-`top` coverage (human_gate / security /
  `xhigh|max` tasks carry `Model tier: top` or no Model-tier line contradicting it).
- §5 parser: effort regex accepts `low|medium|high|xhigh|max` + legacy `none|minimal` (alias →
  `low`); new optional Model-tier regex.
- §6: correct "both CLIs accept the same six levels" (false today) → each CLI's accepted levels
  drift; the kernel adapter re-verifies per campaign; kit-canonical ladder is §3's. Claude Code
  row already documents `--effort` / `CLAUDE_CODE_EFFORT_LEVEL`.

### 6.2 Executor variant files (user-approved artifact class: config templates)
`references/agents/executor-{low,medium,high,xhigh,max}.md` — five thin agent definitions,
identical except frontmatter `effort:`; `tools:` lists the executor's working set **without
`Agent`** (executors never nest); body is two lines ("Follow the doctrine and task block delivered
in your dispatch prompt verbatim."). The dispatcher **installs** them by copying to the project
repo's `.claude/agents/` (commit them) at boot when row 18 passes; dispatching a task then means:
`subagent_type: executor-<task.effort>` + `model: <tier binding>`. `max`-effort dispatches are
rare and deliberate (the ladder's last rung).

### 6.3 Dispatcher wiring (orchestrator + autopilot)
- **Orchestrator boot:** after the stack-rows probe — resolve routing: read the report's Routing
  section; none → run the §5 probe and write it. Install variants. Then per dispatch: bind
  `model` from `model_tier`, agent type from `effort`, **log the resolved model in the dispatch
  record**. `routing: inherit` → dispatch exactly as today.
- **Autopilot:** boot 3's tollgate includes row 18 + Routing section. Step-seat tiers are
  kit-static per §3 (0a/0/1 dispatches at `top`; 2.5/3 and reviewers `standard`), bound the same
  way. Contract gains **field 16 — Routing** (defaultable: `auto` per
  `references/model-routing.md` | pin, e.g. "pin all to <alias>").
- **Escalation ladder** (executor-miss class only — mastermind taxonomy unchanged): retry 1 =
  as-is + concrete hint (today's rule); retry 2 = +1 effort step; final retry = +1 model tier
  (cap `max`/`top`). Flake → as-is; plan bug → architect, never up-tiered through.
- **Enforcement win:** the probe warns when the main session's model resolves below `top` while
  planning steps (0/1) are contracted/planned — the "strongest model only" guardrails become a
  checkable line instead of prose.

## 7. File-by-file change map

New:
1. **`references/model-routing.md`** — the doctrine: §3 ladder + tiers + pin/asymmetry rules,
   §4 harness gate, §5 probe + Routing section format, §6.2 variant install, §6.3 binding +
   escalation ladder, the never-emulate and degraded-never-blocking rules, freshness note.
2. **`references/agents/executor-{low,medium,high,xhigh,max}.md`** — five variant templates
   (§6.2).

Modified:
3. **`references/task-contract.md`** — all §6.1 items.
4. **`references/tollgate.md`** — row 18; report §Routing sentence in the report-format section.
5. **`architect/SKILL.md`** — Stage 3: effort enum update + `Model tier:` bullet with pin rules;
   Stage 4 validation list: pinned-top coverage check (+ model_tier joins the equality bullet).
6. **`orchestrator/SKILL.md`** — boot routing resolution; dispatch binding (replace the stale
   "Agent tool's effort parameter" sentence); resolved-model logging; escalation ladder in the
   failure section.
7. **`autopilot/SKILL.md`** — boot 3 row-18/Routing; a Routing paragraph after the
   execution-modes table (step-seat tiers, binding, contract field 16).
8. **`references/campaign-contract.md`** — field 16 Routing (defaultable `auto`).
9. **`prompts/INVOKE_AUTOPILOT.md`** — ROUTING line.
10. **`prompts/INVOKE_ORCHESTRATOR.md`** — step 2 gains the routing resolution; the "Effort is
    per task" note's values updated; optional ROUTING line.
11. **`guide/SKILL.md`** — Before-Step-2 bullet: re-check the Routing section alongside stack
    rows.
12. **`references/roles.md`** — the kernel effort sentence gains "(and `model_tier`)".
13. **`README.md`** — tree lines (`model-routing.md`, `agents/`); one sentence.

## 8. Quality invariants (reviewers check)

- §1 grammar, §2 equality set, §4 reviewer, §5 regexes, and architect Stage 4 are mutually
  consistent post-change (the grammar/parse lens' whole job).
- No vendor model id appears in any committed-plan-facing doctrine; aliases appear only in
  runtime-binding text and are marked campaign-resolved.
- `ultracode` is nowhere accepted as a per-task/per-subagent value.
- Pinned-`top` rule appears identically in `model-routing.md`, architect Stage 3, and the §4
  reviewer check (cited, not divergently restated).
- Probes Windows/PowerShell-5.1-executable; `CLAUDECODE` check shown in both shells.
- Routing failure paths all read "degraded → inherit", never a hard stop.
- Guide-mode/no-routing campaigns are untouched: absent Routing section + absent `model_tier`
  lines must leave every existing behavior byte-compatible (defaults: standard/inherit).
- All new cross-refs resolve; tollgate matrix stays 6 columns, 0 malformed rows (now 18 rows).

## 9. Acceptance (mechanical where possible)

1. All 13 §7 changes present; greps: `model-routing` cited from architect/orchestrator/autopilot/
   tollgate/task-contract/campaign-contract/guide/README; `Model tier:` in task-contract §1 + §5
   regex + architect; `model_tier` in §2; `row 18` in tollgate + orchestrator + autopilot;
   `CLAUDECODE` in model-routing; zero remaining `none|minimal` as *current* enum (legacy-alias
   mentions only); the stale "effort` parameter" claims in task-contract §3/§6 and
   orchestrator/INVOKE_ORCHESTRATOR corrected.
2. Cell-count check: tollgate 6×18 data rows; task-contract tables well-formed.
3. Five variant files parse as frontmatter'd markdown, differ only in `effort:` + name.
4. Dry read-through: orchestrator boot → probe → install → dispatch → escalate covers §6.3.
5. §0.3 review run; findings verified; confirmed ones fixed.

## 10. Implementation order

1. `references/model-routing.md` (foundation)
2. `references/agents/*` variants
3. `task-contract.md` (§6.1 — the grammar core)
4. `tollgate.md` row 18 + report section
5. architect → orchestrator → autopilot → campaign-contract → prompts → guide → roles → README
6. §0.3 review → fix → §9 checks → one implementation commit, push.

## 11. Decided defaults (change only if the user objects)

1. Model tiers stay three (`top|standard|fast`) — model aliases don't stretch to six meaningful
   rungs; the six-level precision lives in `effort`, where the runtime actually honors it.
2. `Model tier:` is optional-with-default (`standard`) — old plans/manifests stay valid unmigrated.
3. Variant files are the per-spawn effort mechanism (not `--agents` JSON) — inspectable files in
   the project repo beat an opaque launch flag for auditability.
4. The Routing section lives in the tollgate report (not a new artifact) — one capability document
   per campaign.
5. Step-seat tiers are kit-static in `model-routing.md`; only tier→model binding is per-campaign.

## 11b. Post-review corrections (adversarial review, 2026-07-10 — recorded, implementation is canonical)

1. **§5 probe step 3:** "install them if absent" contradicted the tollgate's probes-are-read-only
   rule — corrected: the probe only *checks* the variant files' presence; the **install is the
   dispatcher's boot action** (as §6.3 already said). Tollgate row 15 remains the sole sanctioned
   probe write.
2. **§6.1 equality scope:** "when present it joins the byte-match equality set" was one-directional
   — corrected to **iff**: `model_tier` appears in the manifest iff the plan carries the line; a
   manifest-only value is invalid (closes the undetectable-drift hole).
3. **Escalation × pin timing:** the pin rule tracks the *dispatched* effort — a retry escalated to
   `xhigh|max` runs at `top` immediately.
4. **§7 scope additions** (consistency-lens conformance, beyond the change map):
   `pipeline-fallback.md` Stage-4 mirror; guide Before-Step-1 baton checklist; the report list
   renumbered (Routing = section 4); vendor-name mentions replaced with tier language in
   architect/idea-forge Hard rules and INVOKE_ARCHITECT/INVOKE_IDEA_FORGE; §4 reviewer pin check
   keyed on plan-content gating (the flag is manifest-only); variant descriptions made
   level-neutral so the files differ only in `name:`/`effort:` (§9.3 now passes mechanically).

## 12. Deferred (do not build)

In-session routing adapters for Codex/Cursor/other harnesses (the gate already makes them safe at
`inherit`; an addendum can map their knobs when the user asks); relying on nested subagent spawn
(depth >1) for autopilot step dispatch; per-subagent thinking-token budgets; automatic
tier-downgrade heuristics beyond the explicit `fast` class.
