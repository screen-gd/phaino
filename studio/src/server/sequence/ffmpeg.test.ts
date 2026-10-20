import { describe, expect, it } from "vitest";
import { buildMediaCommand, codecExt } from "./ffmpeg";
import { outputSize } from "./timecode";

describe("outputSize", () => {
  it("short edge is 1080 or 2160", () => {
    expect(outputSize("16:9", "1080p")).toEqual([1920, 1080]);
    expect(outputSize("16:9", "4K")).toEqual([3840, 2160]);
    expect(outputSize("9:16", "1080p")).toEqual([1080, 1920]);
    expect(outputSize("9:16", "4K")).toEqual([2160, 3840]);
    expect(outputSize("1:1", "1080p")).toEqual([1080, 1080]);
    expect(outputSize("1:1", "4K")).toEqual([2160, 2160]);
    expect(outputSize("4:5", "1080p")).toEqual([1080, 1350]);
    expect(outputSize("4:5", "4K")).toEqual([2160, 2700]);
  });
});

describe("buildMediaCommand", () => {
  const base = {
    src: "in.mp4",
    out: "out.mp4",
    fps: 24,
    aspect: "16:9" as const,
    resolution: "1080p" as const,
    fit: "contain" as const,
    startFrame: 12,
    endFrame: 60,
    codec: "h264" as const,
    hasAudio: true,
  };

  it("conforms a clip with audio, h264", () => {
    expect(buildMediaCommand(base)).toEqual([
      "-y", "-hide_banner", "-nostats", "-progress", "pipe:1",
      "-i", "in.mp4",
      "-filter_complex",
      "[0:v]fps=24,trim=start_frame=12:end_frame=60,setpts=PTS-STARTPTS," +
        "scale=1920:1080:force_original_aspect_ratio=decrease," +
        "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1[v];" +
        "[0:a]atrim=start=0.5:end=2.5,asetpts=PTS-STARTPTS[a]",
      "-map", "[v]",
      "-map", "[a]",
      "-c:v", "libx264", "-preset", "medium", "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "192k",
      "-r", "24",
      "out.mp4",
    ]);
  });

  it("drops the audio chain for a silent source", () => {
    const args = buildMediaCommand({ ...base, hasAudio: false });
    const fc = args[args.indexOf("-filter_complex") + 1];
    expect(fc).not.toContain("[0:a]");
    expect(args).toContain("-an");
    expect(args).not.toContain("[a]");
  });

  it("cover crops; prores at 4K", () => {
    const args = buildMediaCommand({
      ...base,
      fit: "cover",
      aspect: "9:16",
      resolution: "4K",
      codec: "prores",
      hasAudio: false,
    });
    const fc = args[args.indexOf("-filter_complex") + 1];
    expect(fc).toContain("scale=2160:3840:force_original_aspect_ratio=increase");
    expect(fc).toContain("crop=2160:3840");
    expect(args).toContain("prores_ks");
    expect(args).toContain("pcm_s16le");
    expect(codecExt("prores")).toBe(".mov");
    expect(codecExt("h264")).toBe(".mp4");
  });
});
