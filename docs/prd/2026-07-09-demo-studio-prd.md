# PRD — Demo Studio (autonomous hackathon demo-video recording, assembly, and upload)

- **Status:** approved by the user, **not yet built**. This document is the implementation contract.
- **Decided:** 2026-07-09, from a brainstorm session with the user, then a **35-agent live research
  pass** (7 areas, 28 design-critical claims independently cross-verified against primary sources
  on 2026-07-09) that corrected every stale training-data assumption. §13 is that verified
  dependency fact sheet — the design below is derived from it, not from model memory.
- **Target:** this build-system kit. **Implementer:** any future agent session; this file is
  written to be sufficient on its own.

## 0. How to use this PRD (implementing agent, read first)

1. Read this file end-to-end, then: `README.md`, `references/repo-bootstrap.md`,
   `references/conventions.md`, `references/roles.md`, `gate-concierge/SKILL.md`,
   `architect/SKILL.md` (Stage 4 — submission draft), `guide/SKILL.md`, and every
   `prompts/INVOKE_*.md`. Also read `docs/prd/2026-07-06-portfolio-mode-and-fleet-manager-prd.md`
   — if portfolio mode has been built by the time you implement this, §11's portfolio notes apply.
2. Follow the kit's working conventions: dense doctrinal markdown in the existing voice,
   `../references/<file>` relative paths from skill dirs, commit and push to `main` (no separate
   branch), commit message ends with the kit's standard `Co-Authored-By: Claude` trailer.
3. **Freshness rule (mandatory):** §13 was verified on **2026-07-09**. Before writing any code or
   doctrine, re-verify every §13 row tagged `[pin]` or `[policy]` against live sources and update
   the pins — the ecosystem below moves weekly (Remotion releases every 1–3 days; MetaMask ships
   multiple releases per week). A §13 row older than ~60 days is a hint, not a fact — the same
   staleness doctrine as `references/faucets/README.md`. Record what you re-verified (date +
   source) in the `references/demo-stack.md` file you will create (§8).
4. **Quality loop (mandatory):** after all edits, run the kit's multi-agent adversarial review
   (3–4 lenses: requirement coverage vs. this PRD; cross-file consistency; doctrine/safety
   contradictions; operational mechanics on Windows 11), each finding verified by an independent
   skeptic; fix every confirmed finding before the commit.
5. Scope discipline: build §3–§8. §11 is deferred — do not build it.

## 1. Problem and goals

Every hackathon submission needs a 2–5 minute demo video. Producing one manually — script,
screen-record, narrate, caption, edit, upload — costs hours at exactly the moment the deadline is
tightest, and in portfolio mode it is 4×. The kit already automates everything up to this point:
the build is green, the submission draft exists with `TBD-post-build: demo video URL` waiting.
Demo Studio closes that gap.

**Goals:**

- **G1 — Script-to-upload autonomy:** from the committed brief/spec/`event.md`, generate a
  scene-by-scene demo script, record the built app scene-by-scene on the user's machine, assemble
  with Remotion (cards, captions, narration, music), QC it, and — with consent — upload and
  resolve the submission draft's TBD.
- **G2 — Quality via gates, not hope:** every scene has a gate assertion and a retake budget;
  every render passes a frame-level QC loop; the user watches the final cut before it ships.
  Retakes are filmmaking; a fabricated interaction is never acceptable (same ethos as
  "never fake green").
- **G3 — Consent discipline:** the seat never self-triggers; recording sessions, the upload, and
  any account-touching step are consented gates in the gate-concierge sense. Watching the final
  video and consenting to upload are two separate human moments.

**Non-goals:** talking-head avatars; fully-unattended publish; live-streamed demos; multi-language
narration (v1 is English — see §13 Kokoro timestamp caveat).

## 2. Architecture (shaped by the verified facts, not the 2025 mental model)

The four subsystems and the current-as-of-2026-07-09 primitives they stand on:

