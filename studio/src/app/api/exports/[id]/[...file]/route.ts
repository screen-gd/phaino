import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { SocialError } from "@opencoredev/social-sdk";
import { getEnv } from "@/server/env";
import { getStore } from "@/server/jobs/store";
import { socialErrorResponse } from "@/server/social/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".fcpxml": "text/xml",
  ".edl": "text/plain",
  ".txt": "text/plain",
};

function notFound(): SocialError {
  return new SocialError({
    code: "not_found",
    operation: "exports.read",
    message: "Export file not found",
  });
}

/** Download one file from an export bundle. Only names in the job's outputs. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; file: string[] }> },
) {
  try {
    const { id, file } = await params;
    const job = getStore().get(id);
    if (!job || job.category !== "export") throw notFound();
    const rel = file.join("/");
    const outputs = job.outputs ?? [];
    const allowed = outputs.includes(rel);
    if (!allowed || rel.includes("..") || rel.includes("\\") || path.isAbsolute(rel)) {
      throw notFound();
    }
    const base = path.join(getEnv().dataDir, "exports", id);
    const absPath = path.resolve(base, rel);
    if (!absPath.startsWith(path.resolve(base) + path.sep)) throw notFound();
    let size: number;
    try {
      size = (await stat(absPath)).size;
    } catch {
      throw notFound();
    }
    const stream = Readable.toWeb(
      createReadStream(absPath),
    ) as ReadableStream<Uint8Array>;
    return new Response(stream, {
      headers: {
        "Content-Type": MIME[path.extname(rel).toLowerCase()] ?? "application/octet-stream",
        "Content-Length": String(size),
        "Content-Disposition": `attachment; filename="${path.basename(rel)}"`,
      },
    });
  } catch (err) {
    return socialErrorResponse(err);
  }
}
