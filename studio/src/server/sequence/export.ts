import "server-only";

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { SocialError } from "@opencoredev/social-sdk";
import { getEnv, type StudioEnv } from "@/server/env";
import { emitJob } from "@/server/jobs/runner";
import { getStore, type JobRecord, type JobStore } from "@/server/jobs/store";
import {
  handlesFor,
  layout,
  mediaFor,
  normalizeSequence,
  type Sequence,
} from "./model";
import { buildEdl } from "./edl";
import {
  buildMediaCommand,
  codecExt,
  type ExportCodec,
} from "./ffmpeg";
import { buildFcpxml, type FcpxmlItem } from "./fcpxml";
import { hasAudioStream } from "./probe";
import { buildRenderCommand, type RenderMedia } from "./render";
import { resolveMediaPath } from "./store";
import { framesToTimecode } from "./timecode";
import { getSequenceStore, type SequenceStore } from "./store";

export type ExportAction = "render" | "package";

export type RunFfmpeg = (
  args: string[],
  onFrame?: (done: number) => void,
) => Promise<void>;

function bad(message: string): SocialError {
  return new SocialError({
    code: "invalid_input",
    operation: "sequence.export",
    message,
  });
}

function slug(name: string): string {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "clip"
  );
}

/** Real ffmpeg: spawn with an args array, stream `frame=` progress, killable. */
const kills = new Map<string, () => void>();