| Subsystem | Primitive (verified §13) | What changed vs. stale priors |
|---|---|---|
| Browser capture | **Playwright ≥1.59 `page.screencast`** — JPEG frames at `quality:100` piped to ffmpeg, two-pass H.264 mp4 | `recordVideo` is BANNED here: hardcoded ~1 Mbit/s single-threaded VP8, 800×800 default scaling — unusable for YouTube-bound footage |
| Native/window capture | **ffmpeg 8.1 `gfxcapture`** (window by `window_exe`/`window_title` regex) and `ddagrab` (desktop) — both `-f lavfi` sources emitting D3D11 frames; probe hw encoder (nvenc/amf/qsv) else `hwdownload,format=bgra` + libx264 | `gdigrab` demoted to zero-GPU fallback; `-f ddagrab` is a wrong invocation; **no WASAPI** exists in ffmpeg — native scenes record SILENT (narration is TTS anyway) |
| Assembly | **Remotion 4.0.x pinned+aligned** — `<Video>`/`<Audio>` from `@remotion/media` (Mediabunny), `getMediaMetadata()` for audio-first timing, `@remotion/captions` `Caption` objects built directly from TTS timestamps | `<OffthreadVideo>` is now the *fallback*, not the recommendation; `getAudioDurationInSeconds` is deprecated; output h264 (VP8/VP9 encode is very slow) |
| Wallet-on-camera | **dappwright 2.13.6** (pins MetaMask 13.17.0; cache the zip at bootstrap) via `launchPersistentContext` + `channel:'chromium'` **headed**; fallback: a **vendored ~150-LOC viem-backed EIP-1193/6963 injected provider** doing real testnet txs with no extension UI | Synpress is rejected (6-month release gap, 125 open issues, older MetaMask pin); MetaMask ships multi-release weeks — never automate against "latest"; MV2 support is gone (Playwright 1.55) |

**The scene is the unit of everything.** Each scene = capture script + gate assertion + narration
line + retake budget. Scenes record independently (a failed scene retakes alone), get re-encoded
to constant-fps H.264 (CDP screencast is paint-driven/variable-rate — idle pages emit no frames),
and map 1:1 to script entries so the QC loop can grab per-scene keyframes deterministically
(`ffmpeg -ss <t> -i final.mp4 -frames:v 1 -q:v 2` — benchmarked **0.5s/seek, ≈15s for a 30-frame
per-scene-seek pass on the user's actual machine**; a batch select-filter pass is ~6s but loses the
deterministic scene mapping. The machine already runs ffmpeg 8.1.1-full gyan.dev).

## 3. Feature A — the `demo-studio` seat (new skill + kickoff)

A **user-side seat** (like gate-concierge): consented access to the machine, never self-triggers,
runs after the orchestrator reports green (its input is a working app). Stages:

1. **Script.** Read brief + spec + pack `event.md` + the submission draft. Emit
   `docs/demo/<date>-demo-script.md` (project repo): scene table — id, target seconds, visual
   (route/action/window), narration line, capture driver (screencast | gfxcapture | ddagrab),
   wallet verbs where used (abstract: `connect`, `approveTx`, `switchNetwork` — driver-agnostic),
   **gate assertion** (what the final frame/network state must show), retake budget (default 3).
   **Scene-time allocation is weighted by the event's published judging criteria** (working-demo
   weight → money-shot seconds). Commit it; the user approves the script before any recording.
2. **Storyboard preview.** Render the Remotion composition's static frames (cards, captions
   layout) as stills for user approval — the cheap correction point before filming.
