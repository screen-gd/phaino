/** Non-drop timecode maths. All frame numbers are integer project frames. */
export type Fps = 24 | 25 | 30;

export const RESOLUTIONS = {
  "1080p": [1920, 1080],
  "4K": [3840, 2160],
} as const;

export type SequenceResolution = keyof typeof RESOLUTIONS;

export type SequenceAspect = "16:9" | "9:16" | "1:1" | "4:5";
export type SequenceFit = "contain" | "cover";

/** Output size: the short edge is 1080 (1080p) or 2160 (4K). */
export function outputSize(
  aspect: SequenceAspect,
  resolution: SequenceResolution,
): [number, number] {
  const s = resolution === "4K" ? 2160 : 1080;
  switch (aspect) {
    case "16:9":
      return [Math.round((s * 16) / 9), s];
    case "9:16":
      return [s, Math.round((s * 16) / 9)];
    case "1:1":
      return [s, s];
    case "4:5":
      return [s, Math.round((s * 5) / 4)];
  }
}

export function framesToTimecode(frames: number, fps: Fps): string {
  if (frames < 0) throw new Error("Negative frame count");
  const f = Math.floor(frames + 1e-9);
  const ff = f % fps;
  const totalSec = Math.floor(f / fps);
  const ss = totalSec % 60;
  const mm = Math.floor(totalSec / 60) % 60;
  const hh = Math.floor(totalSec / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

export function secondsToFrames(sec: number, fps: Fps): number {
  return Math.floor(sec * fps + 1e-6);
}

export function framesToSeconds(frames: number, fps: Fps): number {
  return frames / fps;
}

/** Nearest supported rate: NTSC 23.976/29.97 snap to 24/30. */
export function snapFps(rate: number): Fps {
  const rates: Fps[] = [24, 25, 30];
  return rates.reduce((best, r) =>
    Math.abs(r - rate) < Math.abs(best - rate) ? r : best,
  );
}

/** 4K when the long edge is over 2200, else 1080p. */
export function snapResolution(w: number, h: number): SequenceResolution {
  return Math.max(w, h) > 2200 ? "4K" : "1080p";
}
