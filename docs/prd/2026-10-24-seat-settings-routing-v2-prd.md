# PRD — Seat settings + routing v2 (per-seat model + effort, dispatch floors, ladder, per-spawn effort)

**Status:** approved implementation contract. Requested by the user 2026-10-24 as a kit-maintenance
doctrine change (same kind as `2026-07-10-model-routing-prd.md` — no project repo, no tollgate
report, no runsheet touched). The July routing doctrine routes every **executor** spawn by tier +
effort; this change finishes the job: every **seat** gets a deliberate tier + effort, stale
mechanics are corrected, and the dispatch glue becomes data-driven. **Configuration used (user
values):** `PUSH_TARGET: main` · `OPEN_PR: no` · `FLOORS: on` (top ≥ `medium`, standard ≥ `high`) ·
`FAST_FLOOR: low` · `STANDARD_LADDER: tier-first`.

## 0. How to use this PRD (read first)

1. Read this end-to-end, then: `references/model-routing.md` (all of it), `references/tollgate.md`
   (row 18 + report format), `references/task-contract.md` §1/§3/§6, `references/campaign-contract.md`
   field 16, `docs/prd/2026-07-10-model-routing-prd.md` §8 (its quality invariants all still apply),
   and the eight `prompts/INVOKE_*.md`.
