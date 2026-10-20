import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { SocialError } from "@opencoredev/social-sdk";
import { getEnv } from "@/server/env";
import { layout, mediaFor } from "@/server/sequence/model";
import { getSequenceStore, resolveMediaPath } from "@/server/sequence/store";
import { socialErrorResponse } from "@/server/social/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

async function getMedia(id: string) {
  const seq = await getSequenceStore().getSequence();
  const m = mediaFor(seq, id);
  if (!m) {
    throw new SocialError({
      code: "not_found",
      operation: "sequence.media",
      message: "Media not found",
    });
  }
  return m;
}

/** Parse a single "bytes=start-end" range, or "open-ended" start-only. */
function parseRange(
  header: string,
  size: number,
): { start: number; end: number } | "unsatisfiable" | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  if (match[1] === "" && match[2] === "") return null;
  let start: number;
  let end: number;
  if (match[1] === "") {
    const suffix = Number(match[2]);
    if (suffix === 0) return "unsatisfiable";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Number(match[2]);
  }
  if (start >= size || start > end) return "unsatisfiable";
  return { start, end: Math.min(end, size - 1) };
}

/** Stream a media file for the player and media bin (with byte ranges). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const media = await getMedia(id);
    const resolved = resolveMediaPath(getEnv().dataDir, media.path);
    let size: number;
    try {
      size = (await stat(resolved.absPath)).size;
    } catch {
      throw new SocialError({
        code: "not_found",
        operation: "sequence.media",
        message: "Media file not found",
      });
    }
    const mime =
      MIME[path.extname(resolved.absPath).toLowerCase()] ??
      "application/octet-stream";

    const rangeHeader = request.headers.get("range");
    const range = rangeHeader ? parseRange(rangeHeader, size) : null;
    if (range === "unsatisfiable") {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    if (range) {
      const stream = Readable.toWeb(
        createReadStream(resolved.absPath, {
          start: range.start,
          end: range.end,
        }),
      ) as ReadableStream<Uint8Array>;
      return new Response(stream, {
        status: 206,
        headers: {
          "Content-Type": mime,
          "Content-Length": String(range.end - range.start + 1),
          "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, max-age=60",
        },
      });
    }
    const stream = Readable.toWeb(
      createReadStream(resolved.absPath),
    ) as ReadableStream<Uint8Array>;
    return new Response(stream, {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    return socialErrorResponse(err);
  }
}

/** Remove the media and every clip referencing it. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const store = getSequenceStore();
    const sequence = await store.removeMedia(id);
    return NextResponse.json({ sequence, layout: layout(sequence) });
  } catch (err) {
    return socialErrorResponse(err);
  }
}
