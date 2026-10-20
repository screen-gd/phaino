# Phaino

Phaino is an open-source AI video and image studio that runs locally on your machine, with generations through Comfy Cloud (or your own Comfy API v2 endpoint). Pick a preset, add a prompt and a first frame, and every shot runs through a real ComfyUI workflow you can open, edit and fork. The studio listens on `127.0.0.1` only. Social publishing and a hosted version are future work: [issue #4](https://github.com/screen-gd/phaino/issues/4) and [issue #5](https://github.com/screen-gd/phaino/issues/5).

## What's in it

- **Explore**: the home grid of all presets and categories.
- **Tools**: Camera moves, Image and Video tool pages bound to presets, with a live job runner: uploads, progress over SSE, cancel, and recent runs.
- **Presets and models**: open-weights presets in `presets/`:

  | Preset | Tool | Model |
  | --- | --- | --- |
  | bullet-time, crash-zoom, dolly-in, drone-pull-out, fpv-dive, orbit, whip-pan | Camera | LTX 2.5 |
  | ltx25-i2v | Video | LTX 2.5 |
  | wan22-i2v | Video | Wan 2.2 |
  | flux2-klein, flux2-klein-fast | Image | FLUX.2 Klein |
  | qwen-image | Image | Qwen Image |

  The Image and Video pickers list **models**, not presets, with search and family groups (FLUX, Qwen, Wan, LTX, ...). Each model's modes (text to video, image to video, first and last frame, text to image, edit) come from the registry in `studio/src/server/models/registry.ts`, which covers every open-weights model Comfy ships an official template for: FLUX.1/2/3 (Dev, Schnell, Krea, Kontext, Klein), Qwen Image (1, 2.1, 2511, 2512), Z-Image, HiDream (I1, O1, E1.1), SDXL, SD 3.5, Chroma, Anima, Mage-Flow, Ideogram 4, ERNIE, OmniGen2, Kandinsky 5, Wan 2.1/2.2 (+VACE, Alpha), LTXV/LTX 2/2.3, HunyuanVideo, MiniMax H3, FastH3, HuMo, Capybara and more. Template-backed modes are synced into `models/cache` by `pnpm models:sync` (see "Add a model" below); a mode that fails the gates stays hidden. Models that only edit or only take a first frame ask for that input and won't generate without it.

  Partner-model presets (Kling 3.0, Seedance 2.5, Nano Banana 2) ship in `presets/` but are hidden unless `PHAINO_PARTNER_MODELS=on`.

- **Library**: every generated output, downloadable or ready to edit.
- **Controls**: per-model Advanced params (negative prompt, steps, CFG) behind a sliders chip, plus a credit estimate next to Generate (median of your last runs at 0.266 credits/s).
- **Animate**: image results get an Animate action that starts an LTX 2.5 image-to-video job from that image.
- **Header**: GitHub stars and your Comfy credit balance, when connected.
- **Tracker**: `/tracker` shows what's done and what's next (data in `tracker/tasks.json`).

## Repository layout

```
phaino/
    studio/     Studio app (Next.js), the main product
    website/    Marketing site (Astro)
    presets/    Preset workflows, exported by the M2 pipeline
    tracker/    Project task data for /tracker
    brand/      Brand kits (brand/phaino)
    examples/   Real sample outputs, named <preset-id>_<n>.<ext>
```

## Requirements

- Node.js 22.13+
- pnpm (repo pins 12.x via `packageManager`)
- ffmpeg on your PATH

## Quick start

```bash
pnpm install
cp studio/.env.example studio/.env.local   # fill in a backend (below)
pnpm dev:studio
```

Open http://localhost:3000. Check backend connectivity at http://localhost:3000/api/health.

## Comfy Cloud setup

Create an API key at [platform.comfy.org/profile/api-keys](https://platform.comfy.org/profile/api-keys) and set it as `COMFY_API_KEY` in `studio/.env.local`, or paste it into Settings > Comfy Cloud. All built-in presets run on open-weights models on Comfy Cloud and need the model files listed in [presets/README.md](presets/README.md). Partner presets (Kling, Seedance, Nano Banana) run on hosted API nodes and use [Comfy credits](https://docs.comfy.org/tutorials/partner-nodes/pricing); they're hidden unless `PHAINO_PARTNER_MODELS=on`.

### Advanced: your own ComfyUI

To run on your own machine instead, put the Comfy API v2 in front of a local [ComfyUI](https://github.com/comfyanonymous/ComfyUI):

```bash
pip install comfy-api-proxy
comfy-api-proxy
```

ComfyUI keeps serving on `127.0.0.1:8188`; the proxy serves the Comfy API v2 on `127.0.0.1:8189`. Set `COMFY_BASE_URL=http://127.0.0.1:8189` in `studio/.env.local`.

## Environment variables

All variables live in `studio/.env.local` (copy `studio/.env.example`). The old `CUTAWAY_DATA_DIR` and `CUTAWAY_USER` names still work as fallbacks.

| Variable | Purpose |
| --- | --- |
| `COMFY_API_KEY` | Comfy Cloud / Comfy Router API key |
| `COMFY_BASE_URL` | Optional custom Comfy API v2 endpoint (blank = Comfy Cloud) |
| `PRESETS_DIR` | Preset folder (default `../presets` from `studio/`) |
| `FORKS_DIR` | User forks folder (default `<PHAINO_DATA_DIR>/forks`) |
| `PHAINO_PARTNER_MODELS` | Show partner-model presets (uses Comfy credits). Off by default |
| `TRACKER_FILE` | Tracker data file (default `../tracker/tasks.json` from `studio/`) |
| `PHAINO_DATA_DIR` | Local data folder (default `./.data` under `studio/`) |
| `PHAINO_USER` | Local user name (default `local`) |
| `PHAINO_SITE_URL` | Public origin for OG metadata (default `http://localhost:3000`) |
| `FFMPEG_PATH` | ffmpeg binary for sequence export (default `ffmpeg` on PATH) |
| `FFPROBE_PATH` | ffprobe binary for sequence export (default `ffprobe` on PATH) |

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev:studio` | Studio dev server on port 3000 |
| `pnpm dev:website` | Website dev server |
| `pnpm preview:website` | Serve the built website |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type-check all packages |
| `pnpm test` | Run all tests |
| `cd studio && pnpm models:sync` | Sync template-backed model modes into `models/cache` |

## Presets

Presets live in `presets/`, one folder per preset (`preset.json` + exported `workflow.json`/`workflow_api.json` + `thumb.webp`). Schema, binds and the model files each open preset needs are documented in [presets/README.md](presets/README.md).

### Dev: regenerating workflows

`workflow.json`/`workflow_api.json` are produced by loading each preset's source template into a ComfyUI instance and exporting via `graphToPrompt()`. A CPU-only install is enough; no models needed:

```bash
git clone --depth 1 --branch v0.42.1 https://github.com/comfyanonymous/ComfyUI.git %USERPROFILE%\.cutaway\comfyui
cd %USERPROFILE%\.cutaway\comfyui
python -m venv .venv
.\.venv\Scripts\pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\python main.py --cpu --listen 127.0.0.1 --port 8188
```

Then from the repo root: `pnpm --filter phaino-studio export:workflows`.

### Add a model

Models are one line in `studio/src/server/models/registry.ts`: a mode points at a preset folder or an official `Comfy-Org/workflow_templates` template:

```ts
{ id: "wan22", label: "Wan 2.2", kind: "video",
  modes: { t2v: { template: "video_wan2_2_14B_t2v" } } }
```

Then sync the template-backed modes (fetches the template at the pinned `TEMPLATES_REF`, runs `graphToPrompt` in a headless ComfyUI, detects prompt/seed/size/duration/image binds automatically, gates on no-API-nodes + public model downloads, and writes `models/cache` + `models/manifest.json`):

```bash
cd studio
pnpm models:sync            # use the pinned ref
pnpm models:sync -- --update-ref   # pin main's sha first
```

Sync reads only; it never queues a generation. A mode that fails a gate stays in the manifest with its reasons and is hidden from the app.

## Editor

`/editor` is a small timeline editor for generated and imported media. It has a video lane with trim, reorder, split (S), duplicate (Ctrl+D), cut/crossfade/dip transitions and per-clip volume, a music lane with fades, a titles lane, aspect (16:9, 9:16, 1:1, 4:5) and contain/cover fitting, a media bin with drag-drop uploads, and undo/redo.

"Render video" produces an H.264/AAC MP4 (drawtext titles, mixed audio, `+faststart`), and copies it into Library. "Export for NLE" conforms media with handles, writes FCPXML and EDL (crossfades become dissolves), and embeds the rendered movie. The audio lane and titles are not in the FCPXML/EDL interchange files. Title text uses the bundled Outfit font (`studio/assets/fonts/Outfit.ttf`, OFL). The sequence document lives at `<PHAINO_DATA_DIR>/sequence.json` (v2; v1 files migrate on load) and uploads land in `<PHAINO_DATA_DIR>/uploads/editor/`.

## Edit Video

`/edit` is the AI editing bench: each tool takes an existing video (upload or a generated output) and runs one official ComfyUI template: Upscale, Upscale Fast, FPS Boost, Depth Map, Reframe (VACE outpainting to a new aspect), Remove Object (VACE inpainting + SAM3 detect text), Relight and Restyle. Extend is app code: it grabs the clip's last frame with ffmpeg and runs any registered model's image-to-video mode, and the result can join the source in the Editor.

`pnpm models:sync` gates tools exactly like modes (`manifest.json` `tools` key) and caches their workflows; failed tools stay hidden. Clips longer than a tool's limit are trimmed to the first N seconds (H.264 re-encode) before submission. Video uploads land in `<PHAINO_DATA_DIR>/uploads/` (mp4/mov/webm, 500 MB).

## Marketing site

Astro, TypeScript and Tailwind. `pnpm dev:website` runs it; it deploys from `website/`. The visual direction is in [website/docs/landing-design.md](website/docs/landing-design.md), and media slots are documented in [website/public/media/README.md](website/public/media/README.md).

## Brand

Brand assets and the guidelines board live in [brand/phaino](brand/phaino/board/guidelines.md).

## Roadmap

The camera moves, image and video tools, job runner, library and editor are built. Social publishing moved to [issue #4](https://github.com/screen-gd/phaino/issues/4); a hosted version is tracked in [issue #5](https://github.com/screen-gd/phaino/issues/5). The live list is at `/tracker`; the data is in [tracker/tasks.json](tracker/tasks.json).

## License

[MIT](LICENSE)