2. **Grounding (verified 2026-10-24 against the live Claude Code docs —
   https://code.claude.com/docs/en/sub-agents, https://code.claude.com/docs/en/model-config,
   https://code.claude.com/docs/en/skills, https://code.claude.com/docs/en/desktop,
   https://code.claude.com/docs/en/permission-modes).** Facts this design builds on:
   - The Agent tool accepts a per-invocation `model`, and — for non-fork subagents, Claude Code
     v2.1.292+ — a per-invocation `effort`, which overrides the agent definition's `effort:` and
     persists on resume.
   - **Subagent model precedence:** per-invocation `model` > agent frontmatter `model` (`inherit` =
     the main conversation's model) > `CLAUDE_CODE_SUBAGENT_MODEL` > the main conversation's model.
     `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` makes Claude Code ignore frontmatter and per-call `model`.
   - **Effort precedence** (inferred from the docs' statements): `CLAUDE_CODE_EFFORT_LEVEL` >
     per-call `effort` > frontmatter `effort` > the session level.
   - `max` is accepted by `/effort`, `--effort` and `CLAUDE_CODE_EFFORT_LEVEL`, not by settings
     `effortLevel` / `modelSettings`, and (unless set through the env var) applies to the current
     session only.
   - The current models behind the default `opus`, `sonnet` and `haiku` aliases default to
     `medium` effort when nothing sets a level; a top-level `effortLevel` in user settings does not
     apply to the current `opus` model. (Model versions are named in §3 only.)
   - Skill frontmatter `model` applies only for the rest of the current turn (the session model
     resumes at the next prompt); skill frontmatter `effort` overrides the session level while the
     skill is active (scope not documented further).
   - **Claude Code Desktop:** model picker in the row under the prompt box, changeable mid-session;
     effort under **Effort** in the same picker (Cmd+Shift+E on macOS); the Code tab reads the same
     settings, skills, CLAUDE.md and `.claude/agents/` as the CLI and runs its own Claude Code copy
     (`/status` shows its version). Desktop has no CLI launch flags.
   - **Auto mode is a permission mode** (a classifier reviews actions); it never selects a model or
     effort. Automatic model switches that do exist: the `opusplan` alias; safety-classifier fallback
     (a flagged request re-runs on a fallback model and the session continues there;
     `switchModelsOnFlag: false` makes Claude Code ask instead); availability fallback (turn only).
   - `availableModels` silently substitutes a blocked model — already the reason the row-18 probe
     checks resolved ids.

   **Freshness rule:** none of these are pinned as doctrine facts at run time — the row-18 probe
   re-verifies every campaign (resolved ids per tier, the effort mechanism, the settings that defeat
   routing). The doctrine hardcodes no model ids; aliases appear only in runtime-binding text.
3. **Quality loop:** implement all of §4, run §6's acceptance checks, then three review lenses over
   the full diff — PRD coverage; consistency and mechanics (cross-refs, PowerShell 5.1 + POSIX
   probes, Desktop/CLI instructions, frontmatter descriptions, seat values identical everywhere);
   **grammar and parse drift** (the plan grammar, manifest equality set, §4 reviewer and §5 regexes
   untouched and mutually consistent; nothing new makes the architect write a model-specific value
   into a plan). Verify findings, fix confirmed ones, record them in §8, re-run §6.
4. Commits to `main`: this PRD; then the implementation exactly to it; then acceptance and review
   fixes.

## 1. Problem

- **Stale mechanics claim.** `model-routing.md` §The harness gate and `task-contract.md` §3 say
  there is no call-time `effort` parameter on the Agent tool. Current builds have one (non-fork
  subagents); the doctrine routes nothing through it.
- **`standard` → `inherit` erases the tier.** Executors are dispatched by the orchestrator, which
  runs at `top`; binding `standard` to inherit silently hands every `standard` executor the `top`
  model — the tier exists on paper only.
- **Step seats and reviewers inherit effort.** Only executors have variant files; autopilot step
  subagents (0a/0/1/2.5/3) and reviewer fan-outs bind a `model` but nothing binds their effort, so
  they run at whatever the dispatcher runs at.
- **Main sessions start at model defaults.** No seat can change its own model or effort; a fresh
  session runs at what the user opened it with — for several current models that is `medium` unless
  the user sets a level, and `max` does not survive into a new session. No kickoff tells the user
  what to set.
- **The closing pass runs `human_gate` work at `standard`.** The tier table puts the whole
  gate-concierge at `standard`, but its closing pass executes `human_gate: true` tasks (deploys),
  which the pin rule says never run below `top`.
- **The escalation ladder collapses when the tier is capped.** "final retry = +1 model tier" is a
  no-op for a `top` task, and for `standard` tasks the evidence (§3) says the next model tier beats
  the next effort step on both score and cost.

## 2. Decisions

**D1 — §Seat settings table: the single source.** A new `model-routing.md` §Seat settings table
gives every seat a kit-static tier **and** effort — main sessions (set by the user before the first
message) and spawns (bound by their dispatcher). Values: guide `standard`/`high`; resource-extractor
`top`/`high`; idea-forge `top`/`max` (the only `max` seat default — one-shot, short output, highest
leverage); architect `top`/`xhigh` (`high` for a one-task plan-bug fix); reviewer fan-outs
`standard`/`high`; gate-concierge preflight `standard`/`high` and closing `top`/`high`; orchestrator
`top`/`high`; executors per task (tier pin rule; effort raised to the tier floor); demo-studio and the
autopilot's independent frame/audio review `standard`/`high`; autopilot Step-3 dispatch
`standard`/`high` (`top` if it would execute any `human_gate: true` task); autopilot `top`/`high`;
mastermind one-shot `top`/`xhigh`; manager mode `top`/`high`; probes the tier under test at `low`;
chores `fast` at the `fast` floor. Every other file cites the table; only the eight
`prompts/INVOKE_*.md` Session-settings lines and the architect kickoff block idea-forge emits repeat
values, and they must match.

**D2 — Default tier binding + effort floors.** Claude Code default binding: `top` → `opus`,
`standard` → `sonnet`, `fast` → `haiku`, each probe-verified. **`standard` never binds to
`inherit`.** A campaign may override any alias (contract field 16, or the orchestrator's ROUTING
line); a pin never overrides a `top` pin; a provider whose aliases resolve to older model families
binds full ids in the Routing section. **Effort floors (`FLOORS: on`, `FAST_FLOOR: low`):** `top`
`medium`, `standard` `high`, `fast` `low`. Dispatched effort = authored (or seat) effort raised to
the bound tier's floor, never lowered. Floors are dispatch-time glue — never written into plans or
manifests, recorded in the Routing section, inert under `routing: inherit`. The pin rule tracks the
dispatched effort.

**D3 — Two effort mechanisms.** (a) **Per-spawn `effort`** on the Agent tool, probed as a capability
(the dispatcher's own Agent tool lists the parameter) — never by version number; used by every
non-executor spawn (step seats, reviewers, probes). (b) **The executor variant files** — executors
always dispatch through them (they also carry the executor tool set without `Agent`) and
additionally pass (a) with the same value when it exists. In a `variants-only` build, non-executor
spawns inherit their dispatcher's effort — logged as degraded, never blocking.

**D4 — Main-session settings.** A new `model-routing.md` §Main-session settings tells the user how
to set model and effort before the first message (Desktop: the model picker + its Effort list, or
`/model` + `/effort`; CLI: `claude --model <alias> --effort <level>`), to set both explicitly in
every new session, and never to set seat effort through settings `effortLevel`/`modelSettings`. All
eight `prompts/INVOKE_*.md` gain a user-facing **Session settings** block after their opening
paragraph and a `SESSION SETTINGS:` first line inside the kickoff code block; idea-forge's emitted
architect block carries the architect's line byte-identically. **Self-check:** each kickoff tells the
session to state its exact model id first; an interactive `top` seat below the campaign's `top`
binding warns and waits for the user's go; a dispatched step subagent only states it (its dispatcher
logs drift). Effort cannot be self-verified — the user attests it.

**D5 — Settings that defeat routing + the extended row-18 probe.** A new §Settings that defeat
routing names `CLAUDE_CODE_EFFORT_LEVEL` (outranks every routed effort), `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`
(ignores per-spawn and frontmatter `model`), `CLAUDE_CODE_SUBAGENT_MODEL` (note only — dispatchers
always pass a `model`), the safety-classifier fallback (drift shows in the per-dispatch resolved-model
log; `switchModelsOnFlag` stays the user's call) and `availableModels`. Row 18 probes the effort
mechanism and reads the three env vars (PowerShell `$env:NAME`, POSIX `printenv NAME`). The Routing
section gains: effort mechanism, effort floor per tier, ladder, and one warning line per setting that
defeats routing. None of these is a blocker.

**D6 — Escalation ladder v2 (`STANDARD_LADDER: tier-first`).** Executor-miss class only; efforts are
dispatched efforts. Retry 1 = as-is + concrete hint. `standard` tasks: retry 2 = +1 model tier at the
same effort (→ `top`), final retry = +1 effort step (cap `max`). `fast` and `top` tasks: retry 2 = +1
effort step, final retry = +1 model tier (caps `max`/`top`); a capped tier repeats retry 2's settings
with a fresh hint. Every rung applies the floor of the tier it lands on. The pin rule tracks the
dispatched effort (any `xhigh|max` dispatch runs at `top` immediately). Flakes re-dispatch as-is;
plan bugs route to the architect.

**D7 — Gate-concierge closing pass at `top`.** It executes `human_gate: true` tasks, and the pin rule
never lets one run below `top`; the preflight pass stays `standard`. An autopilot Step-3 dispatch
binds `top` if it would execute any `human_gate: true` task.

**D8 — Autopilot step seats bound per §Seat settings.** Per-spawn `model` always; per-spawn `effort`
when the Routing section shows `per-spawn`, else inherited from the autopilot's own effort (logged as
degraded). Step 2's tasks per their manifest fields, with the floors and ladder the orchestrator
applies. Field 16 may still pin campaign-wide.

**D9 — Architect reviewer fan-outs + difficulty-only effort.** The spec-document reviewer (Stage 2)
and the §4 plan reviewer (Stage 4) run at §Seat settings' reviewer row (per-spawn model and effort).
The architect authors `Effort:` for task difficulty only — never raised to compensate for a model;
the dispatcher applies tier floors, so plans stay portable.

**D10 — Contracts updated to match.** `task-contract.md` §1 Effort row (raised to the bound tier's
floor at dispatch, never lowered), §3 parenthesis (variant + per-spawn `model` + per-spawn `effort`
where exposed), §6 defaults line (cites §Seat settings). `campaign-contract.md` field 16 names seat
settings, tier bindings, effort floors and per-tier alias overrides. The plan grammar, §2, §4 and §5
are untouched.

**D11 — Attested settings are recorded.** The guide records, per step, the seat settings it ran at
(the model id the session stated + the effort the user set) in the runsheet's step status, and
surfaces the Routing section's warnings before Step 2. The autopilot records its own at boot 4.

## 3. Evidence (the only place model versions appear)

Tags: O = vendor-reported (Anthropic), OG = Google's Gemini 4 Argon card, I = independent, A =
aggregator, P = partner-reported, † = low confidence, e? = effort not stated. Snapshot: the campaign
data files scores.csv / pricing.csv, as of 2026-10-23.

- AA Intelligence Index [I], points ($ per index task): Haiku 5.5 medium 34 ($0.05) · high 38 ($0.08) · xhigh 41 ($0.12) · max 43 ($0.21). Sonnet 5.5 low 36 ($0.35) · medium 41 ($0.48) · high 47 ($0.88) · xhigh 52 ($2.01) · max 56 ($5.46). Opus 5.5 low 42 ($0.55) · medium 51 ($1.34) · high 54 ($1.82) · xhigh 56 ($3.46) · max 58 ($5.98). Cost frontier: Haiku medium→max, Sonnet high, Opus medium→max. Dominated: Sonnet low and medium (by Haiku xhigh/max), Opus low (by Haiku max), Sonnet xhigh (by Opus high), Sonnet max (by Opus xhigh). → standard floor high, top floor medium, standard ladder tier-first. Opus marginal gain: medium→high +3 for +36% cost; high→xhigh +2 for +90%; xhigh→max +2 for +73% → most top seats at high; idea-forge (one-shot, short output) at max; architect at xhigh.
- Sonnet 5.5 per effort [A†]: Terminal-Bench 4.0 low 20.0 · medium 28.8 · high 43.0 · xhigh 61.5 · max 70.6. FrontierCode 1.1 Main low 29.3 · medium 36.5 · high 49.4 · xhigh 52.1 [O] · max 46.2 [O] (drops at max).
- Haiku 5.5 per effort: browser-use [I] low 45.6 · medium 53.4 · high 64.3 · xhigh 69.5 · max 65.3; OSWorld 2.1 [A†] low 42.0 · medium 53.3, max 72.4 [O]. → the FAST_FLOOR: medium option.
- Opus 5.5: HLE with tools 67.7 [O, max] (Sonnet 64.5, Haiku 57.4 [O, e?]); GDPval-AA v2.1 1846 [O, max] vs Sonnet 1844 / 1840 [O, e?, two Anthropic tables disagree] vs Haiku 1620 [O, e?]; FrontierCode 54.6 at medium [O, text] ≈ 54.4 at max [O, table]; CursorBench 4.0 52.5 at medium [O, text] → 57.8 at max [O]; Terminal-Bench 4.0 66.4 [O, xhigh]; Deloitte known bugs caught 72% at low [P].
- Computer use: OSWorld 2.1 Opus 81.8 [O, max], Sonnet 80.1 / 83.9 [O, e?, conflicting tables], Haiku 72.4 [O] → browser-heavy gate seats at standard.
- Prices per 1M tokens [official]: Opus 5.5 $4 in / $20 out (cache read $0.20); Sonnet 5.5 $2 / $10 ($0.10); Haiku 5.5 $0.10 / $0.50 ($0.01; $0.50 / $2.50 above 100k-token prompts).
- Rough campaign estimate (40-task campaign, assumption-laden): ≈ $150 with these settings, ≈ $330 all-top-at-max, ≈ $85 all-standard-at-high (breaks every top pin); binding standard to inherit adds ≈ $12.

## 4. File-by-file change map

New:
1. **`docs/prd/2026-10-24-seat-settings-routing-v2-prd.md`** — this file.

Modified:
2. **`references/model-routing.md`** — intro lists the new sections; tiers table "Who runs at it"
   cells (Rule cells byte-identical) + a §Seat settings pointer line; the binding paragraph replaced
   by the default-alias + floor table, the never-inherit rule, override rules and the floors paragraph
   (D2); new §Seat settings (D1) and §Main-session settings (D4); harness-gate step 2 rewritten for
   the two effort mechanisms (D3); new §Settings that defeat routing (D5); boot probe steps 1–5 + the
   Routing field list (D5); variant-file dispatch sentence + probe-step number; §Dispatch binding
   architect/orchestrator/autopilot bullets (D8, D9) and the ladder bullet (D6).
3. **`references/tollgate.md`** — row 18's Probe and Fix-hint cells (still 6 cells); report item 4
   Routing field list (D5).
4. **`references/task-contract.md`** — §1 Effort-row sentence, §3 parenthesis, §6 defaults line
   (D10). Nothing else.
5. **`references/campaign-contract.md`** — field 16 row (D10).
6. **`orchestrator/SKILL.md`** — boot 5 (extended probe, Routing-section bindings/floors/ladder,
   warnings surfaced once, own seat row); build-loop step 3 knobs paragraph; executor-miss ladder
   becomes a citation + summary; "What you do NOT need" effort clause (D3, D6).
7. **`autopilot/SKILL.md`** — Routing paragraph (D8); boot 3 row-18 wording; boot 4 records own
   settings (D11).
8. **`architect/SKILL.md`** — Stage 2 reviewer-row sentence; Stage 3 `effort:` difficulty-only
   sentence; Hard rules seat-effort citation (D9).
9. **`idea-forge/SKILL.md`** — Hard guardrail seat-effort citation; Step 4 fresh-session settings
   clause + the architect's `SESSION SETTINGS:` line as the emitted block's first line (D4).
10. **`resource-extractor/SKILL.md`** — "Strong model." guardrail citation.
11. **`gate-concierge/SKILL.md`** — §Two passes: seat settings differ by pass (D7).
12. **`guide/SKILL.md`** — Session-settings paragraph after Session discipline (D4); runsheet Step
    status records attested settings (D11); Before Step 2 surfaces Routing warnings (D5).
13–20. **`prompts/INVOKE_{GUIDE,RESOURCE_EXTRACTOR,IDEA_FORGE,ARCHITECT,ORCHESTRATOR,DEMO_STUDIO,GATE_CONCIERGE,AUTOPILOT}.md`**
    — Session-settings block + in-block `SESSION SETTINGS:` line (D4); ORCHESTRATOR ROUTING line +
    step-3 dispatch bullet; AUTOPILOT ROUTING line; ARCHITECT/IDEA_FORGE "Run it at its session
    settings (above)." notes.
21. **`README.md`** — "Spawns are also routed" sentence gains seat settings; `model-routing.md` tree
    line.

## 5. Invariants (reviewers check)

- **Plans stay portable.** The plan grammar (`task-contract.md` §1), the manifest equality set (§2),
  the plan-reviewer prompt (§4) and the parser regexes (§5) do not change. Effort floors are
  dispatch-time glue; never written into plans or manifests.
- **No model ids or version numbers in doctrine.** Aliases (`opus`, `sonnet`, `haiku`) appear only
  in runtime-binding text: `references/model-routing.md` (the binding table, §Main-session settings)
  and the user-facing Session-settings blocks of `prompts/INVOKE_*.md`. This PRD names model versions
  in §3 only.
- **The pin rule is unchanged** and identically worded in `model-routing.md` (tiers-table Rule cell),
  architect Stage 3, and `task-contract.md` §1/§4: every `human_gate: true`, security-sensitive, or
  `effort: xhigh|max` task is `top`, never downgraded by anything.
- **`ultracode` stays main-session-only** — never a seat-table, per-task or per-spawn value.
- **Degraded, never blocking.** A missing per-spawn effort parameter, a set env var, a model mismatch
  on a dispatched subagent → warn/log, continue. (An interactive `top` main session below the
  campaign's `top` binding warns and waits for the user's go — the user decides; it is not a hard
  stop.)
- **Single source of truth for seat values:** §Seat settings. Every other file cites it; only the
  eight `prompts/INVOKE_*.md` Session-settings lines and the architect kickoff block idea-forge emits
  repeat values, and they match the table.
- **Tollgate matrix shape:** 18 data rows × 6 columns; row 18 extended, no row added.
- **Probes** stay read-only and runnable in Windows PowerShell 5.1 and POSIX shells (both forms
  shown); never probe by matching a Claude Code version number — probe the capability.
- **No `SKILL.md` frontmatter `model:`/`effort:` keys** (skill-frontmatter `model` is turn-scoped, so
  dialogue seats would flip back mid-conversation; committed knobs in skills violate "overrides live
  in dispatch-time glue only"). The five `references/agents/executor-*.md` files stay
  byte-identical.
- **July §8 invariants still apply.** Its "guide-mode/no-routing campaigns are untouched" clause
  holds for `routing: inherit` (byte-compatible dispatch). Under active routing, D2 deliberately
  supersedes its "(defaults: standard/inherit)" binding: an absent `Model tier:` line still means
  `standard`, but `standard` now binds `sonnet` (probe-verified), not inherit.
- **Out of scope — not edited:** `references/vendor/**`, `IDEA_FORGE_TEST.md`, existing files in
  `docs/prd/`, `references/faucets/**`, `references/demo-stack.md`, `references/music-kit.md`,
  `references/readme-schemas.md`, `references/demo-script-schema.md`, `references/conventions.md`,
  `references/roles.md`, `references/pipeline-fallback.md`, `executor/SKILL.md`,
  `mastermind/SKILL.md`, `demo-studio/SKILL.md`, `references/agents/**`.

## 6. Acceptance (mechanical where possible)

1. **Stale claims gone:** `git grep -n -E "call-time|standard.? to inherit" -- . ":(exclude)docs/prd"`
   → no hits.
2. **New sections exist once:** `^## (Seat settings|Main-session settings)` in `model-routing.md` → 2
   hits; `^### Settings that defeat routing` → 1.
3. **Citations resolve:** every "Seat settings" hit outside `model-routing.md` and `docs/prd/` points
   at `model-routing.md` with the right relative path for its folder (kickoff code blocks use the
   kit-root-relative `references/` form, as their existing paths do).
4. **Kickoff coverage:** `SESSION SETTINGS:` ≥1 in each of the 8 INVOKE files and in
   `idea-forge/SKILL.md`; "Session settings" ≥1 in each INVOKE file.
5. **Values match the table** for every INVOKE file (block + in-block line); idea-forge's architect
   line byte-identical to `INVOKE_ARCHITECT.md`'s.
6. **No model ids/versions in doctrine** (grep for `claude-(opus|sonnet|haiku|fable)` and
   `<alias> <digit>` outside `docs/prd`, `IDEA_FORGE_TEST.md`, `references/vendor`) → no hits.
7. **Aliases only in runtime-binding text** (`-w` grep for the four alias words) → hits only in
   `model-routing.md` (binding table, §Main-session settings) and the INVOKE Session-settings blocks.
8. **Untouched files:** `git diff --stat origin/main --` the out-of-scope paths → empty; no
   pre-existing `docs/prd/` file changed.
9. **Grammar untouched:** the `task-contract.md` diff shows only the §1 Effort-row sentence, the §3
   parenthesis and the §6 defaults line.
10. **Tollgate shape:** 18 data rows, each with exactly 7 unescaped `|`.
11. **No skill-frontmatter knobs:** `^(model|effort):` in `*/SKILL.md` → no hits.
12. **`ultracode`:** only the pre-existing main-session-only mentions.
13. **Pin rule unchanged:** the pin-rule sentences in `model-routing.md`, architect Stage 3 and
    `task-contract.md` §1/§4 byte-identical to `origin/main`.
14. **Ladder consistency:** full ladder only in `model-routing.md`; `orchestrator/SKILL.md` cites it
    with a matching `tier-first` summary; no `tier-first|effort-first` contradiction.
15. **Configuration applied:** floor column, chore row and ladder text match the five values; this
    header records them.
16. **Degraded, never blocking:** no new blocking language in `model-routing.md` / `tollgate.md`.
17. **Seat table completeness:** rows for guide, resource-extractor, idea-forge, architect (both),
    reviewer fan-out, gate-concierge preflight and closing, orchestrator, executor task, demo-studio,
    independent review, autopilot Step-3 dispatch, autopilot, mastermind one-shot, manager mode,
    probes, chores.

## 7. Deferred (do not build)

- **Skill-frontmatter `model:`/`effort:`** — the model is turn-scoped (dialogue seats flip back at
  the next prompt) and it commits Claude Code knobs into doctrine.
- **Extra variant files for step seats** — unneeded with per-spawn effort; `variants-only` builds
  degrade those spawns to inherit, logged.
- **`fast` for typical feature tasks** — needs an executor replay study first.
- **Removing the executor variant files** — they still carry the executor tool set and work in every
  build.
- **Codex / other-harness adapters** — the harness gate keeps them safe at `routing: inherit`.

## 8. Post-review corrections (three-lens review, 2026-10-25 — recorded, implementation is canonical)

Three parallel reviewers at the reviewer seat (`standard` binding, effort `high`) — PRD coverage,
consistency + mechanics, grammar + parse drift. Each finding was verified against the text before
fixing. No parser break was found; the grammar, §2 equality set, §4 reviewer and §5 regexes were
confirmed untouched and consistent. Confirmed and fixed:

1. **`effort-first` was recorded but undefined** (all three lenses) — the ladder now says a Routing
   section recording `effort-first` runs `standard` tasks like `fast`/`top`; the orchestrator
   summary names it. Kept as a value (Block P specifies the field), not dropped.
2. **Probe effort vs floors** (all three) — the row-17/18 probe subagents are floor-exempt at `low`
   (floors paragraph + seat row).
3. **Floor/pin resolution order + legacy values** (grammar) — resolve the tier first (`Model tier:`
   line, absent = `standard`, pin rule applied), read legacy `none`/`minimal` as `low`, then raise
   to the floor; same in orchestrator build-loop step 3, so the agent type is always one of the five
   variants.
4. **Reviewer fan-out binding was ungated** (coverage + grammar) **and assumed nested spawn**
   (consistency) — architect Stage 2 and the model-routing architect bullet: per-spawn effort only
   where the Routing section shows `per-spawn`; inherit under `routing: inherit`; a dispatched
   architect that cannot spawn runs the review inline.
5. **Per-tier alias override not expressible** (coverage + consistency) — both ROUTING lines gain
   `per-tier override, e.g. top=<alias>, standard=<alias>`, matching D2 and field 16.
6. **Autopilot's non-step spawns unbound** (coverage + consistency) — its Routing paragraph names the
   independent frame/audio review and probes alongside step seats.
7. **"No dispatcher ever binds a seat below it"** vs field-16 pins and degraded inherit (coverage +
   grammar) — kept, with both exceptions named.
8. **Never-blocking vs the main-session warn-and-wait** (consistency) — the Degraded bullet names the
   one pause as the user's decision, not a routing stop; before a Routing section exists the
   comparison point is the default `top` alias.
9. **The preflight pass can execute a `human_gate: true` manifest task** (consistency — the
   architect may flag wallet / faucet / account / secret gates, which preflight runs) — D7 extended by
   the pin rule: preflight is `standard`, `top` if it will execute any `human_gate: true` task (seat
   row, gate-concierge §Two passes, `INVOKE_GATE_CONCIERGE.md` block + in-block line), mirroring the
   autopilot Step-3 row.
10. **`CLAUDE_CODE_EFFORT_LEVEL` vs the external-pool kernel's `--effort`** (consistency) — a scoping
    note in §Settings that defeat routing (the kernel sets or clears it per spawn).
11. **Floors' external-pool scope** (grammar) — the `task-contract.md` §6 defaults line keeps its
    wording and adds the scope: in-session Claude Code dispatch; the kernel's per-CLI flag carries
    the manifest value ("Flag is authoritative").
12. **"Only the INVOKE lines repeat seat values" was incomplete** (consistency) — the seat-table
    intro also names the architect block idea-forge emits.

Declined:
- *"apply to every session in the folder" is unverified* (coverage) — user-specified §Main-session
  text; accurate for project settings, and the instruction it supports (never set seat effort
  through settings) holds either way.
