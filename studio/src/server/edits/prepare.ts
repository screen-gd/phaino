import "server-only";

import { execFile } from "node:child_process";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { getEnv, type StudioEnv } from "@/server/env";
import { syntheticToolPreset, type ResolvedTool } from "@/server/models/resolve";
import {
  outpaintPads,
  toolForPresetId,
  type DerivedWrite,
  type EditTool,
} from "@/server/models/tools";
import { probeVideo, hasAudioStream } from "@/server/sequence/probe";
import { resolveUpload, saveUploadFromPath } from "@/server/uploads";

const execFileAsync = promisify(execFile);

export type EditDeps = {
  ffmpeg: (args: string[]) => Promise<void>;
  probe: (absPath: string) => Promise<{
    width: number;
    height: number;
    fps: number;
    durationSec: number;
    hasAudio: boolean;
  }>;
};

/** Run env.ffmpegPath with the given args; rejects on non-zero exit. */
export async function runFfmpeg(args: string[]): Promise<void> {
  await execFileAsync(getEnv().ffmpegPath, args);
}

const defaultDeps: EditDeps = { ffmpeg: runFfmpeg, probe: probeVideo };

export type PreparedEdit = {
  /** Inputs possibly rewritten to a trimmed upload. */
  inputs: Record<string, string>;
  /** Derived bind writes applied after applyPreset (frames, pads). */
  derived: DerivedWrite[];
  /** Source was longer than the tool's maxSeconds and got trimmed. */
  trimmed: boolean;
};

/**
 * Re-encode a video upload as a new upload: optional `-t` trim and optional
 * `-r` fps conform. H.264 crf 18, audio kept when the source has it.
 */
export async function conformUpload(
  dataDir: string,
  absPath: string,
  opts: { seconds?: number; fps?: number },
  env: StudioEnv,
  deps: EditDeps = defaultDeps,
  hasAudio?: boolean,
): Promise<string> {
  const audio =
    hasAudio ?? (await hasAudioStream(absPath).catch(() => true));
  const tmp = path.join(env.dataDir, "uploads", `trim-${crypto.randomUUID()}.mp4`);
  const args = [
    "-y",
    "-ss", "0",
    ...(opts.seconds ? ["-t", String(opts.seconds)] : []),
    "-i", absPath,
    "-c:v", "libx264",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    ...(opts.fps ? ["-r", String(opts.fps)] : []),
    ...(audio ? ["-c:a", "aac"] : ["-an"]),
    "-movflags", "+faststart",
    tmp,
  ];
  try {
    await deps.ffmpeg(args);
    const saved = await saveUploadFromPath(dataDir, tmp, () =>
      crypto.randomUUID(),
    );
    return saved.uploadId;
  } finally {
    await unlink(tmp).catch(() => undefined);
  }
}

/**
 * For an `edit-*` preset: probe the video input, trim it to the tool's
 * maxSeconds, and compute the derived writes (frame counts capped at the
 * template default, reframe pads). Returns null for non-edit presets.
 */
export async function prepareEditJob(
  presetId: string,
  inputs: Record<string, string>,
  params: Record<string, string | number | boolean>,
  env: StudioEnv,
  deps: EditDeps = defaultDeps,
): Promise<PreparedEdit | null> {
  const tool = toolForPresetId(presetId);
  if (!tool || !tool.template) return null;
  const resolved = syntheticToolPreset(presetId, env);
  if (!resolved) return null;
  return prepareToolJob(tool, resolved, inputs, params, env, deps);
}

/**
 * Trim + derive for a resolved tool preset. Exported for tests; callers use
 * prepareEditJob.
 */
