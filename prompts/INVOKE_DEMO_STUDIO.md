# Invoke Demo Studio — copy-paste kickoff prompt

Paste this into a fresh session **after the orchestrator reports the build green** (Step 2.5) to
produce the hackathon demo video autonomously: it writes a scene-by-scene script for your approval,
records the built app scene-by-scene on your machine, narrates + captions + assembles with Remotion,
runs a frame-level QC loop, shows you the final cut, and — on a separate consent — uploads it and
fills the submission draft's demo-video URL. It records under a **foreground do-not-disturb session**
and **never publishes without you watching first**.

## Where it sits in the pipeline

```
Step 2 — orchestrator: build green.
Step 2.5 — demo-studio: THIS prompt → script (you approve) → record → assemble → you WATCH → upload (separate consent).
Step 3 (closing) — gate-concierge: submission gate finds the demo-video URL already in the draft.
```

For browser scenes connect the Chrome browser tools (claude-in-chrome); for native/wallet-popup
scenes and the recording session, computer-use / device access. Read `references/demo-stack.md`
first (pins + exact commands) and re-verify its `[pin]`/`[policy]` rows if it's been a while.

---

```
You are DEMO STUDIO (Step 2.5). Load and follow demo-studio/SKILL.md (and its references/ —
especially references/demo-stack.md for pinned versions and exact commands). The build is green;
produce the demo video WITHOUT self-triggering and WITHOUT publishing anything before I watch it.

REPO: [the project repo URL / owner-name — from the guide's runsheet]

GRANTED ACCESS: [what I'm giving this session — e.g. Chrome browser (claude-in-chrome), my device
(computer-use) for the recording session + native/wallet-popup scenes, and permission to run a
foreground do-not-disturb recording window. Strike anything I'm not granting.]

VOICE: [Kokoro (default — local, offline, English) | edge-tts | ElevenLabs (premium; its API key is
a concierge signup gate)]

LENGTH: [event-mandated length, or ~3:00 default]

MUSIC: [off (default — captions-only) | on + mood, from references/music-kit.md]

WALLET-ON-CAMERA: [dappwright real MetaMask (default) | injected-signer + block-explorer shot |
per-scene — auto-swaps to injected on retake-budget exhaustion either way]

UPLOAD: authorized — unlisted YouTube via my logged-in Studio session (browser automation; I accept
this is not ToS-clean and is my own content, low-volume, logged). Drive fallback OK.
[Set the channel/account, or strike to keep upload manual and just hand me the rendered file.]

Do this, in order:
1. Run your tollgate session card first (references/tollgate.md rows 5-6, 8-13, 16 — the demo-stack
   probes plus browser/device access, the wallet extension when wallet scenes are on, and disk); a
   failing hard row stops you with its fix hint
   before any script/recording work. Then sync the project repo; read the brief (money shot), spec,
   the pack's event.md (judging weights), and docs/gates/submission-draft.md.
2. Write docs/demo/<date>-demo-script.md — a scene table (id, seconds, visual, narration, capture
   driver, wallet verbs, gate assertion, retake budget), scene-seconds weighted by the judging
   criteria. Commit it and get my approval BEFORE recording.
3. Render storyboard stills (cards + caption layout) for my approval.
4. Get my consent to the foreground recording session, then capture scene-by-scene (screencast for
   browser, gfxcapture/ddagrab silent for native/wallet-popup), gate-asserting each take, retaking
   to budget, degrading a stuck scene to a placeholder card — never faking an interaction.
5. TTS narration (VOICE) + word-timed captions (audio-first scene timing); assemble in Remotion
   (@remotion/media <Video>, captions, optional ducked music, outro), loudnorm to -14 LUFS, render
   1080p h264.
6. QC loop: per-scene keyframes read as images (money shot, legibility, captions, no capture border,
   no on-screen secret, duration) — fix + re-render until clean or bounded, then report residuals.
7. Show me the final cut. I WATCH it — this gate is never skipped.
8. On my SEPARATE upload consent: preflight upload eligibility, upload unlisted, verify the link
   renders logged-out, append any music attribution, write the URL + evidence to the gate ledger,
   and resolve the submission draft's demo-video TBD. On any Studio interstitial/DOM drift, stop and
   hand off — never fight bot detection.

Never: publish before I watch; fabricate an interaction; put a burner key or any secret in a repo
file, a frame, or the ledger; touch mainnet or my main wallet; present the browser upload as
ToS-clean.
```

---

## Notes on using it

- **Script first, and you approve it.** You get a committed shot list before any recording — the
  cheapest place to fix the video is words on a page, not a re-shoot.
- **Gates, not vibes.** Each scene has a pass/fail assertion and a retake budget; the render passes a
  frame-level QC loop; and you watch the final cut. A scene that can't pass becomes a placeholder
  card, never a staged fake — the on-chain tx in the cut really happened on testnet.
- **Two consents.** Starting the recording session (it takes over your screen) and publishing the
  video are separate go-aheads. Nothing uploads before you've watched.
- **Local-first and free by default.** Kokoro TTS is offline and zero-signup; ffmpeg + Remotion +
  Playwright render locally with no paid key for an individual. Premium voice (ElevenLabs) and the
  upload account are the only things that touch an external account.
- **The video URL flows into the submission for you.** demo-studio resolves the submission draft's
  `demo video URL` TBD, so the concierge's Step-3 submission gate has it ready — the two seats share
  one gate ledger.
- **Re-verify the stack before a real run.** `references/demo-stack.md` pins fast-moving tools
  (Remotion ships every few days; MetaMask multiple times a week); its freshness rule says re-check
  the pins first so the agent doesn't reach for a deprecated API.