function realRunFfmpeg(env: StudioEnv, jobId: string): RunFfmpeg {
  return (args, onFrame) =>
    new Promise<void>((resolve, reject) => {
      const child = spawn(env.ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
      let lastErr = "";
      let errTail = "";
      child.stderr.on("data", (chunk: Buffer) => {
        errTail = (errTail + chunk.toString()).slice(-4000);
      });
      let buf = "";
      child.stdout.on("data", (chunk: Buffer) => {
        buf += chunk.toString();
        let idx;
        while ((idx = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (line.startsWith("frame=")) {
            const n = Number(line.slice(6).trim());
            if (Number.isFinite(n)) onFrame?.(n);
          }
        }
      });
      kills.set(jobId, () => child.kill());
      child.on("error", reject);
      child.on("close", (code) => {
        kills.delete(jobId);
        const lines = errTail
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        lastErr = lines[lines.length - 1] ?? `ffmpeg exited ${code}`;
        if (code === 0) resolve();
        else reject(new Error(lastErr));
      });
    });
}

/**
 * Cancel an export job: mark the row cancelled, then kill the running ffmpeg.
 * runExport sees the cancelled row and stops; a mid-flight reject is ignored.
 */
export async function cancelExport(jobId: string): Promise<JobRecord | null> {
  const store = getStore();
  const row = store.get(jobId);
  if (!row) return null;
  if (["succeeded", "failed", "cancelled"].includes(row.status)) return row;
  const updated = store.update(
    jobId,
    { status: "cancelled", progress: 0 },
    new Date().toISOString(),
  );
  emitJob(updated);
  kills.get(jobId)?.();
  kills.delete(jobId);
  return updated;
}

export type ExportDeps = {
  env?: StudioEnv;
  jobs?: JobStore;
  sequences?: SequenceStore;
  runFfmpeg?: RunFfmpeg;
  now?: () => string;
};

/** The bundled title font, vendored from google/fonts (OFL). */
export const TITLE_FONT = path.resolve(
  process.cwd(),
  "assets",
  "fonts",
  "Outfit.ttf",
);

/** Outfit already in the brand board, used until assets/fonts exists. */
export const BRAND_FONT = path.resolve(
  process.cwd(),
  "../brand/phaino/board/assets/Outfit.ttf",
);

/**
 * Title font candidates: env override, the bundled Outfit, the brand
 * board's Outfit, then common system fonts. An empty result omits
 * fontfile so drawtext falls back to its built-in font.
 */
function titleFontPath(): string {
  for (const f of [
    process.env.PHAINO_TITLE_FONT,
    TITLE_FONT,
    BRAND_FONT,
    "C:/Windows/Fonts/arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  ]) {
    if (f && existsSync(f)) return f;
  }
  return "";
}

/**
 * Export the sequence: "render" produces the finished MP4; "package" conforms
 * media with handles, writes FCPXML + EDL and embeds the full render. Both run
 * as normal job rows so SSE and cancel work.
 */
export async function startExport(
  { action, codec = "h264" }: { action: ExportAction; codec?: ExportCodec },
  deps: ExportDeps = {},
): Promise<JobRecord> {
  const env = deps.env ?? getEnv();
  const store = deps.jobs ?? getStore();
  const sequences = deps.sequences ?? getSequenceStore();
  const now = deps.now ?? (() => new Date().toISOString());
  const seq = normalizeSequence(await sequences.getSequence());
  if (seq.clips.length === 0) throw bad("The sequence is empty");

  const exportId = crypto.randomUUID();
  const job = store.create(
    {
      id: exportId,
      presetId: "sequence",
      category: "export",
      params: {
        action,
        codec,
        fps: seq.fps,
        resolution: seq.resolution,
        aspect: seq.aspect,
        fit: seq.fit,
        handles: seq.handles,
        exportId,
      },
    },
    now(),
  );
  const run = deps.runFfmpeg ?? realRunFfmpeg(env, job.id);
  void runExport(job.id, seq, action, codec, env, store, now, run).catch((err) => {
    const current = store.get(job.id);
    if (current?.status === "cancelled") return;
    const message =
      err instanceof Error ? err.message.slice(0, 240) : "Export failed";
    emitJob(
      store.update(job.id, { status: "failed", error: message }, now()),
    );
  });
  return job;
}

/** Re-probe every media used by the timeline at render time. */
async function probeRenderMedia(
  env: StudioEnv,
  seq: Sequence,
): Promise<Map<string, RenderMedia>> {
  const map = new Map<string, RenderMedia>();
  const ids = new Set<string>([
    ...seq.clips.map((c) => c.mediaId),
    ...seq.audio.map((a) => a.mediaId),
  ]);
  for (const id of ids) {
    const m = mediaFor(seq, id);
    if (!m) throw bad(`Missing media "${id}"`);
    const resolved = resolveMediaPath(env.dataDir, m.path);
    // Re-probe at render time; fall back to the flag recorded at import.
    const hasAudio =
      m.kind === "audio"
        ? true
        : await hasAudioStream(resolved.absPath).catch(() => m.hasAudio);
    map.set(id, { id, absPath: resolved.absPath, kind: m.kind, hasAudio });
  }
  return map;
}

async function renderMovie(
  jobId: string,
  seq: Sequence,
  env: StudioEnv,
  store: JobStore,
  now: () => string,
  runFfmpeg: RunFfmpeg,
  outAbs: string,
  progress: (n: number) => void,
  probed?: Map<string, RenderMedia>,
): Promise<void> {
  const media = probed ?? (await probeRenderMedia(env, seq));
  const { args } = buildRenderCommand(seq, media, {
    fontFile: titleFontPath(),
    out: outAbs,
  });
  emitJob(store.update(jobId, { message: "Rendering" }, now()));
  await runFfmpeg(args, progress);
}

async function runExport(
  jobId: string,
  seq: Sequence,
  action: ExportAction,
  codec: ExportCodec,
  env: StudioEnv,
  store: JobStore,
  now: () => string,
  runFfmpeg: RunFfmpeg,
): Promise<void> {
  const dir = path.join(env.dataDir, "exports", jobId);
  const mediaDir = path.join(dir, "media");
  await mkdir(mediaDir, { recursive: true });
  const ext = codecExt(codec);
  const lay = layout(seq);
  const fps = seq.fps;

  const upd = (patch: Parameters<JobStore["update"]>[1]) =>
    emitJob(store.update(jobId, patch, now()));

  upd({ status: "running", message: "Preparing export" });

  if (action === "render") {
    const movieFile = `phaino_render.mp4`;
    let done = 0;
    await renderMovie(jobId, seq, env, store, now, runFfmpeg, path.join(dir, movieFile), (n) => {
      done = Math.max(done, n);
      upd({ progress: Math.min(1, done / Math.max(1, lay.totalFrames)) });
    });
    if (store.get(jobId)?.status === "cancelled") return;
    // Library copy: every file under outputs/ is listed and publishable.
    const libRel = path.join("editor", `render-${jobId}.mp4`).replace(/\\/g, "/");
    const libAbs = path.join(env.dataDir, "outputs", libRel);
    await mkdir(path.dirname(libAbs), { recursive: true });
    await copyFile(path.join(dir, movieFile), libAbs);
    emitJob(
      store.update(
        jobId,
        {
          status: "succeeded",
          progress: 1,
          message: "Done",
          outputs: [movieFile],
        },
        now(),
      ),
    );
    return;
  }

  // Package: conform per-clip media, FCPXML + EDL, full render inside.
  const perClip = seq.clips.map((clip, i) => {
    const media = mediaFor(seq, clip.mediaId)!;
    const h = handlesFor(clip, media, fps, seq.handles);
    return {
      clip,
      media,
      i,
      h,
      mediaFrames: h.head + (clip.out - clip.in) + h.tail,
      recordIn: lay.clips[i].recordIn,
      transOut: lay.clips[i].transition,
    };
  });
  const totalWork =
    perClip.reduce((s, c) => s + c.mediaFrames, 0) + lay.totalFrames;
  let done = 0;
  const progress = (n: number) => {
    done += n;
    upd({
      progress: Math.min(1, done / Math.max(1, totalWork)),
    });
  };

  const mediaFiles: { file: string; abs: string }[] = [];
  const clampNotes: string[] = [];
  // Probe every media once; conforming and rendering share the result.
  const probed = await probeRenderMedia(env, seq);
  for (const { clip, media, i, h } of perClip) {
    const file = `${String(i + 1).padStart(2, "0")}_${slug(media.name)}${ext}`;
    const abs = path.join(mediaDir, file);
    mediaFiles.push({ file, abs });
    upd({ message: `Conforming ${i + 1}/${perClip.length}` });
    const resolved = probed.get(media.id)!;
    await runFfmpeg(
      buildMediaCommand({
        src: resolved.absPath,
        out: abs,
        fps,
        aspect: seq.aspect,
        resolution: seq.resolution,
        fit: seq.fit,
        startFrame: clip.in - h.head,
        endFrame: clip.out + h.tail,
        codec,
        hasAudio: resolved.hasAudio,
        still: media.kind === "image",
      }),
      progress,
    );
    if (h.clampedHead) {
      clampNotes.push(
        `${String(i + 1).padStart(2, "0")} ${media.name}: head handle ${h.head} of ${seq.handles} frames (clip starts near the in point)`,
      );
    }
    if (h.clampedTail) {
      clampNotes.push(
        `${String(i + 1).padStart(2, "0")} ${media.name}: tail handle ${h.tail} of ${seq.handles} frames (clip ends near the out point)`,
      );
    }
  }

  if (store.get(jobId)?.status === "cancelled") return;

  const movieFile = `phaino_sequence.mp4`;
  upd({ message: "Rendering sequence" });
  await renderMovie(
    jobId,
    seq,
    env,
    store,
    now,
    runFfmpeg,
    path.join(dir, movieFile),
    progress,
    probed,
  );

  if (store.get(jobId)?.status === "cancelled") return;

  const name = "phaino_sequence";
  const fcpxmlItems: FcpxmlItem[] = perClip.map(({ clip, media, i, h, mediaFrames, recordIn, transOut }) => ({
    name: media.name,
    mediaPath: mediaFiles[i].abs,
    mediaFrames,
    start: h.head,
    duration: clip.out - clip.in,
    recordIn,
    transition: transOut,
  }));
  await writeFile(
    path.join(dir, `${name}.fcpxml`),
    buildFcpxml({
      name,
      fps,
      aspect: seq.aspect,
      resolution: seq.resolution,
      items: fcpxmlItems,
    }),
  );
  await writeFile(
    path.join(dir, `${name}.edl`),
    buildEdl({
      title: name,
      fps,
      items: perClip.map(({ clip, media, i, h, recordIn, transOut }) => ({
        clipName: media.name,
        sourceFile: mediaFiles[i].file,
        srcIn: h.head,
        srcOut: h.head + (clip.out - clip.in),
        recIn: recordIn,
        recOut: recordIn + (clip.out - clip.in),
        transition: transOut,
      })),
    }),
  );

  const tc = (f: number) => framesToTimecode(f, fps);
  const base = 3600 * fps;
  const summary = [
    `Phaino sequence export ${jobId}`,
    `Rate: ${fps} fps`,
    `Aspect: ${seq.aspect} (${seq.fit})`,
    `Resolution: ${seq.resolution}`,
    `Handles: ${seq.handles} frames`,
    `Total: ${lay.totalFrames} frames (${tc(base + lay.totalFrames)} end)`,
    `Audio track and titles are not in the FCPXML/EDL.`,
    ``,
    ...perClip.map(({ clip, media, i, h, recordIn }) => {
      const len = clip.out - clip.in;
      return [
        `${String(i + 1).padStart(2, "0")} ${media.name}`,
        `    record ${tc(base + recordIn)} - ${tc(base + recordIn + len)}`,
        `    source ${tc(h.head)} - ${tc(h.head + len)} of media/${mediaFiles[i].file}`,
      ].join("\n");
    }),
    ``,
    ...(clampNotes.length > 0 ? clampNotes : [`No handle clamps.`]),
    ``,
  ].join("\n");
  await writeFile(path.join(dir, "summary.txt"), summary);

  upd({
    status: "succeeded",
    progress: 1,
    message: "Done",
    outputs: [
      movieFile,
      `${name}.fcpxml`,
      `${name}.edl`,
      "summary.txt",
      ...mediaFiles.map((m) => `media/${m.file}`),
    ],
  });
}
