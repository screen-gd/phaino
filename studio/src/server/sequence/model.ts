import { z } from "zod";
import { secondsToFrames, type Fps } from "./timecode";

export const clipSchema = z.object({
  id: z.string(),
  path: z.string(),
  name: z.string(),
  srcFps: z.number(),
  width: z.number(),
  height: z.number(),
  durationSec: z.number(),
  in: z.number().int().nonnegative(),
  out: z.number().int().positive(),
});
export type Clip = z.infer<typeof clipSchema>;

export const sequenceSchema = z.object({
  fps: z.union([z.literal(24), z.literal(25), z.literal(30)]),
  resolution: z.enum(["1080p", "4K"]),
  handles: z.union([z.literal(0), z.literal(12), z.literal(24)]),
  settingsTouched: z.boolean(),
  clips: z.array(clipSchema),
});
export type Sequence = z.infer<typeof sequenceSchema>;

export function emptySequence(): Sequence {
  return {
    fps: 24,
    resolution: "1080p",
    handles: 12,
    settingsTouched: false,
    clips: [],
  };
}

/** Project frames available in a clip at the project fps. */
export function clipFrames(clip: Clip, fps: Fps): number {
  return secondsToFrames(clip.durationSec, fps);
}

export function clampTrim(
  clip: Clip,
  fps: Fps,
  inPoint: number,
  outPoint: number,
): { in: number; out: number } {
  const total = clipFrames(clip, fps);
  const i = Math.min(Math.max(0, Math.round(inPoint)), total - 1);
  const o = Math.min(Math.max(i + 1, Math.round(outPoint)), total);
  return { in: i, out: o };
}

/** Rescale in/out when the project fps changes. */
export function rescaleSequence(seq: Sequence, newFps: Fps): Sequence {
  if (seq.fps === newFps) return seq;
  const clips = seq.clips.map((clip) => {
    const i = Math.round((clip.in * newFps) / seq.fps);
    const o = Math.round((clip.out * newFps) / seq.fps);
    const trimmed = clampTrim(clip, newFps, i, o);
    return { ...clip, in: trimmed.in, out: trimmed.out };
  });
  return { ...seq, fps: newFps, clips };
}

/** Handles available inside a clip's own frames; clamps at the edges. */
export function handlesFor(
  clip: Clip,
  fps: Fps,
  handles: 0 | 12 | 24,
): { head: number; tail: number; clampedHead: boolean; clampedTail: boolean } {
  const total = clipFrames(clip, fps);
  const head = Math.min(handles, clip.in);
  const tail = Math.min(handles, total - clip.out);
  return {
    head,
    tail,
    clampedHead: head < handles,
    clampedTail: tail < handles,
  };
}

export type ClipLayout = { recordIn: number; recordOut: number };

/** Gapless record positions, derived from clip order. */
export function layout(seq: Sequence): {
  clips: ClipLayout[];
  totalFrames: number;
} {
  let cursor = 0;
  const clips = seq.clips.map((clip) => {
    const len = clip.out - clip.in;
    const entry = { recordIn: cursor, recordOut: cursor + len };
    cursor += len;
    return entry;
  });
  return { clips, totalFrames: cursor };
}

/** Clamp every clip's trim back inside its available frames. */
export function normalizeSequence(seq: Sequence): Sequence {
  return {
    ...seq,
    clips: seq.clips.map((clip) => {
      const t = clampTrim(clip, seq.fps, clip.in, clip.out);
      return { ...clip, in: t.in, out: t.out };
    }),
  };
}
