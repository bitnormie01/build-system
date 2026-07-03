# Invoke Resource Extractor — copy-paste kickoff prompt

Paste this into a Claude Code session (your strong reasoning seat, with the Chrome browser tools
available) to gather a hackathon's full documentation ecosystem into a committed **resource pack**
before ideating. This is **Step 0a** — it runs before `prompts/INVOKE_IDEA_FORGE.md`, and its output is
idea-forge's primary source.

## Where it sits in the pipeline

```
Step 0a — resource-extractor: commits docs/resources/<event>/ (rules, tracks, sponsor SDKs, prior art).
Step 0  — idea-forge: reads that pack → one scoped brief. → architect → orchestrator (build).
```

---

```
You are running RESOURCE EXTRACTOR (Step 0a). Load and follow resource-extractor/SKILL.md.
Gather this hackathon's inter-related docs into a committed resource pack under
docs/resources/<YYYY-MM-DD>-<event-slug>/, then hand off to idea-forge. Do not pick an idea or plan a
build — stop at the committed pack.

HACKATHON: [name + primary URL(s): rules/handbook, tracks page]

TARGET SPONSORS/TRACKS (optional): [the sponsors whose SDK docs matter most, or "all major tracks"]

Extract, following inter-related links (rules → tracks → each sponsor → its SDK docs/examples → prior
winners), bounded to the event's ecosystem:
- event.md — deadline (absolute + tz), eligibility, submission format, PUBLISHED judging criteria WITH
  exact weights (verbatim), prize structure, testnet-vs-mainnet rules.
- tracks.md — every track/bounty: sponsor, problem statement, prize, minimum bar to qualify, required tech.
- sponsors/<slug>.md — per sponsor: what they reward, SDK/protocol, doc links, TESTNET package/contract
  addresses + entry-point signatures + integration model + code examples + gotchas (the architect's
  feasibility fuel).
- prior-art.md — past winners / showcases / shipped competitors: name, one-line, tech, link.
- INDEX.md — provenance for every source (URL, fetch date, tool used, primary/secondary, confidence/gaps).

Use WebFetch for static pages; use the Chrome browser tools (claude-in-chrome) for JS-heavy/SPA sources
(Dorahacks, Devfolio, ETHGlobal, Notion/GitBook handbooks, Docusaurus SDK docs) — navigate, let it
render, get_page_text/read_page, find+click to expand tabs/accordions/"load more", read_network_requests
to capture API-loaded JSON. Extraction only: never log in as me, submit a form, register, or move funds;
label anything gated or unloadable as a gap; quote numbers/criteria verbatim with source URLs; invent
nothing. Commit and push the pack, then tell me it's ready for idea-forge.
```

---

## Notes on using it

- **Accuracy is the whole point.** Every judging weight, prize, deadline, and package address is quoted
  verbatim with its source URL and fetch date. A labeled "unknown" beats a confident wrong fact — the
  whole pipeline trusts this pack.
- **Chrome for the JS-heavy sources.** Hackathon portals and many sponsor doc sites render client-side;
  a plain fetch returns an empty shell. The skill drives `claude-in-chrome` to render, reveal
  (tabs/accordions/scroll), and capture network JSON. Load those tools via `ToolSearch` if deferred.
- **Read-only.** It never authenticates as you, registers, submits, accepts terms, or touches funds.
  Gated resources are flagged, not forced.
- **Feeds idea-forge directly.** Once committed, point idea-forge at `docs/resources/<event>/` — its
  Step-1 inputs (URL, tracks, judging criteria, prior art) are now pre-extracted, so it forges on real
  resources instead of a single search pass.
