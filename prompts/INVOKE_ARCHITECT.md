# Invoke Architect — copy-paste kickoff prompt

Paste this into a fresh session of your strongest reasoning agent (the kit's `top` tier,
references/model-routing.md — the "mastermind"
seat, never a cheap executor) to start a build. Fill the four bracketed fields and delete the rest.

**Session settings — set these before you paste** (values: `references/model-routing.md`
§Seat settings): tier `top` → Claude Code default alias `opus` · effort `xhigh` (`high` for a
one-task plan-bug fix).
- **Claude Code Desktop:** model picker in the row under the prompt box → `opus`; **Effort** in
  the same picker → `xhigh` (shown as Extra) — or type `/model opus`, then `/effort xhigh`, as your
  first two messages.
- **Claude Code CLI:** `claude --model opus --effort xhigh` (or `/model opus` + `/effort xhigh`).
- Set both explicitly in every new session — a fresh session otherwise starts at its model's
  default.
- A campaign that overrides the binding records it in the tollgate report's Routing section — use
  that alias instead.

---

```
SESSION SETTINGS: tier top · effort xhigh, or high for a one-task plan-bug fix
(references/model-routing.md §Seat settings). Start by stating the exact model id you are running
as. If it is below this campaign's top-tier binding, warn me and wait for my go before anything
else. (In an autopilot dispatch, just state it — the autopilot logs drift.)

You are the ARCHITECT for this build. Load and follow architect/SKILL.md (and its references/).
Do not write product code. Your only deliverables are: an approved spec, executor-ready plan
documents, docs/superpowers/manifest.json, for a hackathon build the pre-filled
docs/gates/submission-draft.md (build-time facts marked TBD-post-build), and — on a campaign build
— the Stack requirements section appended to the tollgate report (references/tollgate.md).

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
give exactly one gate command per task. Hand off at the reviewed plan + manifest (the default —
omit the manifest only when the build has no deploy/key/fund tasks) and the
orchestrator builds it. (For an external multi-account pool instead, stop at the manifest for a
separate kernel.)

Start with Stage 1 (Ingest): read every doc above, then confirm the target/runtime/deadline back to
me before asking your first brainstorming question.
```

---

## Notes on using it

- **Run it at its session settings (above).** Plan quality is model-bound; a weak architect
  produces vague tasks that drift the whole executor pool. This is the one place you spend your
  best reasoning seat.
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
