import { describe, expect, it } from "vitest";
import {
  clampTrim,
  emptySequence,
  handlesFor,
  layout,
  mediaFrames,
  normalizeSequence,
  parseSequence,
  rescaleSequence,
  transitionFrames,
  type Clip,
  type Media,
  type Sequence,
} from "./model";

function media(over: Partial<Media> = {}): Media {
  return {
    id: "a",
    path: "test/a.mp4",
    name: "a.mp4",
    kind: "video",
    srcFps: 24,
    width: 1920,
    height: 1080,
    durationSec: 3, // 72 frames at 24fps
    hasAudio: true,
    ...over,
  };
}

function clip(over: Partial<Clip> = {}): Clip {
  return {
    id: "a",
    mediaId: "a",
    in: 0,
    out: 72,
    volume: 1,
    muted: false,
    fadeIn: 0,
    fadeOut: 0,
    transition: { type: "cut", frames: 0 },
    ...over,
  };
}

function seqWith(
  media: Media[],
  clips: Clip[],
  extra: Partial<Sequence> = {},
): Sequence {
  return { ...emptySequence(), media, clips, ...extra };
}

describe("parseSequence migration", () => {
  it("migrates a v1 file: clip becomes media with the same id", () => {
    const v1 = {
      fps: 24,
      resolution: "1080p",
      handles: 12,
      settingsTouched: true,
      clips: [
        {
          id: "old-clip",
          path: "test/a.mp4",
          name: "a.mp4",
          srcFps: 24,
          width: 1920,
          height: 1080,
          durationSec: 3,
          in: 4,
          out: 60,
        },
      ],
    };
    const seq = parseSequence(v1)!;
    expect(seq.version).toBe(2);
    expect(seq.media).toHaveLength(1);
    expect(seq.media[0]).toMatchObject({
      id: "old-clip",
      kind: "video",
      path: "test/a.mp4",
      durationSec: 3,
    });
    expect(seq.clips[0]).toMatchObject({
      id: "old-clip",
      mediaId: "old-clip",
      in: 4,
      out: 60,
      volume: 1,
      muted: false,
      transition: { type: "cut", frames: 0 },
    });
    // Posters stay keyed by media id, so the old poster still resolves.
    expect(seq.clips[0].mediaId).toBe("old-clip");
  });

  it("parses a v2 file unchanged", () => {
    const v2 = seqWith([media()], [clip()]);
    const seq = parseSequence(JSON.parse(JSON.stringify(v2)));
    expect(seq).toEqual(v2);
  });

  it("returns null on garbage", () => {
    expect(parseSequence({ nope: true })).toBeNull();
  });
});

describe("mediaFrames / clampTrim", () => {
  it("frames are duration at the project fps", () => {
    expect(mediaFrames(media(), 24)).toBe(72);
    expect(mediaFrames(media(), 30)).toBe(90);
  });

  it("clamps into [0, total-1] x [in+1, total]", () => {
    expect(clampTrim(72, -5, 500)).toEqual({ in: 0, out: 72 });
    expect(clampTrim(72, 10, 10)).toEqual({ in: 10, out: 11 });
    expect(clampTrim(72, 71, 71)).toEqual({ in: 71, out: 72 });
    expect(clampTrim(72, 100, 200)).toEqual({ in: 71, out: 72 });
  });
});

describe("handlesFor", () => {
  it("clamps head at the in point and tail at the end", () => {
    const c = clip({ in: 4, out: 60 });
    expect(handlesFor(c, media(), 24, 12)).toEqual({
      head: 4,
      tail: 12,
      clampedHead: true,
      clampedTail: false,
    });
    expect(handlesFor(c, media(), 24, 0)).toEqual({
      head: 0,
      tail: 0,
      clampedHead: false,
      clampedTail: false,
    });
    const tailBound = clip({ in: 0, out: 66 });
    expect(handlesFor(tailBound, media(), 24, 12).tail).toBe(6);
    expect(handlesFor(tailBound, media(), 24, 12).clampedTail).toBe(true);
  });
});

