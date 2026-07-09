# Demo Stack — the demo-studio operational fact sheet

The `demo-studio` seat (`../demo-studio/SKILL.md`) runs on a fast-moving toolchain. This file is its
**pinned, re-verifiable ground truth**: exact versions, the canonical commands (copy-paste, not
reconstructed from memory), and the Windows bootstrap steps. It is doctrine-side reference, like
`web3-seed-pack.md` — read it before driving any capture/render/upload, and re-verify the pins
before a campaign the way `faucets/README.md` treats stale entries.

Design rationale, provenance, and the "why this tool not that one" reasoning live in the PRD
(`../docs/prd/2026-07-09-demo-studio-prd.md` §13). This file is the *operational* distillation: what
to run, pinned to what version.

## Freshness — re-verify before you rely on this

The versions below rot weekly (Remotion ships every 1–3 days; MetaMask multiple times a week). An
entry older than ~60 days is a hint, not a fact. Before a real recording campaign, re-check the
`[pin]`/`[policy]` rows against live sources (npm: `registry.npmjs.org/<pkg>/latest`; PyPI:
`pypi.org/pypi/<pkg>/json`; GitHub releases API) and update this file with the date. An agent that
generates code from pre-2026 training data will reach for deprecated APIs (`getAudioDurationInSeconds`,
`<OffthreadVideo>` as primary, `recordVideo`) — this sheet is what keeps it honest.

**Last re-verified: 2026-07-09** (live npm/PyPI registries). All fast-moving pins unchanged from the
research pass: Remotion `4.0.487`, Playwright `1.61.1`, `@tenkeylabs/dappwright` `2.13.6`, `kokoro`
`0.9.4` (`requires_python <3.13,>=3.10`), `edge-tts` `7.2.8`. Local `ffmpeg` on the target machine:
`8.1.1-full` (gyan.dev), already on PATH.

## Pins (exact versions to lock at project bootstrap)