3. **Capture.** Scene-by-scene, sequential — one context at a time (high memory use with
   Chrome for Testing is reported but unconfirmed, Playwright issue #38489; sequential is the
   precaution): browser scenes via screencast→ffmpeg at 1920×1080 viewport, `quality:100`, re-encoded
   constant-fps; wallet scenes headed with dappwright (**wallet popups are separate windows —
   page-level capture misses them**; capture those via `gfxcapture` window match or a second CDP
   screencast on the popup target, and add MV3 service-worker wake logic — workers suspend after
   ~30s idle); native scenes via gfxcapture, silent. Gate assertion after each take; retake on
   fail — and **a wallet-scene retake must refresh its on-chain preconditions first** (nonce,
   burner balance, pending txs: the prior take may have mined the tx or set the allowance already;
   testnet nondeterminism — RPC latency, gas — also means tx-scene gate assertions tolerate
   latency variance rather than hard timeouts). After budget exhaustion, swap wallet driver
   (dappwright → injected provider + explorer confirmation shot) or mark the scene BLOCKED with a
   placeholder card. Scene scripts **discover the target monitor/window at runtime** — never
   hardcode `output_idx`/`hwnd` (DPI scaling and multi-monitor setups shift ddagrab coordinates
   and gfxcapture window matching). Recording is a
   **foreground, do-not-disturb session** — the kickoff says so and the user consents to it as a
   gate.
4. **Narration + captions.** TTS per scene through one **word-timing adapter interface** (§4);
   scene durations derive from narration lengths via `getMediaMetadata()` (audio-first timing).
   Captions built directly as `@remotion/captions` `Caption` objects from the TTS timestamps — no
   transcription pass for agent-generated narration.
