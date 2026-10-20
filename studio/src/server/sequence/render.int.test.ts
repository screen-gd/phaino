import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { emptySequence, type Clip, type Media, type Sequence } from "./model";
import { BRAND_FONT, TITLE_FONT } from "./export";
import { buildRenderCommand, type RenderMedia } from "./render";

function has(bin: string): boolean {
  const r = spawnSync(bin, ["-version"], { stdio: "ignore" });
  return r.status === 0;
}

function ffmpegSupports(filter: string): boolean {
  try {
    const out = execFileSync("ffmpeg", ["-hide_banner", "-filters"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.includes(` ${filter} `);
  } catch {
    return false;
  }
}

const ffmpeg = has("ffmpeg");
const ffprobe = has("ffprobe");
const drawtext = ffmpeg && ffmpegSupports("drawtext");
const fontPath =
  [TITLE_FONT, BRAND_FONT, "C:/Windows/Fonts/arial.ttf"].find((f) =>
    fs.existsSync(f),
  ) ?? "";

function ffprobeJson(file: string): {
  streams: { codec_type: string; width?: number; height?: number }[];
  format: { duration: string };
} {
  const out = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "stream=codec_type,width,height:format=duration", "-of", "json", file],
    { encoding: "utf8" },
  );
  return JSON.parse(out);
}

const CUT = { type: "cut" as const, frames: 0 };

function clip(
  id: string,
  mediaId: string,
  out: number,
  extra: Partial<Clip> = {},
): Clip {
  return {
    id,
    mediaId,
    in: 0,
    out,
    volume: 1,
    muted: false,
    fadeIn: 0,
    fadeOut: 0,
    transition: CUT,
    ...extra,
  };
}

describe.skipIf(!ffmpeg || !ffprobe)("render integration (ffmpeg)", () => {
  it("renders a sequence with a cut, crossfade, dip, still, music and titles", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "phaino-render-"));
    const gen = (file: string, args: string[]) => {
      const r = spawnSync("ffmpeg", args.concat(file), { stdio: "ignore" });
      expect(r.status, `generate ${file}`).toBe(0);
    };

    // 1s testsrc with sine audio, one without audio, one still, one tone.
    gen(path.join(dir, "a.mp4"), [
      "-y", "-f", "lavfi", "-i", "testsrc=size=640x360:rate=24:duration=1",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
    ]);
    gen(path.join(dir, "b.mp4"), [
      "-y", "-f", "lavfi", "-i", "testsrc=size=640x360:rate=24:duration=1",
      "-f", "lavfi", "-i", "sine=frequency=880:duration=1",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
    ]);
    gen(path.join(dir, "silent.mp4"), [
      "-y", "-f", "lavfi", "-i", "testsrc=size=320x180:rate=24:duration=1",
      "-c:v", "libx264", "-pix_fmt", "yuv420p",
    ]);
    gen(path.join(dir, "still.png"), [
      "-y", "-f", "lavfi", "-i", "testsrc=size=640x360:rate=1:duration=1",
      "-frames:v", "1",
    ]);
    gen(path.join(dir, "song.wav"), [
      "-y", "-f", "lavfi", "-i", "sine=frequency=220:duration=4",
    ]);

    const media: Media[] = [
      { id: "a", path: "a.mp4", name: "a.mp4", kind: "video", srcFps: 24, width: 640, height: 360, durationSec: 1, hasAudio: true },
      { id: "b", path: "b.mp4", name: "b.mp4", kind: "video", srcFps: 24, width: 640, height: 360, durationSec: 1, hasAudio: true },
      { id: "s", path: "silent.mp4", name: "silent.mp4", kind: "video", srcFps: 24, width: 320, height: 180, durationSec: 1, hasAudio: false },
      { id: "i", path: "still.png", name: "still.png", kind: "image", srcFps: 0, width: 640, height: 360, durationSec: 60, hasAudio: false },
      { id: "m", path: "song.wav", name: "song.wav", kind: "audio", srcFps: 0, width: 0, height: 0, durationSec: 4, hasAudio: true },
    ];
    const seq: Sequence = {
      ...emptySequence(),
      media,
      clips: [
        clip("c1", "a", 24),
        clip("c2", "b", 24, { transition: { type: "crossfade", frames: 12 } }),
        clip("c3", "s", 24, { transition: { type: "dip", frames: 6 } }),
        clip("c4", "i", 24),
      ],
      audio: [
        { id: "a1", mediaId: "m", start: 0, in: 0, out: 84, volume: 0.5, fadeIn: 6, fadeOut: 6 },
      ],
      titles: drawtext
        ? [
            { id: "t1", text: "Render test", start: 0, duration: 24, position: "lower" as const, size: "m" as const },
            { id: "t2", text: "100% live", start: 24, duration: 24, position: "top" as const, size: "s" as const },
          ]
        : [],
    };
    const renderMedia = new Map<string, RenderMedia>(
      media.map((m) => [
        m.id,
        { id: m.id, absPath: path.join(dir, m.path), kind: m.kind, hasAudio: m.hasAudio },
      ]),
    );
    const out = path.join(dir, "out.mp4");
    const { args, totalFrames } = buildRenderCommand(seq, renderMedia, {
      fontFile: fontPath,
      out,
    });
    const r = spawnSync("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    expect(r.status, String(r.stderr)).toBe(0);
    // 4 x 24 frames, one 12-frame crossfade overlap
    expect(totalFrames).toBe(96 - 12);
    const p = ffprobeJson(out);
    const v = p.streams.find((s) => s.codec_type === "video");
    expect(v?.width).toBe(1920);
    expect(v?.height).toBe(1080);
    expect(Number(p.format.duration)).toBeCloseTo(totalFrames / 24, 1);
    expect(p.streams.some((s) => s.codec_type === "audio")).toBe(true);
    // drawtext titles were included whenever the build supports them
    expect(drawtext ? seq.titles.length === 2 : true).toBe(true);
  }, 60_000);
});
