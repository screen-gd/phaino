# Security model: phaino

Threat model used by the security scan profile `screen-gd threat-modeled security scan`. Component names below are the ones findings are tagged with; keep them stable. Built from the code and the owner's answers on 2026-10-30.

## System overview and trust boundaries
Next.js app (`studio/`) listening on `127.0.0.1` only (`next start -H 127.0.0.1`), file-backed state in `PHAINO_DATA_DIR` (`.data`), presets/workflows from `presets/`, generations through Comfy Cloud or a user-configured Comfy API endpoint (`COMFY_API_KEY`, `COMFY_BASE_URL`), optional Zernio key for social posting (`studio/src/server/social/zernio.ts`), local MCP server at `/api/mcp` (host/origin checked), ffmpeg/ffprobe subprocesses. A hosted read-only demo (app.phaino.us.ci) runs with `proxy.ts` demo mode blocking writes. Astro marketing site in `website/` on Cloudflare.

## Components
- **phaino studio UI**: `studio/src/app` (pages), `studio/src/components`, `studio/src/lib`.
- **phaino studio API**: `studio/src/app/api/*` and `studio/src/server/*` (jobs, uploads, outputs, forks, presets, sequence, edits, exports, tracker).
- **phaino Comfy integration**: `studio/src/server/comfy/*`, `studio/src/server/router`, `studio/src/server/kawarimi`, `studio/src/server/models`.
- **phaino social and MCP**: `studio/src/server/social`, `studio/src/server/mcp`, `studio/src/app/api/mcp`.
- **phaino demo mode**: `studio/src/proxy.ts`, `studio/src/lib/demo*`.
- **phaino website**: `website/`.

## Entry points
- Local browser -> studio API on 127.0.0.1 (any process or site on the same machine can reach it; relies on same-origin policy and `/api/mcp` host/origin checks).
- MCP clients (local agents) -> `/api/mcp`.
- Hosted demo: anonymous internet users (GET only).
- Outbound: Comfy Cloud, user's Comfy endpoint, GitHub API, Zernio.

## Assets
- Comfy API key and Zernio key (stored in the data dir / env).
- User's local files: uploads, outputs, forks, exports; file paths used by `outputs/[...path]`, `exports/[id]/[...file]`, `uploads` (path traversal, arbitrary read/write).
- Comfy credits (job submission = spend).
- Workflow JSON executed by ComfyUI (user-editable; forks).

## Attackers
- Malicious website in the same browser (CSRF / DNS rebinding against localhost API, reading outputs or triggering jobs).
- Malicious preset/workflow or model-registry input (file injection, command injection via ffmpeg args).
- Anonymous user against the hosted demo (information disclosure, write bypass of demo proxy).
- Other local users on a shared machine.

## Existing controls
Loopback bind; demo proxy blocks non-GET and masks credentials; MCP route host/origin allowlist; zod env validation; HTTP(S)-only Comfy base URL.

## Owner priorities
- Currently local-only; a hosted multi-user model is a future plan. Threats that assume a hosted deployment are future work, not current risk.

## Out of scope / accepted risk
- Demo mode (`studio/src/proxy.ts`, `studio/src/lib/demo*`), tracker (`tracker/`, `/tracker` route) and website (`website/`) are out of scope.

## Open questions
- When the hosted model ships, which users share one studio instance (per-user data dir vs shared)?
