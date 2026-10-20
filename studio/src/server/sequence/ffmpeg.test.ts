import { describe, expect, it } from "vitest";
import {
  buildMediaCommand,
  buildSequenceCommand,
  codecArgs,
  codecExt,
  conformFilter,
} from "./ffmpeg";

describe("conformFilter", () => {
  it("orders fps before trim so frame numbers are project frames", () => {
    expect(
      conformFilter({
        fps: 24,
        width: 1920,
        height: 1080,
        startFrame: 12,
        endFrame: 60,
      }),
    ).toBe(
      "fps=24,trim=start_frame=12:end_frame=60,setpts=PTS-STARTPTS," +
        "scale=1920:1080:force_original_aspect_ratio=decrease," +
        "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1",
    );
  });
});

describe("codecArgs", () => {
  it("h264", () => {
    expect(codecArgs("h264")).toEqual([
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
    ]);
    expect(codecExt("h264")).toBe(".mp4");
  });
  it("prores", () => {
    expect(codecArgs("prores")).toEqual([
      "-c:v", "prores_ks",
      "-profile:v", "2",
      "-pix_fmt", "yuv422p10le",
      "-vendor", "apl0",
    ]);
    expect(codecExt("prores")).toBe(".mov");
  });
});

describe("buildMediaCommand", () => {
  const base = {
    src: "in.mp4",
    out: "out.mp4",
    fps: 24,
    resolution: "1080p",
    startFrame: 12,
    endFrame: 60,
  } as const;

  it("h264", () => {
    expect(buildMediaCommand({ ...base, codec: "h264" })).toEqual([
      "-y", "-hide_banner", "-nostats", "-progress", "pipe:1",
      "-i", "in.mp4",
      "-vf",
      "fps=24,trim=start_frame=12:end_frame=60,setpts=PTS-STARTPTS," +
        "scale=1920:1080:force_original_aspect_ratio=decrease," +
        "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1",
      "-an",
      "-c:v", "libx264", "-preset", "medium", "-crf", "18",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      "-r", "24",
      "out.mp4",
    ]);
  });

  it("prores at 4K", () => {
    expect(
      buildMediaCommand({ ...base, codec: "prores", resolution: "4K" }),
    ).toEqual([
      "-y", "-hide_banner", "-nostats", "-progress", "pipe:1",
      "-i", "in.mp4",
      "-vf",
      "fps=24,trim=start_frame=12:end_frame=60,setpts=PTS-STARTPTS," +
        "scale=3840:2160:force_original_aspect_ratio=decrease," +
        "pad=3840:2160:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1",
      "-an",
      "-c:v", "prores_ks", "-profile:v", "2",
      "-pix_fmt", "yuv422p10le", "-vendor", "apl0",
      "-r", "24",
      "out.mp4",
    ]);
  });
});

describe("buildSequenceCommand", () => {
  const clips = [
    { src: "a.mp4", inFrame: 0, outFrame: 48 },
    { src: "b.mp4", inFrame: 4, outFrame: 28 },
  ];

  it("concats two clips, h264", () => {
    const args = buildSequenceCommand({
      clips,
      fps: 24,
      resolution: "1080p",
      codec: "h264",
      out: "seq.mp4",
    });
    const expectFilter =
      "[0:v]fps=24,trim=start_frame=0:end_frame=48,setpts=PTS-STARTPTS," +
      "scale=1920:1080:force_original_aspect_ratio=decrease," +
      "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1[v0];" +
      "[1:v]fps=24,trim=start_frame=4:end_frame=28,setpts=PTS-STARTPTS," +
      "scale=1920:1080:force_original_aspect_ratio=decrease," +
      "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1[v1];" +
      "[v0][v1]concat=n=2:v=1:a=0[out]";
    expect(args).toEqual([
      "-y", "-hide_banner", "-nostats", "-progress", "pipe:1",
      "-i", "a.mp4",
      "-i", "b.mp4",
      "-filter_complex", expectFilter,
      "-map", "[out]",
      "-an",
      "-c:v", "libx264", "-preset", "medium", "-crf", "18",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      "-r", "24",
      "seq.mp4",
    ]);
  });

  it("concats two clips, prores", () => {
    const args = buildSequenceCommand({
      clips,
      fps: 30,
      resolution: "4K",
      codec: "prores",
      out: "seq.mov",
    });
    expect(args).toContain("-c:v");
    expect(args[args.indexOf("-c:v") + 1]).toBe("prores_ks");
    expect(args[args.length - 1]).toBe("seq.mov");
    const fc = args[args.indexOf("-filter_complex") + 1];
    expect(fc).toContain("fps=30");
    expect(fc).toContain("scale=3840:2160");
    expect(fc.endsWith("concat=n=2:v=1:a=0[out]")).toBe(true);
  });
});