| Component | Pin | Notes |
|---|---|---|
| Remotion + all `@remotion/*` `[pin]` | `4.0.487` (one exact version across every `@remotion/*` package — aligned versions are required) | Do NOT design against 5.0 (unreleased). Free license covers an individual on their own machine; local `npx remotion render` needs no key. |
| Playwright `[pin]` | `>=1.59 <2`, lock the exact latest (`1.61.1`); Node 20 or 22 | `page.screencast` (the capture API) landed in 1.59. Node 18 works but is deprecated. |
| `@tenkeylabs/dappwright` `[pin]` | `2.13.6`; pins MetaMask `13.17.0` | Cache the MetaMask zip at bootstrap. **Never** track MetaMask `latest` (multi-release weeks → selector breakage). |
| `kokoro` (PyPI) `[pin]` | `0.9.4`, Apache-2.0; **Python 3.10–3.12** (`<3.13` pin is live) | PyTorch pipeline only (ONNX/JS builds drop word timestamps). English word timings only. |
| `edge-tts` (PyPI) `[policy]` | `7.2.8`, zero-signup | Reverse-engineered MS endpoint; 403 blockage waves recur (~annually). Health-check before use; auto-fall-back to Kokoro. |
| whisper.cpp via `@remotion/install-whisper-cpp` `[pin]` | whisper.cpp **`1.5.5`** (the version Remotion's `toCaptions()` parses) | NOT latest (`1.9.1`) on the Remotion path — its token-timestamp JSON format differs. Only needed for OpenAI-TTS and friend-VO alignment. |
| ffmpeg `[local]` | `8.1.x` (8.1 added `gfxcapture`; 8.1.2 is latest stable) | Already installed on this machine. Portability fallback: `winget install Gyan.FFmpeg` or gyan.dev static build. |
| ElevenLabs (premium TTS) `[policy]` | official MIT `elevenlabs-mcp` `v0.10.0`; Free tier 10k credits/mo (~3 narrations) | Drive via MCP, no custom SDK. API key = a Tier-A concierge signup gate. |

## Narration adapters (VOICE) — engine → timing source

One interface `synthesize(sceneText) → {audioFile, wordTimings[]}`, four adapters in priority order.
Word timings feed `@remotion/captions` `Caption` objects directly — no transcription pass for
narration we authored:

| Engine | Role | Word-timing source |
|---|---|---|
| **Kokoro** `0.9.4` (default) | local, offline, zero-signup; **English only** | PyTorch `KPipeline` `result.tokens` (`start_ts`/`end_ts`) — the PyTorch build only |
| **edge-tts** `7.2.8` | secondary zero-signup; network-dependent, 403-prone → auto-fall-back to Kokoro | native `WordBoundary` events |
| **ElevenLabs** (via `elevenlabs-mcp`) | premium; API key = a Tier-A concierge signup gate | `with-timestamps` endpoint (char-level → aggregate to words) |
| **OpenAI** `gpt-4o-mini-tts` | tertiary; 2,000-token input cap (chunk per scene) | **none** — forces the whisper branch (whisper.cpp `1.5.5`) |

The whisper branch (whisper.cpp `1.5.5` via `@remotion/install-whisper-cpp`, `tokenLevelTimestamps:
true`) is used **only** for OpenAI-TTS and friend-recorded voiceovers; whisperX `3.8.6` is the heavy
fallback for noisy VO. Design rationale for each choice is in PRD §4.

Rejected, and why (do not reach for these): **Synpress** (6-month release gap, MetaMask pin 25+
versions behind) → use dappwright. **Piper** (now GPL-3.0, maintainer-search) → use Kokoro.
**`recordVideo`** (hardcoded ~1 Mbit/s VP8, 800×800 scale) → use `page.screencast`.
**`@remotion/whisper-web`** (browser-only, experimental) → use `@remotion/install-whisper-cpp`.
**gdigrab** as primary (CPU/GDI, drops frames) → use `ddagrab`/`gfxcapture`, gdigrab only on a
GPU-less VM/RDP box.

## Canonical commands (copy these — do not reconstruct)

**Preflight probes (run once at session start, branch on the result):**

```
ffmpeg -encoders            # find hw encoder: h264_nvenc (NVIDIA) | h264_amf (AMD) | h264_qsv (Intel)
ffmpeg -filters | findstr gfxcapture   # confirm THIS ffmpeg build compiled gfxcapture in (8.1 feature; some builds omit it)
```

If no hw encoder: use the `hwdownload,format=bgra` + `libx264` software path below. If `gfxcapture`
is absent: fall back to `ddagrab` cropped to the target window's runtime-discovered rectangle.

**Browser capture** — Playwright `page.screencast` streams JPEG frames (`onFrame`, `quality:100`)
into ffmpeg; two-pass (pass 1 = fast intermediate so capture never falls behind realtime, pass 2 =
final H.264). Vendor the `playwright-recorder-plus` pattern (single-maintainer package — copy the
pattern, don't hard-depend). Re-encode to **constant fps** (25 or 30): CDP screencast is
paint-driven, so idle pages emit no frames and Remotion's fixed-fps timeline would otherwise drift.
Viewport `1920×1080`. Extensions (wallet) require `launchPersistentContext` + `channel:'chromium'`
**headed** (`headless:false`) — branded Chrome/Edge dropped side-load flags; MV2 is gone.

**Desktop capture (ddagrab)** — it is a `lavfi` **source filter**, not an input device:

```
# NVIDIA (zero-copy D3D11 → nvenc) — the -cq flag is nvenc-specific:
ffmpeg -f lavfi -i ddagrab=output_idx=<idx>:framerate=30 -c:v h264_nvenc -cq 18 scene.mp4
# Everyone else (Intel QSV, AMD AMF, or no hw encoder) — bring frames to system memory first
# (hwdownload,format=bgra is mandatory or encoding fails), then encode with your probed encoder:
ffmpeg -filter_complex "ddagrab=output_idx=<idx>:framerate=30,hwdownload,format=bgra" -c:v libx264 -crf 18 scene.mp4
#   …or after that hwdownload, swap the encoder + its own quality flag:
#     Intel:  -c:v h264_qsv -global_quality 18     AMD: -c:v h264_amf -qp_i 18 -qp_p 18
```

The nvenc line is **NVIDIA-only** — its `-cq` flag and direct D3D11 consumption don't transfer to
qsv/amf. On an Intel-iGPU or AMD machine use the `hwdownload,format=bgra` path (it works with
libx264 or, after the download, with h264_qsv/h264_amf using the flags shown). Discover `<idx>` at
runtime — never hardcode it; DPI scaling and multi-monitor setups shift it. (Same for the
`gfxcapture` hardware line: it emits D3D11 frames, so `hwdownload,format=bgra` before any non-nvenc
encoder.)

**Window capture (gfxcapture, ffmpeg 8.1+)** — capture ONLY the wallet popup / terminal window by
regex; it does not hold a stable fps, so add an `fps` filter:

```
ffmpeg -f lavfi -i "gfxcapture=window_title=<runtime-discovered popup title>:capture_cursor=1,fps=30,hwdownload,format=bgra" -c:v libx264 -crf 18 popup.mp4
```

Match the **dappwright-launched** browser/popup specifically — by the window title or the launched
process's PID discovered at runtime — never a bare `chrome`/`metamask` `window_exe` regex. A loose
regex can match the user's **personal** Chrome (their main wallet, mainnet balances, private tabs)
and record it into a frame; recording the wrong window is a secret leak, and the QC frame check is
only the backstop, not the primary guard. Never a hardcoded `hwnd`. Watch for the
Windows.Graphics.Capture yellow highlight border (`display_border` defaults off, but some Win11
builds enforce it) — the QC loop checks captured frames for it. **All native/window captures are
silent** — ffmpeg has no WASAPI loopback; narration is TTS added in Remotion.

**Audio-first scene timing** — measure each scene's TTS narration with the `mediabunny` package
(Remotion's `getAudioDurationInSeconds` is deprecated, and `getMediaMetadata` is a helper you
implement over mediabunny — it is NOT a `@remotion/media-utils` export, so don't import it from
there):

```ts
import { Input, ALL_FORMATS, UrlSource } from 'mediabunny'; // npm i mediabunny
const input = new Input({ source: new UrlSource(narrationUrl), formats: ALL_FORMATS });
const durationInSeconds = await input.computeDuration();
```

Embed recorded scene clips with `<Video>` from `@remotion/media` (auto-falls back to
`<OffthreadVideo>` during server render — keep the fallback enabled for VFR webm edge cases).

**Render** — always pass the composition id explicitly (else the CLI prompts, hanging automation);
output h264 (VP8/VP9 encode is very slow). Chrome Headless Shell auto-installs into node_modules:

```
npx remotion browser ensure          # one-time, deterministic first render
npx remotion benchmark               # find the right --concurrency once
npx remotion render src/index.ts <CompositionId> out/final.mp4 --codec=h264
```

QC renders at reduced resolution/quality to keep the loop fast; the final pass is 1080p.

**QC keyframes** — per-scene seeks so a frame maps deterministically to a script scene (≈0.5s each,
≈15s for a 30-scene pass on this machine — the batch `select`-filter is ~6s but loses the mapping):

```
ffmpeg -ss <scene_start_seconds> -i out/final.mp4 -frames:v 1 -q:v 2 qc/scene_<id>.jpg
```

The QC cost is the vision-model read of ~30 images, not ffmpeg. Read each frame: money shot visible,
text legible, captions present, no yellow capture border, no leaked secret/address that shouldn't be
on screen, duration within budget.

**Final loudness (two-pass EBU R128, YouTube target −14 LUFS)** — ffmpeg's default −24 is too quiet
for YouTube playback normalization:

```
# pass 1 — measure (parse the JSON block for measured_I / measured_LRA / measured_TP / measured_thresh):
ffmpeg -i out/final.mp4 -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null -
# pass 2 — apply with the measured values + linear=true:
ffmpeg -i out/final.mp4 -af loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=<mi>:measured_LRA=<ml>:measured_TP=<mtp>:measured_thresh=<mth>:linear=true -c:v copy out/final_normalized.mp4
```

Duck the music bed under narration BEFORE loudnorm (loudnorm won't fix a bad narration/music
balance).

## Windows bootstrap steps

- **Kokoro (default TTS):** create a **Python 3.10–3.12** venv (the `kokoro 0.9.4` package pins
  `<3.13`; a machine with only 3.13+ fails — provision a pinned interpreter, e.g. `uv venv --python
  3.12`), then `pip install kokoro soundfile`, and install the **espeak-ng Windows MSI** (the
  package needs it for phonemization). Use the PyTorch `KPipeline` (its `result.tokens` carry
  `start_ts`/`end_ts` for English) — not the ONNX build.
- **whisper.cpp (only for OpenAI-TTS / friend-VO):** install via `@remotion/install-whisper-cpp`
  pinned to whisper.cpp `1.5.5` with `tokenLevelTimestamps: true`, then `toCaptions()`.
- **Remotion:** `npx remotion browser ensure` once (fetches Chrome Headless Shell into node_modules).
- **dappwright:** at bootstrap, download and cache the pinned MetaMask `13.17.0` extension zip so a
  MetaMask release mid-campaign can't break the recording.
- **ffmpeg:** already on PATH here; portability fallback `winget install Gyan.FFmpeg`. Confirm it is
  `>=8.1` and that `gfxcapture` is compiled in (probe above) — else use the ddagrab-crop fallback.

## Upload paths (policy-verified; see PRD §5)

- **Default — consented browser upload to YouTube Studio (unlisted)** on the user's logged-in Chrome
  session. The YouTube Data API path is dead for a personal tool: uploads from unverified projects
  are locked private (no appeal). **Not ToS-clean** — YouTube's terms forbid automated access with
  no own-session carve-out; keep it low-volume, supervised, the user's own content, logged in the
  ledger, and authorized by the kickoff's UPLOAD field. Preflight the account's upload eligibility
  before spending render time; on any interstitial or Studio DOM drift, stop and hand off — never
  fight bot detection.
- **Programmatic fallback — Google Drive resumable upload** (`drive.file` scope, anyone-with-link).
  Non-restricted scope, so no app audit — but still a Google Cloud OAuth client whose Testing-mode
  refresh tokens **expire after 7 days**; design for re-consent per hackathon, not a cached-forever
  token.
