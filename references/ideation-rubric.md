# Ideation Rubric — the external decider for Step 0

This is the scoring rubric `idea-forge` converges on. It exists so the choice of *one* idea is made on
**external, event-tied criteria** — never on the model's own taste, which systematically over-rates
novelty. Read it as: a buildability knockout, then a weighted score, then a blocker pressure-test,
then commit.

## Why buildability is weighted highest

The research finding this rubric encodes is the **Ideation–Execution Gap**: an LLM's apparent novelty
advantage erodes once an idea is actually *built*. Brilliant-on-paper ideas lose their edge in the
demo; demoable ideas keep theirs. In a demo-judged hackathon, **a demoable idea beats an un-demoable
brilliant one every time** — judging verifies a real working deploy, and hollow builds are rejected.
So intrinsic buildability is both a hard gate and the heaviest weight. **Buildability here means *no
external blocker the builder can't control*** (missing data, third-party approval, a service you can't
run, a human in the loop, a money shot riding on live external markets) — **not how many human-hours an
idea would take.** The build is done by an autonomous multi-agent pool that works far faster than a solo
human; speed is not the constraint, external blockers are. This is a deliberate correction, not a hedge.

## Step A — Buildability gate (knockout, before any scoring)

Drop — do not score — any candidate that fails this question:

> Can the build (this builder + an autonomous agent pool, with the stated skill set) reach a **real,
> on-chain working demo** of the money shot, with **no external blocker it doesn't control**?

A candidate is OUT if reaching the demo depends on any of:

- an external approval, allowlist, KYC, or sponsor API key the builder can't obtain;
- data the builder doesn't have and can't synthesize;
- training or fine-tuning a model the builder can't train;
- a centralized service, oracle, indexer, or deploy the builder can't run or perform;
- a human-in-the-loop step that can't be faked or pre-recorded for the demo;
- a money shot that depends on **live external markets / conditions** the builder can't control.

The gate is about **external blockers, not human-hours.** An ambitious idea with no blocker passes —
sheer build effort is the agent pool's problem, not a reason to drop an idea. "It's a lot to build" is
not a knockout; "it can't be demoed without something I don't control" is. Calendar fit is the
builder's call later, outside this rubric.

## Step B — Weighted score (survivors only)

Score each surviving candidate 1–5 on each axis, multiply by the weight, sum. Highest total wins.

| Axis | Weight | 1 (poor) | 5 (excellent) |
|------|:------:|----------|---------------|
| **Intrinsic buildability / demoability** (real on-chain demo, no external blocker) | **35** | depends on data / approvals / services / live markets the builder can't control — not demoable | clear path to a real working demo, no external blocker, the agent pool can carry the build |
| **Demo WOW + story** | **25** | a config screen; nothing to point at | a ~15-second moment a tired judge remembers |
| **Theme + sponsor-track fit** | **20** | tangential to the event's stated criteria | squarely hits the theme + a named target track |
| **Novelty** | **20** | seen it in ten other submissions | a genuinely fresh angle or mechanism |

**Adapt the weights to the event's *published* judging criteria.** If the event weights "impact" or
"technical depth" explicitly, re-map the four axes to mirror its rubric. One rule survives every
adaptation: **intrinsic buildability stays the highest single weight (floor 30).** The event tells you
what to optimize; the Ideation–Execution Gap tells you not to bet the demo on an idea that can't be
built to a working demo — because of a blocker, not because it's a lot of work.

`safe-feasible` vs `novel-wow` (Step 1) shifts points **between Novelty and buildability only** — at
most ±5 — and never lifts Novelty above buildability.

## Step C — Pressure-test the top 3 for hidden blockers

Before committing, interrogate the top three for the un-obvious dependencies that make a demo
*impossible* — not for how long they'd take:

- **Hidden external dependency** not visible in the one-liner — an oracle, indexer, subgraph, bridge,
  off-chain worker, or paid API tier the builder can't stand up or run.
- **Approvals / access** — does it need a key, allowlist, KYC, or partner sign-off the builder can't get?
- **Real-world needs** — does the money shot need real liquidity / real users / real funds / live
  market conditions, or can it run on a testnet / fixture / recording the builder controls?
- **Data / model** — does it need data the builder doesn't have, or a model they can't train?

Re-score on buildability if a blocker surfaces. A candidate that looked clean but really has an
uncontrollable external dependency falls here — that is the entire point of this step. Sheer amount of
work is *not* a reason to re-score down; the agent pool builds fast.

## Step D — Commit

Take the single highest total. **Ties break toward higher buildability.** Output one winner and stop
ranking — the table was the means, the brief is the end.

## Worked example (abbreviated)

Event: ETHGlobal-style, DeFi tracks, solo + AI building with an agent pool, Solidity/TS, `novel-wow`.
**Knocked out at Step A** (external blocker — never scored): a from-scratch on-chain options AMM (needs
a live oracle + real liquidity it can't stand up) and a **live perp funding-rate arb bot** (its money
shot rides on live external market conditions the builder can't control). What's left has no external
blocker, so it's scored:

| Candidate | Buildability ×35 | WOW ×25 | Fit ×20 | Novelty ×20 | Total |
|-----------|:-------:|:------:|:------:|:----------:|:-----:|
| Know-Your-Agent credential gate for a DeFi vault | 5 (175) | 4 (100) | 4 (80) | 5 (100) | **455** |
| Yet another yield dashboard | 5 (175) | 2 (50) | 3 (60) | 1 (20) | **305** |

The KYA-gated vault wins: **demoable *and* bold**, with no external blocker. The yield dashboard is just
as buildable but has nothing to point at (WOW 2). The two ideas that rode on uncontrollable external
conditions — the perp arb bot and the options AMM — **never made the table**: they were knocked out at
the gate, not scored low. Note buildability is now decoupled from hours — the KYA vault scores a clean
**5** (no blocker; the agent pool carries the build), where the old hour-priced rubric docked it to 4.
The rubric still picks the **demoable-bold** idea — the opposite of one that weights raw novelty highest.
