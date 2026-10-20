import { describe, expect, it } from "vitest";
import type { Clip } from "@/server/sequence/model";
import {
  frameAtX,
  layoutClips,
  locate,
  moveFromDrag,
  nextZoomToFit,
  tickStep,
  trimFromDrag,
} from "./stripMath";

function clip(id: string, inF: number, outF: number, extra: Partial<Clip> = {}): Clip {
  return {
    id,
    mediaId: id,
    in: inF,
    out: outF,
    volume: 1,
    muted: false,
    fadeIn: 0,
    fadeOut: 0,
    transition: { type: "cut", frames: 0 },
    ...extra,
  };
}

const clips = [
  clip("a", 0, 48),
  clip("b", 10, 34),
  clip("c", 0, 12),
];
// a: 48 frames, b: 24, c: 12 -> total 84 at 24fps

describe("layoutClips", () => {
  it("stays gapless", () => {
    const l = layoutClips(clips);
    expect(l.clips[0]).toMatchObject({ recordIn: 0, recordOut: 48 });
    expect(l.clips[1]).toMatchObject({ recordIn: 48, recordOut: 72 });
    expect(l.clips[2]).toMatchObject({ recordIn: 72, recordOut: 84 });
    expect(l.totalFrames).toBe(84);
    for (let i = 1; i < l.clips.length; i++) {
      expect(l.clips[i].recordIn).toBe(l.clips[i - 1].recordOut);
    }
  });

  it("crossfade overlaps and clamps to the shorter half", () => {
    const l = layoutClips([
      clip("a", 0, 48, { transition: { type: "crossfade", frames: 12 } }),
      clip("b", 0, 24),
    ]);
    expect(l.clips[1].recordIn).toBe(36);
    expect(l.totalFrames).toBe(60);
    const clamped = layoutClips([
      clip("a", 0, 48, { transition: { type: "crossfade", frames: 30 } }),
      clip("b", 0, 24),
    ]);
    expect(clamped.clips[0].transition.frames).toBe(12);
    expect(clamped.totalFrames).toBe(60);
  });
});

describe("locate", () => {
  const l = layoutClips(clips);
  it("first frame, a cut boundary and the last frame", () => {
    expect(locate(l, 0).entry.clip.id).toBe("a");
    expect(locate(l, 48).entry.clip.id).toBe("b"); // boundary -> next clip
    expect(locate(l, 83).entry.clip.id).toBe("c");
    expect(locate(l, 84).entry.clip.id).toBe("c"); // past end clamps
  });
});

describe("frameAtX", () => {
  it("floors and clamps to [0, total-1]", () => {
    // 100px/s at 24fps
    expect(frameAtX(0, 100, 24, 84)).toBe(0);
    expect(frameAtX(250, 100, 24, 84)).toBe(60); // 2.5s * 24
    expect(frameAtX(249, 100, 24, 84)).toBe(59);
    expect(frameAtX(-50, 100, 24, 84)).toBe(0);
    expect(frameAtX(99999, 100, 24, 84)).toBe(83);
  });
});

describe("trimFromDrag", () => {
  const base = {
    startIn: 12,
    startOut: 48,
    pxPerSec: 96,
    fps: 24,
    total: 72,
  };
  it("left edge moves `in`, clamped to [0, out-1]", () => {
    // +48px = +0.5s = +12 frames
    expect(
      trimFromDrag({ ...base, side: "left", dxPx: 48, shift: false }),
    ).toEqual({ in: 24, out: 48 });
    // drag past start clamps at 0
    expect(
      trimFromDrag({ ...base, side: "left", dxPx: -999, shift: false }),
    ).toEqual({ in: 0, out: 48 });
    // drag past out-1 clamps
    expect(
      trimFromDrag({ ...base, side: "left", dxPx: 9999, shift: false }),
    ).toEqual({ in: 47, out: 48 });
  });
  it("right edge moves `out`, clamped to [in+1, total]", () => {
    expect(
      trimFromDrag({ ...base, side: "right", dxPx: 96, shift: false }),
    ).toEqual({ in: 12, out: 72 });
    expect(
      trimFromDrag({ ...base, side: "right", dxPx: 99999, shift: false }),
    ).toEqual({ in: 12, out: 72 });
    expect(
      trimFromDrag({ ...base, side: "right", dxPx: -99999, shift: false }),
    ).toEqual({ in: 12, out: 13 });
  });
  it("shift snaps to whole seconds", () => {
    // +36px = 0.375s = 9 frames -> unsnapped 21, snapped to 24
    expect(
      trimFromDrag({ ...base, side: "left", dxPx: 36, shift: true }),
    ).toEqual({ in: 24, out: 48 });
    // right: 48 + 9 = 57 -> snaps to 48? 57/24=2.375 -> round = 2 -> 48
    expect(
      trimFromDrag({ ...base, side: "right", dxPx: 36, shift: true }),
    ).toEqual({ in: 12, out: 48 });
  });
});

describe("moveFromDrag", () => {
  it("moves by frames and clamps at 0, shift snaps to seconds", () => {
    // +48px = 12 frames at 96px/s, 24fps
    expect(moveFromDrag(24, 48, 96, 24, false)).toBe(36);
    expect(moveFromDrag(10, -999, 96, 24, false)).toBe(0);
    // 9 frames -> snapped to 24+24? start 24 + 9 = 33 -> snaps to 24
    expect(moveFromDrag(24, 36, 96, 24, true)).toBe(24);
  });
});

describe("nextZoomToFit", () => {
  it("fits the sequence into the width, clamped to [10, 200]", () => {
    expect(nextZoomToFit(84, 24, 350)).toBe(100); // 3.5s -> 100px/s
    expect(nextZoomToFit(84, 24, 10)).toBe(10); // clamps at min
    expect(nextZoomToFit(24, 24, 800)).toBe(200); // 1s -> 800 clamps at max
  });
});

describe("tickStep", () => {
  it("picks 1, 2, 5 or 10 so labels are at least 64px apart", () => {
    expect(tickStep(10)).toBe(10); // 10s*10 = 100
    expect(tickStep(20)).toBe(5); // 5*20 = 100
    expect(tickStep(40)).toBe(2); // 2*40 = 80
    expect(tickStep(100)).toBe(1); // 1*100 = 100
    expect(tickStep(5)).toBe(10); // 10*5 = 50 <64 -> still 10 (the largest)
  });
});
