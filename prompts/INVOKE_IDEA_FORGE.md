# Invoke Idea Forge — copy-paste kickoff prompt

Paste this into a fresh session to go from a blank start to **one** scoped, shippable hackathon brief
that the architect can build. Fill the five bracketed fields; the skill will ask for any you leave
blank. This is **Step 0** — it runs before `prompts/INVOKE_ARCHITECT.md`, and its output *is* the
architect's input.

## Running the pipeline

```
Step 0 — idea-forge: run in its own session. It commits a brief to docs/idea-forge/ and emits an
         architect kickoff block.
Step 1 — architect: open a NEW session, paste that block. Plans from the brief; emits the manifest.
Then  — kernel: builds from the manifest (separate program).
The brief file is the baton between Step 0 and Step 1 — never run them in one session.
```

---

```
You are running IDEA FORGE (Step 0). Load and follow idea-forge/SKILL.md (and its references/).
Take me from a blank start to ONE scoped, shippable hackathon project, then hand it to the architect.
Do not write product code or a spec — stop at the brief plus the architect kickoff block.

HACKATHON: [name + URL of the rules / judging page]

TRACKS: [up to 3 sponsor / prize tracks to target, or "open"]

TEAM / BUILD CAPACITY: [autonomous multi-agent pool — architect → executor pool → reviewer — plus me;
builds far faster than a solo human. No deadline needed: idea-forge does not gate on hours.]

MY SKILLS: [e.g. Solidity/DeFi, TypeScript/React, Python/ML]

RISK APPETITE: [safe-feasible | novel-wow]

PRIOR ART (optional): [existing / past projects in this space — prior winners, shipped projects,
sponsor showcases, competitor links; leave blank if none]

Run it straight: diverge to ≥20 varied candidates and run the bolder-pass; converge on the external
weighted rubric (intrinsic buildability highest), NOT on my preference; end in exactly one brief with all
required fields, emitted in the architect's PROJECT / DOCS / CONSTRAINTS format. Ask me the five
inputs above one at a time if any are blank, before generating anything.
```

---

## Notes on using it

- **Run it on your top model.** The rubric mapping and buildability calls are model-bound; a weak model
  mis-weights the rubric and still hands you a confident-looking brief. Spend your best reasoning seat
  (Opus / Claude) here, never a cheap executor.
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
