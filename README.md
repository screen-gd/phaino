# Cutaway

## Repository layout

This is a pnpm workspace. The studio app lives at the repo root; the marketing site is its own package in `website/`.

```
cutaway/
├── (root)       Studio app, deployed from the repo root
└── website/     Marketing site (Astro), deployed from website/
```

Install everything once from the root with `pnpm install`.

## Marketing site

Astro, TypeScript, Tailwind, GSAP and Lenis. From the root:

```bash
pnpm website:dev       # dev server
pnpm website:build     # type check + static build to website/dist
pnpm website:preview   # serve the build
```

To host it, point the platform at `website/` as the root directory (build `pnpm build`, output `dist`). The visual direction is in [website/docs/landing-design.md](website/docs/landing-design.md), and media slots are documented in [website/public/media/README.md](website/public/media/README.md).

## Studio concept

**Drop in a clip, pick a cinematic move, get a matched shot that's ready for your timeline.**

Cutaway is an editor-first VFX shot generator built on [ComfyUI](https://comfy.org) and **LTX 2.5**. Upload a clip, choose a preset (dolly-in, orbit, whip-pan, drone pull-out...), and Cutaway generates a new shot that matches your footage, conformed to your project's frame rate and resolution, with handles, plus an FCPXML/EDL you can import straight into DaVinci Resolve, Premiere, or Final Cut.

Built for editors, not prompt engineers.

> Entry for Comfy's **Open Source Higgsfield** challenge (Oct 2026).

---

## Why

Generative video tools hand you a clip and leave the rest to you: guessing the frame rate, re-timing, trimming, and dragging files into your NLE. Cutaway closes that gap. Every output comes back ready to drop on a timeline.

## Presets

| Preset | What it does |
| --- | --- |
| Dolly-in | Slow push toward the subject |
| Crash zoom | Fast punch-in for impact |
| Orbit | Camera arcs around the subject |
| Whip-pan transition | Motion-blurred pan into the next shot |
| Drone pull-out | Rising reveal away from the subject |
| Bullet time | Freeze-frame with a camera move around it |
| Set extension | Widen the frame beyond what was shot |
| Match cut | Uses two clips' frames as first/last keyframes to bridge them |

## How it works

```
clip ──► ffmpeg (frame grab + metadata)
     ──► optional keyframe edit (FLUX)
     ──► LTX 2.5 FLF2V / I2V with preset prompt  (ComfyUI workflow)
     ──► conform fps / resolution, add handles (ffmpeg)
     ──► MP4 / ProRes + FCPXML / EDL
```

- **ComfyUI workflows** live in `workflows/` and run through the Comfy Developer Platform API or a local ComfyUI server.
- **Web app** (`app/`) is Next.js: upload, preset picker, preview, export.
- **Conform + export** (`lib/`) handles ffmpeg and timeline files.

## Project layout

```
cutaway/
├── app/          Next.js front end (upload, presets, preview, export)
├── workflows/    ComfyUI workflow JSON, one per preset
├── lib/          ffmpeg conform + FCPXML/EDL export
├── presets/      preset definitions (prompts, motion params, duration)
├── docs/         demo notes and screenshots
└── website/      marketing site (Astro)
```

## Setup

> Work in progress. Steps will firm up as the build lands.

**Requirements**
- Node.js 22+ and pnpm
- ffmpeg on your PATH
- A ComfyUI server with LTX 2.5 installed, **or** a Comfy Developer Platform API key

```bash
git clone https://github.com/screen-gd/cutaway.git
cd cutaway
cp .env.example .env.local   # add COMFY_API_URL and COMFY_API_KEY
pnpm install
pnpm dev
```

Open http://localhost:3000, upload a clip, pick a preset, and export.

## Roadmap

- [ ] Base LTX 2.5 I2V workflow (dolly-in)
- [ ] Remaining presets
- [ ] Upload + preset picker UI
- [ ] ffmpeg conform with handles
- [ ] FCPXML / EDL export (Resolve-tested)
- [ ] Share-ready before/after clip export
- [ ] Demo video

## License

[MIT](LICENSE)