5. **Assembly.** Remotion project under `demo/` in the project repo (committed code; renders
   git-ignored): title card, per-scene clips via `@remotion/media` `<Video>`, captions, optional
   music bed ducked under narration, outro (repo QR + track/bounty line from the brief). Final
   audio: **two-pass loudnorm to I=-14 LUFS, TP=-1.5, LRA=11** (YouTube playback normalization;
   ffmpeg's default −24 target is too quiet). QC renders at reduced resolution; final at 1080p
   h264.
6. **QC loop.** Extract per-scene keyframes (per-scene `-ss` seeks so frames map to script
   scenes), read them as images: money shot visible, text legible, captions present, no
   Windows.Graphics.Capture yellow border artifact, duration within budget; audio present with
   sane loudness stats. Fix composition → re-render until clean (bounded iterations, report
   what's still imperfect).
7. **Human gate: watch.** The user watches the final cut. This gate is never skipped.
8. **Upload gate (separate consent).** Default path per §5. On success: verify the link renders
   for a **logged-out fetch**, write the URL into the gate ledger with evidence, and resolve the
   submission draft's `TBD-post-build: demo video URL`.

## 4. Feature B — narration engine adapters (verified engine matrix)

One interface (`synthesize(sceneText) → {audioFile, wordTimings[]}`), four adapters, in this
order:

| Engine | Role | Verified state (2026-07-09) | Timing source |
|---|---|---|---|
| **Kokoro-82M** (`kokoro` 0.9.4, Apache-2.0) | **Default — local, offline, zero-signup** | Bootstrap needs a **Python 3.10–3.12 venv** (package pins `<3.13`; use `uv`) + the **espeak-ng Windows MSI**; use the **PyTorch pipeline, not ONNX** — only it emits token `start_ts`/`end_ts`, and **English-only** | native per-token |
| **edge-tts** 7.2.8 | Secondary zero-signup (nicer MS neural voices) | Network-dependent, reverse-engineered; **recurring 403 blockage waves (2023, 2024, Jan 2026)** — health-check in preflight, auto-fall-back to Kokoro; never the sole engine near a deadline | native `WordBoundary` |
| **ElevenLabs** (Free: 10k credits/mo ≈ ~3 demo narrations) | Premium — API key is a Tier-A concierge signup gate | Official MIT **elevenlabs-mcp v0.10.0** (June 2026) — drive via MCP, no custom SDK code; `with-timestamps` endpoint returns character-level alignment (aggregate to words); QC retries burn monthly credits — budget them | native char-level |
| OpenAI `gpt-4o-mini-tts` (~$0.015/min) | Tertiary only | **No timestamps** (forces the whisper branch), 2,000-token input cap (chunk per scene) | whisper branch |

**Whisper branch** (needed only for OpenAI TTS and friend-recorded voiceovers):
`@remotion/install-whisper-cpp` with **whisper.cpp pinned to 1.5.5** — the version Remotion's
`toCaptions()` is validated against; an agent that "helpfully" installs latest (1.9.1) breaks the
caption parse. `@remotion/whisper-web` is ruled out (browser-only, experimental). whisperX 3.8.6
is the documented heavy fallback for noisy friend-VO alignment. **Piper is rejected** (now
GPL-3.0, maintainer-search limbo, quality below Kokoro).

## 5. Feature C — upload paths (the policy research changed this)

- **Default: consented browser upload to YouTube Studio** (unlisted) on the user's logged-in
  Chrome session — because the API path is effectively dead for a personal tool: **uploads via
  `videos.insert` from unverified API projects are hard-locked to private** (policy for projects
  created after 2020-07-28, no appeal; lifting it requires a YouTube API compliance audit), and
  OAuth adds sensitive-scope verification or 7-day token expiry in Testing mode. (Quota is NOT
  the problem — it was restructured to 1 unit/upload, 100/day; the old "1600 units" lore is
  stale.) **Honesty requirement:** YouTube's ToS prohibits automated access without written
  permission, with no carve-out for your own session. The skill must state this plainly in the
  ledger row, keep it low-volume/supervised/user's-own-content, log the upload like every
  concierge action, and never present the path as ToS-clean. Authorization comes from the
  kickoff's own **UPLOAD field** — an explicit standing authorization for this action class,
  parallel to but distinct from the concierge's SIGNUP AUTOMATION line (which covers signups /
  API keys, not uploads); the per-upload consent still gates each run. Two operational rules from
  the verified risks: **preflight the account's upload eligibility before any render time is
  spent** (new/low-history accounts can hit verification interstitials), and on any interstitial
  or Studio DOM drift, **stop and hand off to the user** — never fight bot detection — with the
  Drive fallback one flag away.
- **Programmatic fallback: Google Drive resumable upload** (`drive.file` scope — non-restricted,
  so no app verification/audit; `permissions.create` → anyone-with-link). Caveat the research
  confirmed: it still needs a Google Cloud OAuth client, and in Testing publishing status its
  refresh tokens **expire after 7 days** (drive.file is not exempt — only bare
  email/profile/openid scopes are). Re-consenting once per hackathon is acceptable; a
  set-once-and-cache token design is not. Hackathon forms broadly accept Drive links.
- **Rejected:** Loom (no open API; free tier: 25 videos lifetime, 720p, no MP4 download),
  Streamable (read-only API, ~90-day auto-deletion would break a judged link), Vimeo (free-tier
  API upload needs manual approval up to 5 business days, 1 GB lifetime) — Vimeo opt-in only.

## 6. Feature D — the music kit (licensing made a design decision)

No live music downloads at render time: YouTube Audio Library is Studio-only (no API; standard
license is YouTube-videos-only), Pixabay's API has no music endpoint and the site 403s bots, FMA
is an NC-license minefield. Instead: **`references/music-kit.md`** (kit-side manifest, like the
faucet library — metadata only, no binaries in any repo) listing 5–10 pre-cleared tracks with
license, source URL, and required attribution line; the actual MP3s live in a local machine
folder (`~/.build-system/music-kit/`), assembled once via a consented browser/download session.
Incompetech (CC-BY 4.0, direct MP3 URLs, scriptable) is the automation-friendliest source — the
uploader auto-appends its attribution line to the video description. Cross-platform-safe licenses
(CC-BY / Pixabay) are preferred over YouTube-only tracks because submissions sometimes must also
land on Dorahacks/IPFS/project sites.

## 7. Quality invariants (the review's checklist)

1. Never self-triggers; recording, upload, and any signup are consented gates; **watch-before-
   upload is a hard human gate**; upload is its own consent.
2. Every scene has a gate assertion; retakes are bounded; a blocked scene degrades to a
   placeholder card, never to a fabricated interaction.
3. Burner wallet only, testnet only, keys per the kit's §Safety (env-var names; extension zip
   pinned + cached; no secret ever in the demo repo dir, the script, or on camera — QC explicitly
   checks frames for leaked secrets/addresses that shouldn't be shown).
4. Renders and captures are git-ignored; committed artifacts are code + script + ledger evidence
   (URL, checksums), consistent with repo-as-source-of-truth.
5. Version pins are exact and aligned (all `@remotion/*` on one version; playwright ≥1.59 pinned;
   whisper.cpp 1.5.5 on the Remotion path; dappwright+MetaMask pinned as a tested pair) — and
   §0.3's re-verify happened, recorded in `references/demo-stack.md`.
6. ToS-honesty: the YouTube browser path is documented as not ToS-clean, everything is logged in
   the gate ledger; no disguising automation where a policy forbids it silently.
7. Single-project campaigns unchanged; existing seats' doctrine untouched except the named
   integration points (§8).

## 8. File-by-file change map

| File | Change |
|---|---|
| `demo-studio/SKILL.md` | **new** — §3 stages, §4 adapters, §5 upload doctrine, consent model |
| `prompts/INVOKE_DEMO_STUDIO.md` | **new** — REPO/GRANTED ACCESS/VOICE/MUSIC/UPLOAD fields; recording = foreground consented session |
| `references/demo-stack.md` | **new** — the operational fact sheet: exact pins re-verified at build time (§0.3), canonical commands (screencast→ffmpeg two-pass; gfxcapture/ddagrab invocations incl. `hwdownload,format=bgra` fallback; encoder probe; two-pass loudnorm; keyframe QC), Kokoro/whisper bootstrap steps |
| `references/music-kit.md` | **new** — §6 manifest + assembly protocol |
| `gate-concierge/SKILL.md` | 2–3 lines: "demo video" joins the implicit campaign gates, pointing at demo-studio; upload evidence lands in the same gate ledger |
| `guide/SKILL.md` | map table row (Step 2.5, optional, after build green / before submission gates) + a Before-Step-2.5 playbook paragraph |
| `references/roles.md` | add demo-studio to the user-side seats |
| `README.md` | pipeline paragraph + files tree + planned-upgrades pointer update |
| `prompts/INVOKE_GATE_CONCIERGE.md` | implicit-gate list gains "demo video (→ demo-studio)"; the submission step sources the video URL from the resolved draft |
| `prompts/INVOKE_GUIDE.md` | pipeline diagram + the "One open seat, five fresh sessions … 0a/0/1/2/3" note — both enumerate exactly five steps and go stale when Step 2.5 exists |
| `architect/SKILL.md` | no change (submission draft already carries the TBD hook) — verify, don't assume |

Known stale-text hotspots to sweep: the concierge's submission playbook (it should mention the
video URL arrives from demo-studio), README diagrams, INVOKE_GATE_CONCIERGE's implicit-gate list,
and — if portfolio mode landed first — the fleet deck (portfolio PRD **§5**, Feature C) must
include per-project demo-studio kickoffs; the per-owner voice slot is specced in **this PRD's
§11**.

