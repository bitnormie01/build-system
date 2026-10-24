# Invoke Idea Forge — copy-paste kickoff prompt

Paste this into a fresh session to go from a blank start to **one** scoped, shippable hackathon brief
that the architect can build. Fill the bracketed fields — the skill's five required inputs plus
REPO, with PRIOR ART optional; the skill will ask for any required one you leave
blank. This is **Step 0** — it runs before `prompts/INVOKE_ARCHITECT.md`, and its output *is* the
architect's input.

**Session settings — set these before you paste** (values: `references/model-routing.md`
§Seat settings): tier `top` → Claude Code default alias `opus` · effort `max`.
- **Claude Code Desktop:** model picker in the row under the prompt box → `opus`; **Effort** in
  the same picker → `max` — or type `/model opus`, then `/effort max`, as your
  first two messages.
- **Claude Code CLI:** `claude --model opus --effort max` (or `/model opus` + `/effort max`).
- Set both explicitly in every new session — a fresh session otherwise starts at its model's
  default. `max` applies to this session only.
- A campaign that overrides the binding records it in the tollgate report's Routing section — use
  that alias instead.

## Running the pipeline

```
Step 0a — resource-extractor (optional): extract the hackathon's docs into docs/resources/<event>/.
Step 0  — idea-forge: its own session. Reads the resource pack if present; commits a brief to
          docs/idea-forge/ and emits an architect kickoff block.
Step 1  — architect: open a NEW session, paste that block. Plans from the brief (+ resource pack);
          emits spec/plans/manifest.
Then   — orchestrator: builds it in Claude Code via subagents (or hand the manifest to an external kernel);
         demo-studio (2.5) records the demo video; gate-concierge (3) runs the gated tail + submission.
The brief file is the baton between Step 0 and Step 1 — never run them in one session.
```

---

```
SESSION SETTINGS: tier top · effort max (references/model-routing.md §Seat settings). Start by
stating the exact model id you are running as. If it is below this campaign's top-tier binding,
warn me and wait for my go before anything else. (In an autopilot dispatch, just state it — the
autopilot logs drift.)

You are running IDEA FORGE (Step 0). Load and follow idea-forge/SKILL.md (and its references/).
Take me from a blank start to ONE scoped, shippable hackathon project, then hand it to the architect.
Do not write product code or a spec — stop at the brief plus the architect kickoff block.

HACKATHON: [name + URL of the rules / judging page]

REPO: [the project repo owner/name (event-named if Step 0a created it) — or "none yet": create the
project repo via my logged-in gh when you commit the winning brief, per references/repo-bootstrap.md.
If it's event-named, rename it to the project slug + set its description after the brief lands.]

TRACKS: [up to 3 sponsor / prize tracks to target, or "open"]

TEAM / BUILD CAPACITY: [autonomous multi-agent pool — architect → executor pool → reviewer — plus me;
builds far faster than a solo human. No deadline needed: idea-forge does not gate on hours.]

MY SKILLS: [e.g. Solidity/DeFi, TypeScript/React, Python/ML]

RISK APPETITE: [safe-feasible | novel-wow]

PRIOR ART (optional): [existing / past projects in this space — prior winners, shipped projects,
sponsor showcases, competitor links; leave blank if none]

If a resource pack exists at docs/resources/<event>/ (from resource-extractor), sync the project repo
(REPO above) and read it FIRST — it pre-fills the hackathon URL, tracks, published judging criteria,
and prior art.
Run it straight: diverge to ≥20 varied candidates and run the bolder-pass; converge on the external
weighted rubric (intrinsic buildability highest), NOT on my preference; end in exactly one brief with all
required fields, emitted in the architect's PROJECT / DOCS / CONSTRAINTS format. Ask me the five
inputs above one at a time if any are blank, before generating anything.
```

---

## Notes on using it

- **Run it at its session settings (above).** The rubric mapping and buildability calls are
  model-bound; a weak model mis-weights the rubric and still hands you a confident-looking brief.
  Spend your best reasoning seat (the kit's `top` tier, references/model-routing.md) here, never a
  cheap executor.
- **It diverges before it converges.** Expect a wide candidate list (≥20) and a "make it bolder" pass
  first — that's the point, not noise. It then scores them down to one; the list is scaffolding, the
  brief is the deliverable.
- **The rubric decides, not your gut.** It will not end on "which do you like?" It converges on a
  weighted, event-tied rubric with intrinsic buildability weighted highest, because a demoable idea
  beats an un-demoable brilliant one (the Ideation–Execution Gap).
- **Intrinsic buildability is a wall.** Anything that can't reach a real working demo because it needs
  data / approvals / a service / live markets you don't control is dropped, no matter how cool. Build
  *speed* is not the constraint — the agent pool builds fast. If you want a bolder swing, set
  `novel-wow` — it nudges, but never past what's intrinsically buildable.
- **Calendar fit is YOUR call, not the skill's.** idea-forge optimizes for *winnable + demoable*, not
  *deadline-trimmed*: whether the chosen idea fits the hours you have is a judgment you make after the
  brief — the skill won't shrink an ambitious-but-buildable idea to fit a clock.
- **Prior art is optional — it sharpens Novelty *and* runs a judge's-eye head-to-head.** Paste existing
  / past projects and the skill uses them **at convergence** (never during divergence — that would
  anchor it and cut variety): first it finds the **white space** (the unoccupied angle, penalizing
  duplicates), then it checks, **from a judge's perspective on the event's real criteria**, that the
  chosen idea would **win the head-to-head** against the strongest existing projects — an evidence-bound
  edge on a real axis, and only among intrinsically-buildable candidates. **If the field's best idea
  would only tie, idea-forge will keep looking — it commits to a winning idea, not just a different
  one.** Leave it blank and the skill scores Novelty on first principles and skips both steps.
- **The handoff is a file + a block, not a chat.** You get one brief (saved under `docs/idea-forge/`)
  and a ready-to-paste architect kickoff block. Hand that straight to `prompts/INVOKE_ARCHITECT.md` /
  `architect/SKILL.md` — zero reformatting.

## Mini example (filled)

```
HACKATHON: ETHGlobal Cannes 2026 — https://ethglobal.com/events/cannes

TRACKS: 1inch (DeFi), Flow (consumer), open

TEAM / BUILD CAPACITY: autonomous multi-agent pool + me (builds faster than a solo human)

MY SKILLS: Solidity/DeFi, TypeScript/React

RISK APPETITE: novel-wow
```
