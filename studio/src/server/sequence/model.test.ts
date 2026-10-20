import { describe, expect, it } from "vitest";
import {
  clampTrim,
  clipFrames,
  emptySequence,
  handlesFor,
  layout,
  normalizeSequence,
  rescaleSequence,
  type Clip,
} from "./model";

function clip(over: Partial<Clip> = {}): Clip {
  return {
    id: "a",
    path: "test/a.mp4",
    name: "a.mp4",
    srcFps: 24,
    width: 1920,
    height: 1080,
    durationSec: 3, // 72 frames at 24fps
    in: 0,
    out: 72,
    ...over,
  };
}

describe("clipFrames", () => {
  it("is duration in project frames", () => {
    expect(clipFrames(clip(), 24)).toBe(72);
    expect(clipFrames(clip(), 30)).toBe(90);
  });
});

describe("clampTrim", () => {
  it("clamps into [0, total-1] x [in+1, total]", () => {
    const c = clip();
    expect(clampTrim(c, 24, -5, 500)).toEqual({ in: 0, out: 72 });
    expect(clampTrim(c, 24, 10, 10)).toEqual({ in: 10, out: 11 });
    expect(clampTrim(c, 24, 71, 71)).toEqual({ in: 71, out: 72 });
    expect(clampTrim(c, 24, 100, 200)).toEqual({ in: 71, out: 72 });
  });
});

describe("handlesFor", () => {
  it("clamps head at the in point and tail at the end", () => {
    const c = clip({ in: 4, out: 60 });
    expect(handlesFor(c, 24, 12)).toEqual({
      head: 4,
      tail: 12,
      clampedHead: true,
      clampedTail: false,
    });
    expect(handlesFor(c, 24, 0)).toEqual({
      head: 0,
      tail: 0,
      clampedHead: false,
      clampedTail: false,
    });
    const tailBound = clip({ in: 0, out: 66 });
    expect(handlesFor(tailBound, 24, 12).tail).toBe(6);
    expect(handlesFor(tailBound, 24, 12).clampedTail).toBe(true);
  });
});

describe("rescaleSequence", () => {
  it("scales in/out from 24 to 30 and clamps", () => {
    const seq = {
      ...emptySequence(),
      clips: [clip({ in: 24, out: 48 })],
    };
    const scaled = rescaleSequence(seq, 30);
    expect(scaled.fps).toBe(30);
    expect(scaled.clips[0].in).toBe(30);
    expect(scaled.clips[0].out).toBe(60);
    // Beyond the new total (3s*30=90 is fine; try a clip that overflows)
    const over = rescaleSequence(
      { ...emptySequence(), clips: [clip({ in: 0, out: 72 })] },
      25,
    );
    expect(over.clips[0].out).toBe(75); // 3s * 25, still the full clip
  });
});

describe("layout", () => {
  it("is gapless from zero", () => {
    const seq = {
      ...emptySequence(),
      clips: [clip({ id: "a", in: 10, out: 60 }), clip({ id: "b", in: 0, out: 25 })],
    };
    const lay = layout(seq);
    expect(lay.clips[0]).toEqual({ recordIn: 0, recordOut: 50 });
    expect(lay.clips[1]).toEqual({ recordIn: 50, recordOut: 75 });
    expect(lay.totalFrames).toBe(75);
  });
});

describe("normalizeSequence", () => {
  it("clamps every trim", () => {
    const seq = {
      ...emptySequence(),
      clips: [clip({ in: -5, out: 999 })],
    };
    const n = normalizeSequence(seq);
    expect(n.clips[0].in).toBe(0);
    expect(n.clips[0].out).toBe(72);
  });
});
