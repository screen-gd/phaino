/** Pure strip geometry: layout, locate, seek math, trims, zoom and ruler ticks. */

export type StripClip = { id: string; in: number; out: number };

export type StripEntry<T extends StripClip = StripClip> = {
  clip: T;
  recordIn: number;
  recordOut: number;
};

export type StripLayout<T extends StripClip = StripClip> = {
  clips: StripEntry<T>[];
  totalFrames: number;
};

/** Gapless record positions, same maths as the server's layout(). */
export function layoutClips<T extends StripClip>(clips: T[]): StripLayout<T> {
  let cursor = 0;
  const entries = clips.map((clip) => {
    const entry = { clip, recordIn: cursor, recordOut: cursor + (clip.out - clip.in) };
    cursor += clip.out - clip.in;
    return entry;
  });
  return { clips: entries, totalFrames: cursor };
}

/**
 * The entry containing `frame`. A cut boundary belongs to the next clip;
 * frame >= total clamps to the last entry.
 */
export function locate<T extends StripClip>(
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

/** Zoom so the whole sequence fits `widthPx`, clamped to [10, 200]. */
export function nextZoomToFit(
  totalFrames: number,
  fps: number,
  widthPx: number,
): number {
  const seconds = Math.max(1e-6, totalFrames / fps);
  return Math.min(200, Math.max(10, widthPx / seconds));
}

/** Ruler tick step in seconds: 1, 2, 5 or 10 so labels are >= 64px apart. */
export function tickStep(pxPerSec: number): 1 | 2 | 5 | 10 {
  for (const s of [1, 2, 5, 10] as const) {
    if (s * pxPerSec >= 64) return s;
  }
  return 10;
}
