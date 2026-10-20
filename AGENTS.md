# AGENTS.md

## Layout

- `studio/` — the Phaino app (Next.js, Tailwind v4, coss UI). All app code lives in `studio/src`.
- `presets/` — one folder per preset (`preset.json`, `workflow.json`, `workflow_api.json`, `thumb.webp`). Exported via `studio/scripts/export-workflows.ts`.
- `tracker/tasks.json` — project task data, rendered at `/tracker` in the app.
- `brand/phaino/` — brand kit assets and `board/guidelines.md`.

## Verify

In `studio/`: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Tracker

Update `tracker/tasks.json` (status and `updated`) whenever you finish, start or block a task; view it at `/tracker`.

## Preferences

- True black UI (`#000` canvas), orange accent `#FF5B22`.
- No em dashes. Minimal text. No eyebrow labels or slogans.
- pwsh on Windows.
- No browser testing unless asked.