export async function prepareToolJob(
  tool: EditTool,
  resolved: ResolvedTool,
  inputs: Record<string, string>,
  params: Record<string, string | number | boolean>,
  env: StudioEnv,
  deps: EditDeps = defaultDeps,
): Promise<PreparedEdit> {
  const videoKey =
    resolved.preset.inputs.find((i) => i.type === "video")?.key ?? "video";
  const uploadId = inputs[videoKey];
  if (!uploadId) return { inputs, derived: [], trimmed: false };

  const abs = resolveUpload(env.dataDir, uploadId).absPath;
  const probe = await deps.probe(abs);

  const wantsTrim =
    tool.maxSeconds !== undefined &&
    probe.durationSec > tool.maxSeconds + 0.05;
  const wantsFps =
    resolved.inputFps !== undefined &&
    Math.abs(probe.fps - resolved.inputFps) > 0.01;

  let usedUpload = uploadId;
  let durationSec = probe.durationSec;
  let trimmed = false;
  if (wantsTrim || wantsFps) {
    usedUpload = await conformUpload(
      env.dataDir,
      abs,
      {
        seconds: wantsTrim ? tool.maxSeconds : undefined,
        fps: wantsFps ? resolved.inputFps : undefined,
      },
      env,
      deps,
      probe.hasAudio,
    );
    if (wantsTrim) {
      durationSec = Math.min(tool.maxSeconds!, probe.durationSec);
      trimmed = true;
    }
  }

  const derived = deriveWrites(
    resolved,
    tool,
    probe,
    durationSec,
    wantsFps ? resolved.inputFps! : probe.fps,
    params,
  );
  return {
    inputs: { ...inputs, [videoKey]: usedUpload },
    derived,
    trimmed,
  };
}

/**
 * Probe-driven writes: frame counts (capped per bind, Wan 4n+1 lengths
 * snapped down), the ImagePadForOutpaint pads and any fixed output dims.
 */
export function deriveWrites(
  resolved: ResolvedTool,
  tool: EditTool,
  probe: { width: number; height: number; fps: number },
  durationSec: number,
  fps: number,
  params: Record<string, string | number | boolean>,
): DerivedWrite[] {
  const out: DerivedWrite[] = [];
  if (resolved.frames) {
    const clipFrames = Math.round(durationSec * fps);
    for (const b of resolved.frames) {
      let value = Math.min(clipFrames, b.cap);
      // Wan lengths are 4n+1; snap down, never below 5.
      if (b.cap % 4 === 1 && b.cap > 4) {
        value = Math.max(5, Math.floor((value - 1) / 4) * 4 + 1);
      }
      out.push({ node: b.node, field: b.field, value });
    }
  }
  if (resolved.padsNode) {
    const aspect = String(params.aspect ?? "9:16") as Parameters<
      typeof outpaintPads
    >[2];
    const pads = outpaintPads(probe.width, probe.height, aspect);
    for (const [field, value] of Object.entries(pads)) {
      out.push({ node: resolved.padsNode, field, value });
    }
  }
  if (resolved.size) {
    const budget = resolved.size.width.value * resolved.size.height.value;
    // Reframe stretches to the chosen aspect; other tools keep the source's.
    const [aw, ah] = tool.controls?.aspect
      ? String(params.aspect ?? "9:16").split(":").map(Number)
      : [0, 0];
    const target = aw ? aw / ah : probe.width / probe.height;
    const h = r16(Math.sqrt(budget / target));
    const w = r16(h * target);
    out.push({ node: resolved.size.width.node, field: resolved.size.width.field, value: w });
    out.push({ node: resolved.size.height.node, field: resolved.size.height.field, value: h });
  }
  return out;
}

const r16 = (n: number) => Math.max(16, Math.round(n / 16) * 16);

/** Write derived values straight onto an applied graph. */
export function applyDerived(
  graph: Record<string, { inputs?: Record<string, unknown> }>,
  writes: { node: string; field: string; value: number }[],
): void {
  for (const w of writes) {
    const node = graph[w.node];
    if (!node) continue;
    (node.inputs ??= {})[w.field] = w.value;
  }
}