describe("layout", () => {
  it("is gapless from zero", () => {
    const seq = seqWith(
      [media()],
      [clip({ in: 10, out: 60 }), clip({ id: "b", in: 0, out: 25 })],
    );
    const lay = layout(seq);
    expect(lay.clips[0]).toMatchObject({ recordIn: 0, recordOut: 50 });
    expect(lay.clips[1]).toMatchObject({ recordIn: 50, recordOut: 75 });
    expect(lay.totalFrames).toBe(75);
  });

  it("crossfade overlaps the tail of A and head of B", () => {
    const seq = seqWith(
      [media()],
      [
        clip({ in: 0, out: 48, transition: { type: "crossfade", frames: 12 } }),
        clip({ id: "b", in: 0, out: 48 }),
      ],
    );
    const lay = layout(seq);
    expect(lay.clips[0]).toMatchObject({ recordIn: 0, recordOut: 48 });
    expect(lay.clips[1]).toMatchObject({ recordIn: 36, recordOut: 84 });
    expect(lay.totalFrames).toBe(84);
  });

  it("clamps a crossfade to floor(min(lenA,lenB)/2)", () => {
    const seq = seqWith(
      [media()],
      [
        clip({ in: 0, out: 48, transition: { type: "crossfade", frames: 24 } }),
        clip({ id: "b", in: 0, out: 20 }), // lenB 20 -> max 10
      ],
    );
    const lay = layout(seq);
    expect(lay.clips[0].transition.frames).toBe(10);
    expect(lay.clips[1].recordIn).toBe(38);
    expect(lay.totalFrames).toBe(58);
  });

  it("dip keeps positions gapless", () => {
    const seq = seqWith(
      [media()],
      [
        clip({ in: 0, out: 48, transition: { type: "dip", frames: 12 } }),
        clip({ id: "b", in: 0, out: 48 }),
      ],
    );
    const lay = layout(seq);
    expect(lay.clips[1].recordIn).toBe(48);
    expect(lay.totalFrames).toBe(96);
  });
});

describe("transitionFrames", () => {
  it("is zero for cuts and clamps to the shorter half", () => {
    const a = clip({ transition: { type: "cut", frames: 12 } });
    const b = clip({ in: 0, out: 20 });
    expect(transitionFrames(a, b)).toBe(0);
    const xf = clip({ transition: { type: "crossfade", frames: 60 } });
    expect(transitionFrames(xf, b)).toBe(10);
  });
});

describe("rescaleSequence", () => {
  it("scales every frame field 24 -> 30", () => {
    const seq = seqWith(
      [media(), media({ id: "m", kind: "audio", durationSec: 5 })],
      [
        clip({
          in: 24,
          out: 48,
          fadeIn: 6,
          fadeOut: 6,
          transition: { type: "crossfade", frames: 12 },
        }),
      ],
      {
        audio: [
          {
            id: "a1",
            mediaId: "m",
            start: 24,
            in: 12,
            out: 36,
            volume: 1,
            fadeIn: 6,
            fadeOut: 6,
          },
        ],
        titles: [
          {
            id: "t1",
            text: "Hi",
            start: 48,
            duration: 24,
            position: "lower",
            size: "m",
          },
        ],
      },
    );
    const scaled = rescaleSequence(seq, 30);
    expect(scaled.fps).toBe(30);
    expect(scaled.clips[0]).toMatchObject({
      in: 30,
      out: 60,
      fadeIn: 8, // round(6*30/24)=7.5 -> 8
      fadeOut: 8,
      transition: { type: "crossfade", frames: 15 },
    });
    expect(scaled.audio[0]).toMatchObject({
      start: 30,
      in: 15,
      out: 45,
      fadeIn: 8,
      fadeOut: 8,
    });
    expect(scaled.titles[0]).toMatchObject({ start: 60, duration: 30 });
  });

  it("clamps the trim at the new media length", () => {
    const seq = seqWith([media()], [clip({ in: 0, out: 72 })]);
    const scaled = rescaleSequence(seq, 25);
    expect(scaled.clips[0].out).toBe(75); // 3s * 25
  });
});

describe("normalizeSequence", () => {
  it("clamps trims and fades", () => {
    const seq = seqWith(
      [media()],
      [clip({ in: -5, out: 999, fadeIn: 100, fadeOut: 100 })],
      {
        audio: [
          {
            id: "a1",
            mediaId: "missing",
            start: -5,
            in: 0,
            out: 10,
            volume: 3,
            fadeIn: 0,
            fadeOut: 0,
          },
        ],
      },
    );
    const n = normalizeSequence(seq);
    expect(n.clips[0]).toMatchObject({ in: 0, out: 72 });
    expect(n.clips[0].fadeIn).toBe(71);
    expect(n.audio[0].start).toBe(0);
    expect(n.audio[0].volume).toBe(2);
  });
});
