# Invoke Guide — copy-paste kickoff prompt

Paste this into a Claude Code session at the **start of a hackathon campaign** (or whenever you're
unsure where you are in the pipeline). The guide is your **mission control**: it plans how the
pipeline steps should run for your specific event, prepares each step's filled kickoff, verifies each
committed artifact, and stays open as your helpdesk between steps. **Keep this session open for the
whole hackathon** — every pipeline step runs in its own fresh session; you come back here in between.

## Where it sits

```
        ┌──────────────── guide (THIS session — stays open, advises, verifies) ─────────────────────────────┐
        │                                                                                                    │
Step 0a resource-extractor → Step 0 idea-forge → Step 1 architect → Step 2 orchestrator → Step 3 gate-concierge
        (fresh session)       (fresh session)     (fresh session)    (fresh session)       (fresh session)
```

All artifacts live in the **project repo** — created via your logged-in `gh` by the first step that
needs it when you don't provide one (`references/repo-bootstrap.md`); the build-system checkout is
doctrine only.

---

```
You are the GUIDE — my mission control for this build. Load and follow guide/SKILL.md. You prepare,
review, and unblock the pipeline's steps; you never perform them (no extracting, ideating, planning,
or product code in this session).

HACKATHON: [name + URL — or "not chosen yet" and help me pick]

PROJECT REPO: [owner/name if one exists — or "none yet": the first committing step creates it via my
logged-in gh, per references/repo-bootstrap.md; record it in the runsheet and every kickoff's REPO field]

MY GOAL: [win <track>, ship a portfolio piece, learn <stack> — what success means to me]

MY SKILLS: [e.g. Solidity/DeFi, TypeScript/React, Python/ML]

CALENDAR: [time I can give it + the event deadline if known]

STATUS: [fresh start | I already have an idea: <one-liner> | pipeline partially run — check the repo]

Start by resolving the project repo (references/repo-bootstrap.md — never the build-system checkout),
syncing it and detecting pipeline state from the committed artifacts, open/create the
runsheet under docs/guide/, then give me: (1) your strategy for this event — which steps to run or
skip, track shortlist (≤3) with reasons, risk-appetite recommendation with reasons, sponsor-depth list
for extraction; (2) the single next action with its filled kickoff prompt ready to paste. Between
steps I'll come back here — verify each artifact before green-lighting the next step, and when I'm
stuck, diagnose from the repo and give me the concrete fix.
```

---

## Notes on using it

- **One open seat, five fresh sessions.** The guide stays open; each pipeline step (0a extractor,
  0 idea-forge, 1 architect, 2 orchestrator, 3 gate-concierge) runs in its own fresh session from the
  kickoff the guide hands you. The baton between steps is always a committed, pushed artifact.
- **Step 3 shrinks your to-do list — in two passes.** The gate-concierge reports every human-gated
  task with the exact tools it would use, then runs only the ones you green-light, one consent at a
  time. Its **preflight pass** runs right after the architect commits plans (wallet, faucets, API
  keys land in parallel while the build runs); its **closing pass** runs after green (deploy,
  repo-flip, submission).
- **It recommends, you decide.** Track picks, risk appetite, review mode — the guide gives a
  recommendation with reasons; the choices stay yours.
- **It owns the calendar call.** idea-forge deliberately never reasons about your deadline; the guide
  is where "does this brief fit the time I have?" gets judged — after the brief, before the architect.
- **Stuck anywhere, come back here.** It diagnoses from the repo (missing push, gated source, failing
  gate, plan bug) and hands you the fix — including which session to reopen and what to paste.
- **The runsheet is the campaign log.** `docs/guide/<date>-<event>-runsheet.md` tracks decisions,
  step status, next action, and blockers — committed, so any future session can pick up mid-campaign.
