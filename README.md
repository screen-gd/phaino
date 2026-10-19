# Phaino

Phaino is an open-source AI video and image studio on Comfy Cloud. Pick a preset, add a prompt and a first frame, and every shot runs through a real ComfyUI workflow you can open, edit and fork.

## What's in it

- **Explore**: the home grid of all presets and categories.
- **Tools**: Camera moves, Image and Video tool pages bound to presets, with a live job runner: uploads, progress over SSE, cancel, and recent runs.
- **Presets and models**: 15 presets in `presets/`:

  | Preset | Tool | Model | License |
  | --- | --- | --- | --- |
  | bullet-time, crash-zoom, dolly-in, drone-pull-out, fpv-dive, orbit, whip-pan | Camera | LTX 2.5 | Open |
  | ltx25-i2v | Video | LTX 2.5 | Open |
  | wan22-i2v | Video | Wan 2.2 | Open |
  | kling3-video | Video | Kling 3.0 | Partner |
  | seedance25-i2v | Video | Seedance 2.5 | Partner |
  | flux2-klein, flux2-klein-fast | Image | FLUX.2 Klein | Open |
  | qwen-image | Image | Qwen Image | Open |
  | nano-banana-2 | Image | Nano Banana 2 | Partner |

- **Library**: every generated output, shareable to social.
- **Social posting**: user-added connections (managed services or direct API keys) publish outputs to YouTube, Instagram, X, LinkedIn, TikTok, Threads and Bluesky.
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

Create an API key at [platform.comfy.org/profile/api-keys](https://platform.comfy.org/profile/api-keys) and set it as `COMFY_API_KEY` in `studio/.env.local`. Partner presets (Kling, Seedance, Nano Banana) run on hosted API nodes and use [Comfy credits](https://docs.comfy.org/tutorials/partner-nodes/pricing); open presets run on Comfy Cloud and need the model files listed in [presets/README.md](presets/README.md).

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
| `FORKS_DIR` | User forks folder (default `../forks` from `studio/`) |
| `TRACKER_FILE` | Tracker data file (default `../tracker/tasks.json` from `studio/`) |
| `PHAINO_DATA_DIR` | Local data folder (default `./.data` under `studio/`) |
| `PHAINO_USER` | Local user name (default `local`) |
| `PHAINO_SITE_URL` | Public origin for OG metadata (default `http://localhost:3000`) |

## Social posting

Open the studio's Settings, scroll to Social accounts and choose "Add connection". Supported providers: Zernio, Post for Me and PostFast (managed services that own the platform connections), plus direct X, Bluesky, YouTube, LinkedIn, Threads and Instagram accounts. TikTok works through the managed services only. Connection credentials are stored locally in `studio/.data`. Once connected, share generated shots from Library or a finished run.

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

## Marketing site

Astro, TypeScript and Tailwind. `pnpm dev:website` runs it; it deploys from `website/`. The visual direction is in [website/docs/landing-design.md](website/docs/landing-design.md), and media slots are documented in [website/public/media/README.md](website/public/media/README.md).

## Brand

Brand assets and the guidelines board live in [brand/phaino](brand/phaino/board/guidelines.md).

## Roadmap

The camera moves, image and video tools, job runner, library and social posting are built. Next up: workflow viewer and forking (M4), the first real run on Comfy Cloud (M5), and export to FCPXML/EDL (M8). The live list is at `/tracker`; the data is in [tracker/tasks.json](tracker/tasks.json).

## License

[MIT](LICENSE)
