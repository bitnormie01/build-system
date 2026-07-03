# Vendored superpowers skills

Pinned snapshot of the two superpowers skills the **architect** depends on, so the build-system is
self-contained on machines where superpowers is not installed. MIT © 2025 Jesse Vincent — full
license in `LICENSE`.

| Field | Value |
|---|---|
| Upstream | https://github.com/obra/superpowers |
| Commit | `6fd4507659784c351abbd2bc264c7162cfd386dc` (2026-05-29) |
| Vendored | `brainstorming/{SKILL.md, spec-document-reviewer-prompt.md}`, `writing-plans/{SKILL.md, plan-document-reviewer-prompt.md}` |
| Omitted | `brainstorming/visual-companion.md` + `scripts/` (a browser-UI companion — the architect runs CLI/headless-friendly sessions and doesn't need it) |

## Precedence (what the architect actually uses)

1. **Installed superpowers skills** — when the session has them, invoke them; they're the
   maintained source.
2. **These vendored copies** — when superpowers is NOT installed, follow the vendored `SKILL.md`s
   verbatim as documents. Same method, pinned version.
3. `../pipeline-fallback.md` — a condensed checklist of the same flow; now a summary/reference,
   not the primary fallback.

## Contract overrides (two vendored tails the architect must NOT follow verbatim)

The vendored bodies are kept unedited so they stay a faithful pinned snapshot. But two tails assume
*same-session* execution and are **superseded by `../task-contract.md` and `../../architect/SKILL.md`** —
following them verbatim would break the multi-agent pipeline:

- **`writing-plans` §Execution Handoff** ("offer subagent-driven / inline execution … Which
  approach?") — do **not** use its raw menu. Execution is governed by architect Stage 4:
  Claude-Code-native (the `orchestrator` builds it in-session via subagents) or external-pool (stop at
  the reviewed, pushed manifest for a separate kernel).
- **`writing-plans` plan header** (`REQUIRED SUB-SKILL: superpowers:subagent-driven-development`) —
  do **not** emit it. That line rides into the plan document and reaches stateless executors that
  have no superpowers skills. Use the plan header in `../task-contract.md` §1.
- **`brainstorming` terminal "invoke writing-plans" step** — the architect sequences the stages
  itself; follow brainstorming's dialogue/method, not its skill-to-skill hand-off.

These are behavioral overrides only; the divergence/design method in the vendored bodies is followed
as written.

## Refreshing

```bash
git clone --depth 1 https://github.com/obra/superpowers.git /tmp/superpowers
cp /tmp/superpowers/skills/brainstorming/{SKILL.md,spec-document-reviewer-prompt.md} brainstorming/
cp /tmp/superpowers/skills/writing-plans/{SKILL.md,plan-document-reviewer-prompt.md} writing-plans/
cp /tmp/superpowers/LICENSE LICENSE
```

Then update the commit hash above and **re-check the diff against our contract**: our
`task-contract.md` §1 extends writing-plans' output (Provides/Requires/Effort/exhaustive Files/one
gate per task) — if upstream's plan grammar changes shape, the architect's Stage 3 enforcement and
the kernel's §5 parser must be reconciled before the refresh lands.
