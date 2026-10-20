import { z } from "zod";
import { secondsToFrames, type Fps } from "./timecode";

/* v2 data model: media + timeline clips on three lanes (titles, video, audio). */

export const mediaSchema = z.object({
  id: z.string(),
  path: z.string(),
  name: z.string(),
  kind: z.enum(["video", "audio", "image"]),
  srcFps: z.number(),
  width: z.number(),
  height: z.number(),
  durationSec: z.number(),
  hasAudio: z.boolean().default(false),
});
export type Media = z.infer<typeof mediaSchema>;

export const transitionSchema = z.object({
  type: z.enum(["cut", "crossfade", "dip"]),
  frames: z.number().int().nonnegative(),
});
export type Transition = z.infer<typeof transitionSchema>;
export const CUT: Transition = { type: "cut", frames: 0 };

export const clipSchema = z.object({
  id: z.string(),
  mediaId: z.string(),
  in: z.number().int().nonnegative(),
  out: z.number().int().positive(),
  volume: z.number().min(0).max(2).default(1),
  muted: z.boolean().default(false),
  fadeIn: z.number().int().nonnegative().default(0),
  fadeOut: z.number().int().nonnegative().default(0),
  /** Transition INTO the next clip. */
  transition: transitionSchema.default(CUT),
});
export type Clip = z.infer<typeof clipSchema>;

export const audioClipSchema = z.object({
  id: z.string(),
  mediaId: z.string(),
  /** Absolute record frame where the clip starts. */
  start: z.number().int().nonnegative(),
  in: z.number().int().nonnegative(),
  out: z.number().int().positive(),
  volume: z.number().min(0).max(2).default(1),
  fadeIn: z.number().int().nonnegative().default(0),
  fadeOut: z.number().int().nonnegative().default(0),
});
export type AudioClip = z.infer<typeof audioClipSchema>;

export const titleSchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(200),
  /** Absolute record frame where the title starts. */
  start: z.number().int().nonnegative(),
  /** Length in record frames. */
  duration: z.number().int().positive(),
  position: z.enum(["top", "center", "lower"]),
  size: z.enum(["s", "m", "l"]),
});
export type Title = z.infer<typeof titleSchema>;

export const sequenceSchema = z.object({
  version: z.literal(2),
  fps: z.union([z.literal(24), z.literal(25), z.literal(30)]),
  resolution: z.enum(["1080p", "4K"]),
  aspect: z.enum(["16:9", "9:16", "1:1", "4:5"]),
  fit: z.enum(["contain", "cover"]),
  handles: z.union([z.literal(0), z.literal(12), z.literal(24)]),
  settingsTouched: z.boolean(),
  media: z.array(mediaSchema),
  clips: z.array(clipSchema),
  audio: z.array(audioClipSchema),
  titles: z.array(titleSchema),
});
export type Sequence = z.infer<typeof sequenceSchema>;

export function emptySequence(): Sequence {
  return {
    version: 2,
    fps: 24,
    resolution: "1080p",
    aspect: "16:9",
    fit: "contain",
    handles: 12,
    settingsTouched: false,
    media: [],
    clips: [],
    audio: [],
    titles: [],
  };
}

