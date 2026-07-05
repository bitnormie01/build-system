# Invoke Architect — copy-paste kickoff prompt

Paste this into a fresh session of your strongest reasoning agent (Opus/Claude — the "mastermind"
seat, never a cheap executor) to start a build. Fill the five bracketed fields and delete the rest.

---

```
You are the ARCHITECT for this build. Load and follow architect/SKILL.md (and its references/).
Do not write product code. Your only deliverables are: an approved spec, executor-ready plan
documents, and docs/superpowers/manifest.json.

PROJECT: [one-line description of what I'm building]

REPO: [the project repo owner/name — sync it and commit everything there. Or "none yet": create it
via my logged-in gh from the PROJECT slug (private, PROJECT line as description), per
references/repo-bootstrap.md. Never the build-system checkout.]

DOCS: [path(s) — the resource pack docs/resources/<event>/ and the idea-forge brief if you have them,
plus any spec / API docs / hackathon rules / existing repo. "none" if fresh]

CONSTRAINTS: [target platform/chain, language/runtime + versions, hard deadline, anything
non-negotiable]

EXECUTION TARGET: built in Claude Code by the orchestrator — the main session dispatches a fresh
subagent per task (orchestrator/SKILL.md). Every task must be self-contained per
references/task-contract.md — paste upstream signatures into each task, declare Provides/Requires, and
give exactly one gate command per task. Hand off at the reviewed plan (+ optional manifest) and the
orchestrator builds it. (For an external multi-account pool instead, stop at the manifest for a
separate kernel.)

Start with Stage 1 (Ingest): read every doc above, then confirm the target/runtime/deadline back to
me before asking your first brainstorming question.
```

---

## Notes on using it

- **Run it on your top model.** Plan quality is model-bound; a weak architect produces vague tasks
  that drift the whole executor pool. This is the one place you spend your best reasoning seat.
- **One question at a time is expected.** The brainstorming stage is a dialogue. Answer its
  questions; it will not start planning until you approve the design.
- **Big project? Expect 3–5 plan files.** If your idea spans contracts + worker + frontend +
  deploy, the architect will split it into sub-projects, each with its own spec→plan cycle. That's
  correct, not over-engineering.
- **The handoff is a file, not a chat.** When it finishes, you'll have `manifest.json`. That's what
  your mastermind/kernel loads to distribute work — the artifact that replaces your copy-paste.

## Mini example (filled)

```
PROJECT: A Four.meme bonding-curve trading agent that scores graduation likelihood and executes on
PancakeSwap V3.

REPO: none yet — create it via my logged-in gh (private, named from the PROJECT slug)

DOCS: ./docs/curvesniper-brief.md, ./docs/four-meme-contracts.md

CONSTRAINTS: BSC mainnet (chain 56), TypeScript strict + ESM, Node ≥20, viem ^2.21.0 only (no
Bitquery), hard deadline 2026-04-22.

EXECUTION TARGET: built in Claude Code by the orchestrator. (as above)
```
