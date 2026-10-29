import { createReadStream } from "node:fs";
import { rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { ApiError } from "@/server/errors";
import { getEnv } from "@/server/env";
import { apiError } from "@/server/errors";
import { resolveOutput } from "@/server/outputs";
import { makePoster } from "@/server/sequence/probe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Concurrent poster renders for the same file share one ffmpeg run.
const posterJobs = new Map<string, Promise<void>>();
// Videos that failed to render, keyed by poster path, until their mtime changes.
const posterMisses = new Map<string, number>();

const POSTER_CONCURRENCY = 2;
let rendersRunning = 0;
const renderQueue: (() => void)[] = [];

/** Take one of the ffmpeg render slots; at most two run at once. */
async function acquireRender(): Promise<() => void> {
  if (rendersRunning >= POSTER_CONCURRENCY) {
    await new Promise<void>((resolve) => renderQueue.push(resolve));
  }
  rendersRunning++;
  return () => {
    rendersRunning--;
    renderQueue.shift()?.();
  };
}

/** Render a poster to a temp file, then move it into place. */
async function renderPosterOnce(
  absPath: string,
  file: string,
): Promise<void> {
  const release = await acquireRender();
  // ffmpeg picks the muxer from the output extension, so the temp name
  // still ends in .jpg.
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp.jpg`;
  try {
    try {
      await makePoster(absPath, tmp, 0.5);
    } catch {
      await makePoster(absPath, tmp, 0);
    }
    await rename(tmp, file);
  } catch (err) {
    await unlink(tmp).catch(() => {});
    throw err;
  } finally {
    release();
  }
}

/** A cached 480px jpeg poster for a video output, rendered on demand. */
async function posterFile(
  dataDir: string,
  relPath: string,
  absPath: string,
  videoMtimeMs: number,
): Promise<string> {
  const file = path.join(dataDir, "posters", "outputs", `${relPath}.jpg`);
  // A running render for this file decides the cache state; wait it out.
  const inFlight = posterJobs.get(file);
  if (inFlight) await inFlight;
  if (posterMisses.get(file) === videoMtimeMs) {
    throw new ApiError({
      code: "not_found",
      operation: "outputs.poster",
      message: "Poster not available",
    });
  }
  const stale = await stat(file).then(
    (s) => s.mtimeMs < videoMtimeMs,
    () => true,
  );
  if (stale) {
    let job = posterJobs.get(file);
    if (!job) {
      job = renderPosterOnce(absPath, file)
        .catch((err) => {
          posterMisses.set(file, videoMtimeMs);
          throw err;
        })
        .finally(() => posterJobs.delete(file));
      posterJobs.set(file, job);
    }
    await job;
  }
  return file;
}

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
    const env = getEnv();
    const relPath = segments.join("/");
    const resolved = resolveOutput(env.dataDir, relPath);
    let meta;
    try {
      meta = await stat(resolved.absPath);
    } catch {
      throw new ApiError({
        code: "not_found",
        operation: "outputs.read",
        message: "Output file not found",
      });
    }
    const size = meta.size;

    if (
      new URL(request.url).searchParams.get("poster") === "1" &&
      resolved.mimeType.startsWith("video/")
    ) {
      const file = await posterFile(
        env.dataDir,
        relPath,
        resolved.absPath,
        meta.mtimeMs,
      ).catch(() => {
        throw new ApiError({
          code: "not_found",
          operation: "outputs.poster",
          message: "Poster not available",
        });
      });
      const posterSize = (await stat(file)).size;
      const stream = Readable.toWeb(
        createReadStream(file),
      ) as ReadableStream<Uint8Array>;
      return new Response(stream, {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": String(posterSize),
          "Cache-Control": "private, max-age=60",
        },
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
