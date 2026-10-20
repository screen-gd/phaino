import { describe, expect, it } from "vitest";
import { emptySequence, type Media, type Sequence } from "./model";
import { buildRenderCommand, escapeDrawtext, type RenderMedia } from "./render";

function media(over: Partial<Media>): Media {
  return {
    id: "m",
    path: "x.mp4",
    name: "x.mp4",
    kind: "video",
    srcFps: 24,
    width: 1920,
    height: 1080,
    durationSec: 4,
    hasAudio: true,
    ...over,
  };
}

function seqFixture(): Sequence {
  return {
    ...emptySequence(),
    media: [
      media({ id: "v1", path: "a.mp4", name: "a.mp4" }),
      media({ id: "v2", path: "b.mp4", name: "b.mp4" }),
      media({ id: "v3", path: "c.mp4", name: "c.mp4", hasAudio: false }),
      media({ id: "img", path: "still.png", name: "still.png", kind: "image", durationSec: 60, srcFps: 0, hasAudio: false }),
      media({ id: "mus", path: "song.mp3", name: "song.mp3", kind: "audio", durationSec: 30, srcFps: 0 }),
    ],
    clips: [
      // a cut
      { id: "c1", mediaId: "v1", in: 0, out: 48, volume: 1, muted: false, fadeIn: 0, fadeOut: 0, transition: { type: "cut", frames: 0 } },
      // a crossfade into the next clip
      { id: "c2", mediaId: "v2", in: 0, out: 48, volume: 1, muted: false, fadeIn: 0, fadeOut: 0, transition: { type: "crossfade", frames: 12 } },
      // a muted clip with a dip into the still
      { id: "c3", mediaId: "v3", in: 12, out: 60, volume: 1, muted: true, fadeIn: 0, fadeOut: 0, transition: { type: "dip", frames: 6 } },
      // an image still
      { id: "c4", mediaId: "img", in: 0, out: 24, volume: 1, muted: false, fadeIn: 0, fadeOut: 0, transition: { type: "cut", frames: 0 } },
    ],
    audio: [
      { id: "a1", mediaId: "mus", start: 0, in: 0, out: 144, volume: 0.8, fadeIn: 6, fadeOut: 12 },
    ],
    titles: [
      { id: "t1", text: "Opening: it's 100% live", start: 0, duration: 48, position: "lower", size: "l" },
      { id: "t2", text: "Part [two] \\ done", start: 96, duration: 24, position: "top", size: "s" },
    ],
  };
}

function renderMedia(seq: Sequence): Map<string, RenderMedia> {
  return new Map(
    seq.media.map((m) => [
      m.id,
      { id: m.id, absPath: `/data/${m.path}`, kind: m.kind, hasAudio: m.hasAudio },
    ]),
  );
}

describe("buildRenderCommand", () => {
  it("builds the full graph: cuts, crossfade, dip, mute, still, music, titles", () => {
    const seq = seqFixture();
    const { args, totalFrames } = buildRenderCommand(
      seq,
      renderMedia(seq),
      { fontFile: "C:/fonts/Outfit.ttf", out: "out.mp4" },
    );
    expect(totalFrames).toBe(48 + 48 + 48 + 24 - 12); // one crossfade overlaps 12
    expect(args).toMatchSnapshot();
    const fc = args[args.indexOf("-filter_complex") + 1];
    // crossfade: xfade + acrossfade at the overlapped boundary
    expect(fc).toContain("xfade=transition=fade:duration=0.5:offset=3.5");
    expect(fc).toContain("acrossfade=d=0.5");
    // dip: clip 3 fades out over its last 6 frames and still fades in
    expect(fc).toContain("fade=t=out:st=1.75:d=0.25");
    // muted clip: volume=0 on its atrim chain
    expect(fc).toContain("volume=0[a2]");
    // still input loops; music delays 0ms and fades
    expect(args).toContain("-loop");
    expect(fc).toContain("adelay=0|0");
    expect(fc).toContain("afade=t=in:st=0:d=0.25");
    expect(fc).toContain("afade=t=out:st=5.5:d=0.5");
    // titles: two drawtext filters, escaped
    expect(fc.match(/drawtext=/g)).toHaveLength(2);
    expect(fc).toContain("enable='between(t,0,2)'");
    expect(fc).toContain("enable='between(t,4,5)'");
    // aac mix + h264 faststart
    expect(args).toContain("+faststart");
    expect(args).toContain("aac");
    expect(args[args.length - 1]).toBe("out.mp4");
  });
});

describe("escapeDrawtext", () => {
  it("escapes colons, quotes, percent, commas and backslashes", () => {
    expect(escapeDrawtext("a:b")).toBe("a\\:b");
    expect(escapeDrawtext("it's")).toBe("it\\'s");
    expect(escapeDrawtext("100%")).toBe("100\\\\%");
    expect(escapeDrawtext("a,b;c")).toBe("a\\,b\\;c");
    expect(escapeDrawtext("[x]")).toBe("\\[x\\]");
    expect(escapeDrawtext("back\\slash")).toBe("back\\\\slash");
  });
});
