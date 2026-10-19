# Cutaway

Cutaway is an open-source studio for images and video built on the [Comfy Developer Platform](https://comfy.org). Every preset is a real ComfyUI workflow you can open, edit and fork. It runs on Comfy Cloud, or on any Comfy API v2 endpoint you point it at (including your own ComfyUI); open models (LTX 2.5, FLUX.2) are the defaults, and partner models are available through Comfy Router.

## Repository layout

```
cutaway/
├── studio/     Studio app (Next.js), the main product
├── website/    Marketing site (Astro)
├── presets/    Preset workflows, added with M2
├── examples/   Real sample outputs, named <preset-id>_<n>.<ext>
```

## Requirements

- Node.js 22+
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

Create an API key at [platform.comfy.org/profile/api-keys](https://platform.comfy.org/profile/api-keys) and set it as `COMFY_API_KEY` in `studio/.env.local`. Comfy Cloud API access requires a paid Comfy Cloud subscription, and Comfy Router calls draw Comfy credits.

### Advanced: your own ComfyUI

To run on your own machine instead, put the Comfy API v2 in front of a local [ComfyUI](https://github.com/comfyanonymous/ComfyUI):

```bash
pip install comfy-api-proxy
comfy-api-proxy
```

ComfyUI keeps serving on `127.0.0.1:8188`; the proxy serves the Comfy API v2 on `127.0.0.1:8189`. Set `COMFY_BASE_URL=http://127.0.0.1:8189` in `studio/.env.local`.

Model files required by each preset: added with the first preset.

## Environment variables

All variables live in `studio/.env.local` (copy `studio/.env.example`).

| Variable | Purpose |
| --- | --- |
| `COMFY_API_KEY` | Comfy Cloud / Comfy Router API key |
| `COMFY_BASE_URL` | Optional custom Comfy API v2 endpoint (blank = Comfy Cloud) |
| `PRESETS_DIR` | Preset folder (default `../presets` from `studio/`) |
| `FORKS_DIR` | User forks folder (default `../forks` from `studio/`) |
| `CUTAWAY_DATA_DIR` | Local data folder (default `./.data` under `studio/`) |
| `CUTAWAY_USER` | Local user name (default `local`) |

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

Presets live in `presets/`, one folder per preset (`preset.json` + exported `workflow.json`/`workflow_api.json` + `thumb.webp`). Schema, binds and the model files each family needs are documented in [presets/README.md](presets/README.md).

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

Then from the repo root: `pnpm --filter cutaway-studio export:workflows`.

## Marketing site

Astro, TypeScript and Tailwind. `pnpm dev:website` runs it; it deploys from `website/`. The visual direction is in [website/docs/landing-design.md](website/docs/landing-design.md), and media slots are documented in [website/public/media/README.md](website/public/media/README.md).

## Roadmap

- [x] M1 Shell, env, Comfy client, health check
- [x] M2 Disk-based preset system
- [ ] M3 Camera and Image tools
- [ ] M4 Open the workflow: viewer, fork, download
- [ ] M5 First real run: Orbit on LTX 2.5
- [ ] M6 FLUX image and Animate to Video
- [ ] M7 Partner models via Comfy Router
- [ ] M8 Export: conform, FCPXML, EDL

## License

[MIT](LICENSE)
