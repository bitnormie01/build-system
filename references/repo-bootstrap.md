# Repo Bootstrap — which repo is "the repo", and who creates it

Every role in this kit obeys "the repo is the single source of truth" (`conventions.md`). This file
defines **which repo that is**, how a pipeline step resolves it at boot, and how the first step that
needs it **creates it** when the user didn't provide one. All pipeline steps and user-side seats
follow this protocol.

## Two repos, never confused

- **The kit checkout** — the clone of the `build-system` repo (these skills + references). It is
  **doctrine, read-only**: every session loads its SKILL.md and references from here, and **never
  commits a project artifact to it**. A narrow exception exists for the **kit's reference
  libraries** — cross-campaign shared knowledge that grows one commit at a time: `faucets/` (the
  gate-concierge's faucet write-back), `demo-stack.md` (demo-studio's re-verified tool pins), and
  `music-kit.md` (cleared-track entries). A session may commit **public facts only** back to these
  (a working faucet, a re-verified version, a cleared track), never a campaign's addresses, keys, or
  private data. Everything else is read-only. Treating the kit checkout as the project repo is the
  one historical mistake this file exists to end.
- **The project repo** — the canonical repo for THIS build. Every artifact the pipeline produces
  lives here: `docs/resources/<event>/` (the pack), `docs/idea-forge/*-brief.md`,
  `docs/superpowers/{specs,plans}` + `manifest.json`, `docs/guide/*-runsheet.md`,
  `docs/gates/*-gate-ledger.md` + `submission-draft.md`, `docs/tollgate/*-tollgate.md` (the
  requirements report), `docs/autopilot/*-campaign-contract.md`, `docs/demo/*-demo-script.md` +
  the `demo/` Remotion project, the installed `.claude/agents/` executor variants, and all
  product code. When any skill says "sync the canonical
  repo", "commit and push", or "the repo is the single source of truth", **it means this repo.**

## Resolution order (every step, at boot, before any work)

1. **The kickoff's `REPO:` field.** Every `prompts/INVOKE_*.md` carries one. If it names a repo
   (URL or `owner/name`), clone/sync it and work there. The guide fills this into every kickoff it
   prepares, so downstream steps normally never fall through this rule.
2. **The working directory's git remote**, if it already is a project repo. Check
   `git remote get-url origin` — if it points at the `build-system` repo, that is the **kit
   checkout, not the project repo**; keep resolving.
3. **Nothing found → create it** (protocol below). The first **seat** that needs to commit an
   artifact and finds no project repo creates one — autonomously, without waiting for the user to
   hand over a URL. Usually that is the `guide` at campaign start (event-named, to house the
   runsheet), the `autopilot` at its boot on a hands-off campaign (it commits the campaign
   contract first — `campaign-contract.md`), or Step 0a; otherwise whichever pipeline step commits
   first. Report what was created
   (owner/name/visibility) in the same breath.

## Creation protocol

Run these checks and commands with the user's logged-in GitHub CLI:

1. **Verify auth:** `gh auth status` must show a logged-in account. If it doesn't, this is a real
   blocker — stop and ask the user to run `gh auth login`; never ask for or handle a token yourself.
2. **Create private, clone locally:** `--clone` clones into `./<name>` under the **current
   directory**, so first `cd` out of the kit checkout — to its parent or any workspace directory —
   then run
   `gh repo create <name> --private --description "<description>" --clone`
   and `cd <name>`; that clone is where all subsequent work happens. Never create the clone nested
   inside the kit checkout. Private is the default during a
   hackathon — the idea is competitive information. Flipping to **public** happens at submission
   time and is a consent-gated action (`gate-concierge/SKILL.md`), because most events require a
   public repo only at judging.
3. **Initialize:** if the clone is empty, commit a minimal `README.md` (project/event one-liner +
   "built with the build-system pipeline") so the canonical branch exists for every later step to
   sync against. The stub is temporary — the plan's README task later replaces it with one of the
   locked schemas (`readme-schemas.md`).
4. **Announce, don't ask.** Creating a private repo under the user's own account is reversible and
   harmless — do it, then state plainly: "Created `<owner>/<name>` (private) as the project repo;
   all pipeline artifacts commit there." What you never do autonomously is delete a repo, transfer
   it, or flip it public.

## Naming and description — by whichever step runs first

The repo is named from the best information that exists at creation time, then **upgraded once the
project is chosen**:

| First seat to need the repo | Name | Description |
|---|---|---|
| **guide** (campaign start, runsheet) or **Step 0a** (resource-extractor) — no project chosen yet | `<event-slug>-<YYYY>` (e.g. `ethglobal-cannes-2026`) | "Hackathon workspace for <event> — resource pack, brief, spec/plans, build. (build-system pipeline)" |
| **Step 0** (idea-forge) — repo needed only when the winning brief is committed | `<project-slug>` from the brief's solution line | the brief's one-line **Solution** |
| **Step 1** (architect) — user already has the idea | `<project-slug>` from the confirmed `PROJECT:` line | the `PROJECT:` one-liner |

**The rename step.** When the repo was created event-named, the moment the project gets a name the
repo is upgraded to match — by **idea-forge Step 4** (right after pushing the winning brief) in the
normal flow, or by the **architect at Stage 1** (once `PROJECT:` is confirmed) when Step 0 was
skipped. Whichever seat fixes the project name runs:

```
gh repo rename <project-slug> -R <owner>/<event-slug>-<YYYY> --yes
gh repo edit <owner>/<project-slug> --description "<the brief's one-line solution>"
git remote set-url origin <new URL>
```

GitHub redirects the old name, but update the local remote anyway — and record the rename in the
guide's runsheet so every later kickoff carries the new `REPO:` value. If the user explicitly
provided the repo (resolution rule 1), **never rename it** — upgrade only repos this pipeline
created.

## Hard rules

- **The kit checkout is never the project repo.** No resource pack, brief, spec, plan, manifest,
  runsheet, ledger, or product code is ever committed to `build-system`. If you find yourself about
  to `git push` an artifact and `origin` is the build-system repo, you are in the wrong directory —
  resolve the project repo first. The only sanctioned kit-side writes are **public-facts-only entries
  in the kit's reference libraries** — `references/faucets/` (faucet playbooks),
  `references/demo-stack.md` (re-verified tool pins), and `references/music-kit.md` (cleared-track
  entries) — never secrets or campaign-private data. Any other artifact committed to `build-system`
  is the wrong-directory mistake above.
- **One project repo per campaign.** The guide records it in the runsheet; every kickoff it
  prepares carries it in `REPO:`. Two steps silently working in two different repos breaks the
  single-source-of-truth rule at the root.
- **Create is autonomous; destroy/expose is not.** `gh repo create` (private) needs no permission.
  The `--visibility public` flip is consent-gated, always — an interactive per-gate go, or a locked
  campaign contract's repo-public pre-consent, identity-verified (`campaign-contract.md`).
  `gh repo delete` and transfers sit on the **never-consentable floor** — no consent form
  authorizes them (`campaign-contract.md` §Never-consentable floor).
- **No secrets in the repo, whoever created it** — same rule as everywhere (`conventions.md`
  §Safety).