## 9. Implementation order

1. `references/demo-stack.md` (re-verify §13 pins live — §0.3) → 2. capture layer (screencast→
ffmpeg vendor pattern; gfxcapture/ddagrab wrappers with encoder probe; **spike test: record one
scene of any deployed app end-to-end first**) → 3. wallet dual-driver → 4. TTS adapters (Kokoro
bootstrap incl. Python 3.10–3.12 venv + espeak-ng MSI) → 5. Remotion scaffold + captions +
loudnorm → 6. QC loop → 7. `demo-studio/SKILL.md` + kickoff + integration edits → 8. music-kit
manifest → 9. cross-file sweep → 10. adversarial review → 11. one commit to `main`.

## 10. Acceptance criteria

- A 2-scene dry run against any deployed web page produces: an approved script, gated captures,
  a rendered 1080p h264 video with narration + word-timed captions at −14 LUFS, a QC report with
  per-scene keyframes, and — after the watch + upload consents — a logged-out-verified link
  written into a gate ledger and the submission draft.
- A deliberately failing scene (bad gate assertion) retakes to budget, then degrades to a
  placeholder card and is reported — never silently passed.
- Kokoro path works fully offline; edge-tts outage (simulated) auto-falls-back without stalling.
- No secret value appears in any committed file, any frame, or the ledger.

