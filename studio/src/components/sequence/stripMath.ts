/** Pure strip geometry: layout, locate, seek math, trims, zoom and ruler ticks. */
import { transitionFrames, type Clip, type Transition } from "@/server/sequence/model";

export type StripEntry<T extends { in: number; out: number } = Clip> = {
  clip: T;
  recordIn: number;
  recordOut: number;
  /** Effective transition out of this clip, after clamping. */
  transition: Transition;
};

export type StripLayout<T extends { in: number; out: number } = Clip> = {
  clips: StripEntry<T>[];
  totalFrames: number;
};

/** Record positions matching the server's layout(), transitions included. */
export function layoutClips(clips: Clip[]): StripLayout<Clip> {
  let cursor = 0;
  const entries = clips.map((clip, i) => {
    const len = clip.out - clip.in;
    const next = clips[i + 1];
    const trans = next
      ? clip.transition.type === "crossfade"
        ? { type: clip.transition.type, frames: transitionFrames(clip, next) }
        : clip.transition
      : clip.transition;
    const entry = { clip, recordIn: cursor, recordOut: cursor + len, transition: trans };
    cursor += len;
    if (next && clip.transition.type === "crossfade") cursor -= trans.frames;
    return entry;
  });
  return { clips: entries, totalFrames: Math.max(0, cursor) };
}

/**
 * The entry containing `frame`. A cut boundary belongs to the next clip;
 * frame >= total clamps to the last entry.
 */
export function locate<T extends { in: number; out: number }>(
  layout: StripLayout<T>,
  frame: number,
): { index: number; entry: StripEntry<T> } {
  for (let i = 0; i < layout.clips.length; i++) {
    const entry = layout.clips[i];
    if (frame < entry.recordOut) return { index: i, entry };
  }
  const index = Math.max(0, layout.clips.length - 1);
  return { index, entry: layout.clips[index] };
}

/** Horizontal position to a frame index, floored and clamped. */
export function frameAtX(
  x: number,
  pxPerSec: number,
  fps: number,
  totalFrames: number,
): number {
  const f = Math.floor((x / pxPerSec) * fps);
  return Math.min(Math.max(0, f), Math.max(0, totalFrames - 1));
}

/** Drag a trim edge by dxPx: returns the clamped new in/out. */
export function trimFromDrag({
  side,
  startIn,
  startOut,
  dxPx,
  pxPerSec,
  fps,
  total,
  shift,
}: {
  side: "left" | "right";
  startIn: number;
  startOut: number;
  dxPx: number;
  pxPerSec: number;
  fps: number;
  total: number;
  shift: boolean;
}): { in: number; out: number } {
  const df = Math.round((dxPx / pxPerSec) * fps);
  const snap = (f: number) => (shift ? Math.round(f / fps) * fps : f);
  if (side === "left") {
    const i = Math.min(Math.max(0, snap(startIn + df)), startOut - 1);
    return { in: i, out: startOut };
  }
  const o = Math.min(Math.max(startIn + 1, snap(startOut + df)), total);
  return { in: startIn, out: o };
}

/** Drag a whole free clip by dxPx: the new record start, clamped >= 0. */
export function moveFromDrag(
  start: number,
  dxPx: number,
  pxPerSec: number,
  fps: number,
  shift: boolean,
): number {
  const df = Math.round((dxPx / pxPerSec) * fps);
  const snap = (f: number) => (shift ? Math.round(f / fps) * fps : f);
  return Math.max(0, snap(start + df));
}

export const MIN_ZOOM = 10;
export const MAX_ZOOM = 200;

/** Clamp px-per-second zoom to the slider's range. */
export function clampZoom(pxPerSec: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pxPerSec));
}

/** Zoom so the whole sequence fits `widthPx`, clamped to [10, 200]. */
export function nextZoomToFit(
  totalFrames: number,
  fps: number,
  widthPx: number,
): number {
  const seconds = Math.max(1e-6, totalFrames / fps);
  return clampZoom(widthPx / seconds);
}

/**
 * Index where a dropped clip belongs on V1: before the first entry whose
 * record midpoint is past `frame`, else the end.
 */
export function insertIndexAt(
  layout: StripLayout,
  frame: number,
): number {
  for (let i = 0; i < layout.clips.length; i++) {
    const e = layout.clips[i];
    if ((e.recordIn + e.recordOut) / 2 > frame) return i;
  }
  return layout.clips.length;
}

/**
 * While playing, scroll so the playhead stays visible: when it leaves
 * [scrollLeft, scrollLeft + viewWidth - margin], put it at 10% of the view.
 * Returns the new scrollLeft, or null when no scroll is needed.
 */
export function followScroll({
  playheadX,
  scrollLeft,
  viewWidth,
  margin,
}: {
  playheadX: number;
  scrollLeft: number;
  viewWidth: number;
  margin: number;
}): number | null {
  if (playheadX >= scrollLeft && playheadX <= scrollLeft + viewWidth - margin) {
    return null;
  }
  return Math.max(0, playheadX - viewWidth * 0.1);
}

/**
 * scrollLeft that keeps `anchorFrame` at `anchorScreenX` px from the view's
 * left edge after a zoom to `nextPxPerSec`.
 */
export function zoomAnchorScroll({
  anchorFrame,
  anchorScreenX,
  fps,
  nextPxPerSec,
}: {
  anchorFrame: number;
  anchorScreenX: number;
  fps: number;
  nextPxPerSec: number;
}): number {
  return Math.max(0, (anchorFrame / fps) * nextPxPerSec - anchorScreenX);
}

/** Master playback clock: the frame at `now` since `startTs` at `rate`. */
export function clockFrame({
  startFrame,
  startTs,
  now,
  fps,
  rate,
}: {
  startFrame: number;
  startTs: number;
  now: number;
  fps: number;
  rate: number;
}): number {
  return startFrame + Math.floor(((now - startTs) / 1000) * fps * rate);
}

/** Ruler tick step in seconds: 1, 2, 5 or 10 so labels are >= 64px apart. */
export function tickStep(pxPerSec: number): 1 | 2 | 5 | 10 {
  for (const s of [1, 2, 5, 10] as const) {
    if (s * pxPerSec >= 64) return s;
  }
  return 10;
}