/* v1 file shape: clips carried their media info inline. */
const clipV1Schema = z.object({
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
const sequenceV1Schema = z.object({
  fps: z.union([z.literal(24), z.literal(25), z.literal(30)]),
  resolution: z.enum(["1080p", "4K"]),
  handles: z.union([z.literal(0), z.literal(12), z.literal(24)]),
  settingsTouched: z.boolean(),
  clips: z.array(clipV1Schema),
});

/**
 * Parse a stored sequence: v2 as-is, v1 migrated (each old clip becomes a
 * media entry with the SAME id so posters/<id>.jpg keep working).
 */
export function parseSequence(raw: unknown): Sequence | null {
  const v2 = sequenceSchema.safeParse(raw);
  if (v2.success) return v2.data;
  const v1 = sequenceV1Schema.safeParse(raw);
  if (!v1.success) return null;
  const base = emptySequence();
  return {
    ...base,
    fps: v1.data.fps,
    resolution: v1.data.resolution,
    handles: v1.data.handles,
    settingsTouched: v1.data.settingsTouched,
    media: v1.data.clips.map((c) => ({
      id: c.id,
      path: c.path,
      name: c.name,
      kind: "video",
      srcFps: c.srcFps,
      width: c.width,
      height: c.height,
      durationSec: c.durationSec,
      hasAudio: false,
    })),
    clips: v1.data.clips.map((c) => ({
      id: c.id,
      mediaId: c.id,
      in: c.in,
      out: c.out,
      volume: 1,
      muted: false,
      fadeIn: 0,
      fadeOut: 0,
      transition: { ...CUT },
    })),
  };
}

/** Project frames available in a media item at the project fps. */
export function mediaFrames(media: Media, fps: Fps): number {
  return secondsToFrames(media.durationSec, fps);
}

export function mediaFor(seq: Sequence, id: string): Media | undefined {
  return seq.media.find((m) => m.id === id);
}

/** Clamp a trim into [0, total-1] x [in+1, total]. */
export function clampTrim(
  total: number,
  inPoint: number,
  outPoint: number,
): { in: number; out: number } {
  const i = Math.min(Math.max(0, Math.round(inPoint)), total - 1);
  const o = Math.min(Math.max(i + 1, Math.round(outPoint)), total);
  return { in: i, out: o };
}

const scaleFrame = (f: number, from: number, to: number) =>
  Math.round((f * to) / from);

/** Rescale every frame field when the project fps changes. */
export function rescaleSequence(seq: Sequence, newFps: Fps): Sequence {
  if (seq.fps === newFps) return seq;
  const k = (f: number) => scaleFrame(f, seq.fps, newFps);
  const totalOf = (id: string) => {
    const m = mediaFor(seq, id);
    return m ? mediaFrames(m, newFps) : 0;
  };
  const clips = seq.clips.map((c) => {
    const t = clampTrim(totalOf(c.mediaId) || 1, k(c.in), k(c.out));
    return {
      ...c,
      in: t.in,
      out: t.out,
      fadeIn: Math.min(k(c.fadeIn), t.out - t.in - 1),
      fadeOut: Math.min(k(c.fadeOut), t.out - t.in - 1),
      transition: { ...c.transition, frames: k(c.transition.frames) },
    };
  });
  const audio = seq.audio.map((a) => {
    const t = clampTrim(totalOf(a.mediaId) || 1, k(a.in), k(a.out));
    return {
      ...a,
      start: k(a.start),
      in: t.in,
      out: t.out,
      fadeIn: Math.min(k(a.fadeIn), t.out - t.in - 1),
      fadeOut: Math.min(k(a.fadeOut), t.out - t.in - 1),
    };
  });
  const titles = seq.titles.map((t) => ({
    ...t,
    start: k(t.start),
    duration: Math.max(1, k(t.duration)),
  }));
  return { ...seq, fps: newFps, clips, audio, titles };
}

/** Handles available inside a clip's own frames; clamps at the edges. */
export function handlesFor(
  clip: Clip,
  media: Media,
  fps: Fps,
  handles: 0 | 12 | 24,
): { head: number; tail: number; clampedHead: boolean; clampedTail: boolean } {
  const total = mediaFrames(media, fps);
  const head = Math.min(handles, clip.in);
  const tail = Math.min(handles, total - clip.out);
  return {
    head,
    tail,
    clampedHead: head < handles,
    clampedTail: tail < handles,
  };
}

export type ClipLayout = {
  recordIn: number;
  recordOut: number;
  /** Effective transition out of this clip, after clamping. */
  transition: Transition;
};

/**
 * A transition's effective length: the declared frames clamped to
 * floor(min(lenA, lenB) / 2), and 0 for cuts.
 */
export function transitionFrames(a: Clip, b: Clip): number {
  if (a.transition.type === "cut") return 0;
  const max = Math.floor(Math.min(a.out - a.in, b.out - b.in) / 2);
  return Math.min(a.transition.frames, Math.max(0, max));
}

/**
 * Gapless record positions. Crossfade overlaps A's tail and B's head by the
 * effective frames; dips and cuts do not overlap.
 */
export function layout(seq: Sequence): {
  clips: ClipLayout[];
  totalFrames: number;
} {
  let cursor = 0;
  const clips = seq.clips.map((clip, i) => {
    const len = clip.out - clip.in;
    const next = seq.clips[i + 1];
    const trans = next
      ? clip.transition.type === "crossfade"
        ? { ...clip.transition, frames: transitionFrames(clip, next) }
        : clip.transition
      : clip.transition;
    const entry = { recordIn: cursor, recordOut: cursor + len, transition: trans };
    cursor += len;
    if (next && clip.transition.type === "crossfade") {
      cursor -= trans.frames;
    }
    return entry;
  });
  return { clips, totalFrames: Math.max(0, cursor) };
}

const clampNonneg = (n: number) => Math.max(0, Math.round(n));

/** Clamp trims, fades and positions back inside their bounds. */
export function normalizeSequence(seq: Sequence): Sequence {
  const totalOf = (id: string) => {
    const m = mediaFor(seq, id);
    return m ? mediaFrames(m, seq.fps) : 0;
  };
  return {
    ...seq,
    clips: seq.clips.map((c) => {
      const t = clampTrim(totalOf(c.mediaId) || 1, c.in, c.out);
      const len = t.out - t.in;
      return {
        ...c,
        in: t.in,
        out: t.out,
        volume: Math.min(2, Math.max(0, c.volume)),
        fadeIn: Math.min(clampNonneg(c.fadeIn), len - 1),
        fadeOut: Math.min(clampNonneg(c.fadeOut), len - 1),
        transition: { type: c.transition.type, frames: clampNonneg(c.transition.frames) },
      };
    }),
    audio: seq.audio.map((a) => {
      const t = clampTrim(totalOf(a.mediaId) || 1, a.in, a.out);
      const len = t.out - t.in;
      return {
        ...a,
        start: clampNonneg(a.start),
        in: t.in,
        out: t.out,
        volume: Math.min(2, Math.max(0, a.volume)),
        fadeIn: Math.min(clampNonneg(a.fadeIn), len - 1),
        fadeOut: Math.min(clampNonneg(a.fadeOut), len - 1),
      };
    }),
    titles: seq.titles.map((t) => ({
      ...t,
      start: clampNonneg(t.start),
      duration: Math.max(1, Math.round(t.duration)),
    })),
  };
}