## 11. Deferred (do NOT build)

OBS live compositing (escalation path documented: OBS 32.1.2 bundles obs-websocket v5, drive with
`obs-websocket-js` 5.0.8 directly — the OBS MCP servers are release-less hobby projects, avoid);
system-audio capture (needs the 2023-era virtual-audio-capturer dshow filter or OBS — narration
is TTS, so v1 records native scenes silent); talking-head avatars; music-generation APIs;
multi-language narration; fully-unattended publish. Portfolio-mode fan-out of demo-studio (4
videos, per-owner voices) is specced in one line here and activated only after the portfolio PRD
is built: one demo-studio session per project repo, deck-scheduled, sharing the machine
sequentially (recording is foreground-exclusive).

## 12. Open questions (ask the user at implementation kickoff — do not guess)

1. Default voice (Kokoro voice id vs. ElevenLabs) and target video length when `event.md` doesn't
   mandate one (suggest 3:00)?
2. Music on by default, or captions-only unless asked?
3. Wallet UI on camera (dappwright) vs. clean injected-signer + explorer shot — per-scene default?
4. Which YouTube channel/account; is the Drive fallback acceptable to their usual hackathon
   platforms (Dorahacks)?
5. Friends record their own VO (whisper alignment path) or TTS for all portfolio videos?

## 13. Dependency fact sheet — verified 2026-07-09 (35-agent live research; re-verify per §0.3)

Tags: `[pin]` = exact version to re-check and pin at build time; `[policy]` = external policy/ToS
that can change; `[local]` = verified on the user's actual machine.

