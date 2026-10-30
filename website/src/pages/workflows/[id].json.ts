import { readFileSync } from 'node:fs';
import type { APIRoute, GetStaticPaths } from 'astro';
import { catalogue, workflowPath } from '../../data/presets';

/** Generate static downloads from the studio's real ComfyUI workflow files. */
export const getStaticPaths = (() =>
  catalogue.map((preset) => ({ params: { id: preset.file } }))
) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const preset = catalogue.find((entry) => entry.file === params.id);
  if (!preset) return new Response('Workflow not found', { status: 404 });
  return new Response(readFileSync(workflowPath(preset), 'utf8'), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
