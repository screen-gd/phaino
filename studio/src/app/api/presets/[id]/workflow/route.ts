import fs from "node:fs";
import path from "node:path";
import { getEnv } from "@/server/env";
import { resolvePresetDir } from "@/server/presets/load";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Download the preset's workflow: `?format=ui` (default) is the ComfyUI
 * graph JSON, `?format=api` is the flattened API prompt. 404 for hidden or
 * missing presets.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format") === "api"
    ? "api"
    : "ui";
  const dir = resolvePresetDir(id, getEnv());
  if (!dir) {
    return new Response("Not found", { status: 404 });
  }
  const file = path.join(dir, format === "api" ? "workflow_api.json" : "workflow.json");
  if (!fs.existsSync(file)) {
    return new Response("Not found", { status: 404 });
  }
  const body = fs.readFileSync(file);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${id}${format === "api" ? "_api" : ""}.json"`,
      "Content-Length": String(body.length),
    },
  });
}
