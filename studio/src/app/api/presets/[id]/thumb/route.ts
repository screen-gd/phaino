import fs from "node:fs";
import { Readable } from "node:stream";
import { getEnv } from "@/server/env";
import { resolveThumbPath } from "@/server/presets/load";

export const runtime = "nodejs";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Serve the preset's thumb.webp (built-in or fork). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!SLUG.test(id)) {
    return new Response("Invalid preset id", { status: 400 });
  }
  const file = resolveThumbPath(id, getEnv());
  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) throw new Error("not a file");
    const stream = Readable.toWeb(fs.createReadStream(file)) as ReadableStream;
    return new Response(stream, {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(stat.size),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
