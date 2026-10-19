import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { getEnv } from "@/server/env";

export const runtime = "nodejs";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Serve `<PRESETS_DIR>/<id>/thumb.webp`. The slug shape alone blocks traversal. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!SLUG.test(id)) {
    return new Response("Invalid preset id", { status: 400 });
  }

  const presetsDir = path.resolve(getEnv().presetsDir);
  const file = path.resolve(presetsDir, id, "thumb.webp");
  if (!file.startsWith(presetsDir + path.sep)) {
    return new Response("Invalid preset id", { status: 400 });
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
