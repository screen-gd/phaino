import "server-only";

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { SocialError } from "@opencoredev/social-sdk";
import { getEnv, type StudioEnv } from "@/server/env";
import { emitJob } from "@/server/jobs/runner";
import { getStore, type JobRecord, type JobStore } from "@/server/jobs/store";
import { resolveOutput } from "@/server/social/media";
import {
  handlesFor,
  layout,
  normalizeSequence,
  type Sequence,
} from "./model";
import { buildEdl } from "./edl";
import {
  buildMediaCommand,
  buildSequenceCommand,
  codecExt,
  type ExportCodec,
} from "./ffmpeg";
import { buildFcpxml, type FcpxmlItem } from "./fcpxml";
import { framesToTimecode } from "./timecode";
import { getSequenceStore, type SequenceStore } from "./store";

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

/**
 * Export the current sequence: conform each clip's media, render the movie,
 * write FCPXML + EDL + summary. Runs as a normal job row so SSE works.
 */
export async function startExport(
  { codec }: { codec: ExportCodec },
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
        codec,
        fps: seq.fps,
        resolution: seq.resolution,
        handles: seq.handles,
        exportId,
      },
    },
    now(),
  );
  const run = deps.runFfmpeg ?? realRunFfmpeg(env, job.id);
  void runExport(job.id, seq, codec, env, store, now, run).catch((err) => {
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

async function runExport(
  jobId: string,
  seq: Sequence,
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

  // Per-clip media frames + total work for progress.
  const perClip = seq.clips.map((clip, i) => {
    const h = handlesFor(clip, fps, seq.handles);
    return {
      clip,
      i,
      h,
      mediaFrames: h.head + (clip.out - clip.in) + h.tail,
      recordIn: lay.clips[i].recordIn,
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
  for (const { clip, i, h } of perClip) {
    const file = `${String(i + 1).padStart(2, "0")}_${slug(clip.name)}${ext}`;
    const abs = path.join(mediaDir, file);
    mediaFiles.push({ file, abs });
    upd({ message: `Conforming ${i + 1}/${perClip.length}` });
    const resolved = resolveOutput(env.dataDir, clip.path);
    await runFfmpeg(
      buildMediaCommand({
        src: resolved.absPath,
        out: abs,
        fps,
        resolution: seq.resolution,
        startFrame: clip.in - h.head,
        endFrame: clip.out + h.tail,
        codec,
      }),
      progress,
    );
    if (h.clampedHead) {
      clampNotes.push(
        `${String(i + 1).padStart(2, "0")} ${clip.name}: head handle ${h.head} of ${seq.handles} frames (clip starts near the in point)`,
      );
    }
    if (h.clampedTail) {
      clampNotes.push(
        `${String(i + 1).padStart(2, "0")} ${clip.name}: tail handle ${h.tail} of ${seq.handles} frames (clip ends near the out point)`,
      );
    }
  }

  if (store.get(jobId)?.status === "cancelled") return;

  const movieFile = `phaino_sequence${ext}`;
  upd({ message: "Rendering sequence" });
  await runFfmpeg(
    buildSequenceCommand({
      clips: seq.clips.map((clip) => ({
        src: resolveOutput(env.dataDir, clip.path).absPath,
        inFrame: clip.in,
        outFrame: clip.out,
      })),
      fps,
      resolution: seq.resolution,
      codec,
      out: path.join(dir, movieFile),
    }),
    progress,
  );

  if (store.get(jobId)?.status === "cancelled") return;

  const name = "phaino_sequence";
  const fcpxmlItems: FcpxmlItem[] = perClip.map(({ clip, i, h, mediaFrames, recordIn }) => ({
    name: clip.name,
    mediaPath: mediaFiles[i].abs,
    mediaFrames,
    start: h.head,
    duration: clip.out - clip.in,
    recordIn,
  }));
  await writeFile(
    path.join(dir, `${name}.fcpxml`),
    buildFcpxml({
      name,
      fps,
      resolution: seq.resolution,
      items: fcpxmlItems,
    }),
  );
  await writeFile(
    path.join(dir, `${name}.edl`),
    buildEdl({
      title: name,
      fps,
      items: perClip.map(({ clip, i, h, recordIn }) => ({
        clipName: clip.name,
        sourceFile: mediaFiles[i].file,
        srcIn: h.head,
        srcOut: h.head + (clip.out - clip.in),
        recIn: recordIn,
        recOut: recordIn + (clip.out - clip.in),
      })),
    }),
  );

  const tc = (f: number) => framesToTimecode(f, fps);
  const base = 3600 * fps;
  const summary = [
    `Phaino sequence export ${jobId}`,
    `Codec: ${codec}`,
    `Rate: ${fps} fps`,
    `Resolution: ${seq.resolution} (${RES_W(seq.resolution)})`,
    `Handles: ${seq.handles} frames`,
    `Total: ${lay.totalFrames} frames (${tc(base + lay.totalFrames)} end)`,
    ``,
    ...perClip.map(({ clip, i, h, recordIn }) => {
      const len = clip.out - clip.in;
      return [
        `${String(i + 1).padStart(2, "0")} ${clip.name}`,
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

function RES_W(resolution: "1080p" | "4K"): string {
  return resolution === "4K" ? "3840x2160" : "1920x1080";
}
