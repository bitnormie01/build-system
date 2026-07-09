# Music Kit — pre-cleared demo-video background tracks

The `demo-studio` seat optionally lays a music bed under the narration. Music can't be fetched at
render time: the good sources either have no API or block bots, and the license minefield (NC
tracks, YouTube-only clearances) makes live download unsafe for an autonomous agent. So this file is
a **curated manifest** of tracks whose licenses are known-safe, and the actual MP3s live in a local
machine folder assembled once. Metadata only here — **no audio binaries in any repo**, same rule as
`faucets/` (public facts, not payloads).

## Why a manifest, not live download (verified — PRD §13 row 27)

- **YouTube Audio Library:** Studio-only, no API; standard-license tracks are cleared for *YouTube
  videos only* — unsafe if the submission also lands on Dorahacks/IPFS/a project site.
- **Pixabay:** great license (commercial OK, no attribution), but the API has no music endpoint and
  the site 403s non-browser fetchers.
- **FMA:** mixed licenses including Non-Commercial — and a hackathon prize submission plausibly
  counts as commercial. Per-track checking mandatory; a poor default for automation.
- **Incompetech (Kevin MacLeod):** CC-BY 4.0, **direct MP3 URLs** (scriptable), stable license — the
  most automation-friendly source. Requires an attribution line the uploader appends to the video
  description. This is the recommended default source.

Prefer **cross-platform-safe** licenses (CC-BY, Pixabay) over YouTube-only tracks so the same video
can be posted anywhere the submission needs it.

## The local folder

MP3s live at `~/.build-system/music-kit/` (`%USERPROFILE%\.build-system\music-kit\` on Windows),
**never in a repo**. It is assembled **once**, via a consented download session (a gate-concierge-
style consent, or the user drops files in manually), from the URLs in the manifest below. The
demo-studio session reads local files by the manifest's `file` name; if a track is listed but the
local file is missing, it reports the gap and either downloads it (with consent) or falls back to
captions-only.

## Manifest format

One `##` block per track. **Public facts only** — never invent a track, URL, or license; verify each
entry's URL and license live before first use (links and license terms drift). Fields:

- **file** — the local filename under `~/.build-system/music-kit/`.
- **title / artist** — for the attribution line.
- **source URL** — where the MP3 is downloaded from (direct link if the source allows).
- **license** — exact license (e.g. `CC-BY-4.0`, `Pixabay Content License`), plus cross-platform-safe
  yes/no.
- **attribution** — the exact credit string to append to the video description, or `none required`.
- **mood / tempo** — so the script can pick a fit (e.g. `upbeat / 120bpm`, `ambient / calm`).
- **verified** — date the URL + license were last confirmed live.

## Seed entries (VERIFY before first use — not yet confirmed on this machine)

> These are starting points from the research, not confirmed downloads. Confirm the live URL and the
> current license text before relying on any of them, then stamp `verified`. Add entries as you
> clear more tracks (a kit-side commit, like adding a faucet).

## <Incompetech track — pick one, e.g. an upbeat corporate/tech cue>

- **file:** `<slug>.mp3`
- **title / artist:** `<Track Title>` / Kevin MacLeod
- **source URL:** `https://incompetech.com/music/royalty-free/` (browse; each track has a direct MP3 link)
- **license:** CC-BY-4.0 — cross-platform-safe: yes
- **attribution:** `"<Title>" Kevin MacLeod (incompetech.com) — Licensed under Creative Commons: By Attribution 4.0` (append to the video description)
- **mood / tempo:** `<upbeat / ~120bpm>`
- **verified:** `<YYYY-MM-DD — confirm before use>`

## <Pixabay track — optional, no-attribution option>

- **file:** `<slug>.mp3`
- **title / artist:** `<Track>` / `<Artist>`
- **source URL:** `https://pixabay.com/music/` (download requires the user's browser — site 403s bots; grab once via a consented session)
- **license:** Pixabay Content License — cross-platform-safe: yes; attribution: none required
- **mood / tempo:** `<ambient / calm>`
- **verified:** `<YYYY-MM-DD — confirm before use>`

## Assembly protocol

1. demo-studio's script (or the user) picks a track by mood from this manifest.
2. If the local file is present, use it. If missing, download from the `source URL` — Incompetech's
   direct MP3 links are scriptable; Pixabay/YouTube-Library need a consented browser session (they
   block bots / are Studio-only). This download is its own consent, like any concierge gate.
3. The uploader **auto-appends the `attribution` line** to the video description for every CC-BY /
   CC track used. A track whose attribution can't be honored (e.g. can't edit the description on the
   chosen host) must not be used.
4. Default is **music off** (captions-only) unless the kickoff's MUSIC field opts in — demo videos
   are often watched muted and the licensing surface is smaller without it.
