import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { SocialError } from "@opencoredev/social-sdk";
import { getEnv } from "@/server/env";
import { socialErrorResponse } from "@/server/social/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POSTER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Serve a clip poster jpeg: ${dataDir}/posters/<uuid>.jpg. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!POSTER_ID.test(id)) {
      throw new SocialError({
        code: "not_found",
        operation: "sequence.poster",
        message: "Poster not found",
      });
    }
    const absPath = path.join(getEnv().dataDir, "posters", `${id}.jpg`);
    let size: number;
    try {
      size = (await stat(absPath)).size;
    } catch {
      throw new SocialError({
        code: "not_found",
        operation: "sequence.poster",
        message: "Poster not found",
      });
    }
    const stream = Readable.toWeb(
      createReadStream(absPath),
    ) as ReadableStream<Uint8Array>;
    return new Response(stream, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(size),
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    return socialErrorResponse(err);
  }
}
