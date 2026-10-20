import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { ApiError } from "@/server/errors";
import { getEnv } from "@/server/env";
import { apiError } from "@/server/errors";
import { resolveOutput } from "@/server/outputs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Parse a single "bytes=start-end" range, or "open-ended" start-only. */
function parseRange(
  header: string,
  size: number,
): { start: number; end: number } | "unsatisfiable" | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) return null;
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

/** Stream one generated output file for previews, resolved inside outputs/. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: segments } = await params;
    const resolved = resolveOutput(getEnv().dataDir, segments.join("/"));
    let size: number;
    try {
      size = (await stat(resolved.absPath)).size;
    } catch {
      throw new ApiError({
        code: "not_found",
        operation: "outputs.read",
        message: "Output file not found",
      });
    }

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
          "Content-Type": resolved.mimeType,
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
        "Content-Type": resolved.mimeType,
        "Content-Length": String(size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