| # | Component | Verified fact (2026-07-09) | Source | Consequence |
|---|---|---|---|---|
| 1 | Remotion `[pin]` | 4.0.487 latest (releases every 1–3 days; 5.0 unreleased, migration page is "planned changes") | registry.npmjs.org/remotion/latest; remotion.dev/docs/5-0-migration | Pin one exact 4.0.x across ALL `@remotion/*` (aligned versions required) |
| 2 | Remotion license `[policy]` | Free tier: individuals, ≤3-employee for-profits, non-profits; local `npx remotion render` needs no key; Automators tier $0.01/render+$100/mo min if ever productized | remotion.dev LICENSE.md; remotion.pro/license | User qualifies free as an individual; PRD scoped to personal tooling |
| 3 | Remotion media | `<OffthreadVideo>` docs: "For new video usage, prefer `<Video>` from @remotion/media" (Mediabunny/WebCodecs; Media Parser deprecated Feb 2026); OffthreadVideo is the automatic render fallback | remotion.dev/docs/offthreadvideo; /docs/media/video | Embed clips with `@remotion/media` `<Video>`; keep fallback enabled (VFR webm edge cases) |
| 4 | Audio timing | `getAudioDurationInSeconds` **deprecated** → `getMediaMetadata()` (Mediabunny) | remotion.dev/docs/get-audio-duration-in-seconds | Audio-first timing uses getMediaMetadata() |
| 5 | Remotion render | CLI auto-installs Chrome Headless Shell (4.0.452+ uses Chrome 149); pass composition id explicitly (else interactive prompt); h264 default; VP8/VP9 encode "very slow"; `npx remotion benchmark` for --concurrency | remotion.dev/docs/cli/render; /docs/performance | Bootstrap: `npx remotion browser ensure`; output h264; QC renders at low res |
| 6 | Playwright `[pin]` | 1.61.1 (Node ≥18; 18 deprecated) | registry.npmjs.org; GitHub releases | Pin ≥1.59 <2 (screencast floor), Node 20/22 |
| 7 | recordVideo | Hardcoded ~1 Mbit/s single-thread VP8, 800×800 default scale; tuning refused (issues #31424/#17217) | github.com/microsoft/playwright/issues/31424 | **Banned** as capture path |
| 8 | page.screencast | NEW in 1.59 (2026-04-01): `quality` 0–100, `size`, `onFrame` JPEG stream + timestamps; `showChapter`/`showActions`/`showOverlay` demo overlays; CDP paint-driven (idle = no frames) | playwright.dev/docs/api/class-screencast | Capture = screencast JPEG→ffmpeg two-pass H.264 (vendor the playwright-recorder-plus pattern — single-maintainer pkg); re-encode constant-fps |
| 9 | Extensions | Chromium persistent context only; branded Chrome/Edge removed side-load flags → `channel:'chromium'`; MV2 dropped (1.55); MV3 service workers suspend ~30s; high memory use with Chrome for Testing is *reported but unconfirmed* (issue #38489) | playwright.dev/docs/chrome-extensions; github playwright issue #38489 | Wallet scenes headed, sequential (precaution), with SW wake logic |
| 10 | dappwright `[pin]` | 2.13.6 (published 2026-07-08 — day before research); pins MetaMask 13.17.0 (overridable); 2026 patch history is all MetaMask-UI-breakage fixes; README: extensions hang in headless, use headless:false | registry.npmjs.org; github TenKeyLabs/dappwright | Default wallet driver; pin+cache the MetaMask zip at bootstrap; never chase MM latest (13.38.2 today, multi-release weeks) |
| 11 | Synpress | 4.1.2 (2026-01-10, ~6-month gap), 125 open issues, MetaMask pin 13.13.1, no GH releases since 3.7.3 | registry.npmjs.org; github Synthetixio/synpress | **Rejected** |
| 12 | Injected provider | wallet-mock 1.4.1 (2024-08, stale but sound viem/EIP-6963 pattern); walletless 1.2.0 (2026-02, freshest, Anvil-oriented) | github johanneskares/wallet-mock; defi-wonderland/walletless | Vendor ~150 LOC in-repo (pattern, not dependency); pair with explorer-confirmation scene |
| 13 | Kokoro `[pin]` | kokoro 0.9.4 (Apache-2.0; **Python <3.13 pin lives**); espeak-ng MSI required on Windows; PyTorch pipeline emits token start_ts/end_ts — **English-only**; ONNX/JS builds drop alignment | pypi.org/project/kokoro | Default TTS; uv-managed 3.12 venv; PyTorch not ONNX |
| 14 | edge-tts `[policy]` | 7.2.8 (2026-03-22), zero-signup; 403 waves 2023/2024/Jan-2026 (#458 closed not-planned); WordBoundary word timing | pypi/github rany2/edge-tts | Secondary; preflight health check + auto-fallback |
| 15 | ElevenLabs `[policy]` | Free 10k credits/mo (≈3 narrations); official MIT elevenlabs-mcp v0.10.0 (2026-06-19); with-timestamps = char-level alignment | elevenlabs.io/pricing; github elevenlabs/elevenlabs-mcp | Premium path via MCP; key = concierge gate; budget QC retries |
| 16 | OpenAI TTS | gpt-4o-mini-tts ~$0.015/min; 2,000-token input cap; **no timestamps** on any /v1/audio/speech model | developers.openai.com | Tertiary; forces whisper branch |
| 17 | Piper | Original repo archived Oct 2025; successor OHF-Voice/piper1-gpl is **GPL-3.0**, maintainer-search | github OHF-voice/piper1-gpl | Rejected (license + limbo) |
| 18 | ffmpeg `[local]` | **8.1.1-full (gyan.dev) already on the user's PATH** (8.1.2 is latest stable, 2026-06-17) | local `ffmpeg -version`; ffmpeg.org | No bootstrap needed on this machine; winget/gyan fallback for portability |
| 19 | gfxcapture | NEW in 8.1: Windows.Graphics.Capture window/monitor source, regex window_exe/title, D3D11 out, needs `fps` filter for constant rate; **verify build compiled it in**: `ffmpeg -filters | findstr gfxcapture` | FFmpeg 8.1 changelog + filters.texi | Per-window native capture (wallet popup, terminal); ddagrab+crop fallback; discover the target window at runtime, never hardcode `hwnd` |
| 20 | ddagrab | lavfi **source filter** (`-f lavfi -i ddagrab`), NOT `-f ddagrab`; D3D11 frames → hw encoder, or `hwdownload,format=bgra` before libx264 | ffmpeg filters docs | Desktop capture; encoder probe (`ffmpeg -encoders`) at preflight; discover monitor `output_idx` at runtime — DPI scaling + multi-monitor shift coordinates |
| 21 | Windows audio | No WASAPI in ffmpeg (trac #9408 open, wish); dshow-only via 2023-era virtual-audio-capturer | trac.ffmpeg.org/ticket/9408 | Native scenes record silent; narration is TTS in Remotion |
| 22 | whisper.cpp `[pin]` | v1.9.1 (2026-06-19) with prebuilt Win x64 binaries; **but Remotion's toCaptions() is validated against 1.5.5** — install-whisper-cpp docs pin it | github ggml-org/whisper.cpp; remotion.dev/docs/install-whisper-cpp | Pin 1.5.5 on the Remotion path; whisperX 3.8.6 heavy fallback; whisper-web ruled out (browser-only, experimental) |
| 23 | YouTube API `[policy]` | Uploads from unverified projects (post-2020-07-28) locked **private**, no appeal, audit to lift; OAuth: youtube.upload sensitive, Testing-mode tokens expire 7 days; quota restructured — insert = 1 unit, 100/day (the "1600 units" lore is stale) | developers.google.com/youtube/v3/docs/videos/insert; /revision_history | API path dead for personal tools; browser path default |
| 24 | YouTube ToS `[policy]` | "no automated means… except… prior written permission" — no own-session carve-out | youtube.com/static?template=terms | Document honestly; consent-gated, low-volume, user's own content |
| 25 | Drive API `[policy]` | Resumable upload >5 MB, `drive.file` non-restricted scope — no verification/audit, but still a Google Cloud OAuth client, and Testing-status refresh tokens **expire after 7 days** (drive.file not exempt); anyone-with-link via permissions.create | developers.google.com/workspace/drive | Programmatic fallback host; design for re-consent per hackathon, never a cached-forever token |
| 26 | Loom / Streamable / Vimeo `[policy]` | Loom: "does not offer a open API"; free = 25 videos lifetime/720p/no MP4 (secondary-source numbers — confidence *likely*). Streamable API read-only + ~90-day deletion. Vimeo free API upload = manual approval ≤5 business days, 1 GB lifetime. Free tiers churning post-2025 | Atlassian/Streamable/Vimeo help pages | Rejected / Vimeo opt-in only |
| 27 | Music `[policy]` | YT Audio Library: Studio-only, no API, standard license YouTube-only. Pixabay: great license, no music API, 403s bots. Incompetech: CC-BY 4.0, direct MP3 URLs, attribution line in description. FMA: NC minefield | respective license/help pages | §6 local music kit + manifest; Incompetech = most automatable |
| 28 | QC + loudness `[local]` | Keyframe extraction benchmarked on this machine: 0.5s/seek → ≈15s for a 30-frame per-scene-seek pass (batch select-filter: 5.8s but loses scene mapping) from 180s 1080p; loudnorm two-pass (pass1 print_format=json → pass2 measured_*+linear=true) targeting **I=-14, TP=-1.5, LRA=11** for YouTube (default −24 too quiet) | local benchmark; `ffmpeg -h filter=loudnorm` | QC cost is vision tokens, not ffmpeg; exact loudnorm recipe goes in demo-stack.md |
