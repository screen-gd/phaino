import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { SocialError } from "@opencoredev/social-sdk";
import { getEnv } from "@/server/env";
import { socialErrorResponse } from "@/server/social/errors";
import { resolveOutput } from "@/server/social/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stream one generated output file for previews, resolved inside outputs/. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: segments } = await params;
    const resolved = resolveOutput(getEnv().dataDir, segments.join("/"));
    let size: number;
    try {
      size = (await stat(resolved.absPath)).size;
    } catch {
      throw new SocialError({
        code: "not_found",
        operation: "outputs.read",
        message: "Output file not found",
      });
    }
    const stream = Readable.toWeb(
      createReadStream(resolved.absPath),
    ) as ReadableStream<Uint8Array>;
    return new Response(stream, {
      headers: {
        "Content-Type": resolved.mimeType,
        "Content-Length": String(size),
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    return socialErrorResponse(err);
  }
}
