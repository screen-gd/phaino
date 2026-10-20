/** Pure ffmpeg arg builders. The fps filter runs first so trim frames are project frames. */
import type { Fps } from "./timecode";
import { RESOLUTIONS, type SequenceResolution } from "./timecode";

export type ExportCodec = "h264" | "prores";

export function conformFilter({
  fps,
  width,
  height,
  startFrame,
  endFrame,
}: {
  fps: Fps;
  width: number;
  height: number;
  startFrame: number;
  endFrame: number;
}): string {
  return [
    `fps=${fps}`,
    `trim=start_frame=${startFrame}:end_frame=${endFrame}`,
    "setpts=PTS-STARTPTS",
    `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`,
    "setsar=1",
  ].join(",");
}

export function codecArgs(codec: ExportCodec): string[] {
  return codec === "h264"
    ? [
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
      ]
    : [
        "-c:v", "prores_ks",
        "-profile:v", "2",
        "-pix_fmt", "yuv422p10le",
        "-vendor", "apl0",
      ];
}

export function codecExt(codec: ExportCodec): ".mp4" | ".mov" {
  return codec === "h264" ? ".mp4" : ".mov";
}

/** Conform one clip's frames [startFrame, endFrame) to project fps+size. */
export function buildMediaCommand({
  src,
  out,
  fps,
  resolution,
  startFrame,
  endFrame,
  codec,
}: {
  src: string;
  out: string;
  fps: Fps;
  resolution: SequenceResolution;
  startFrame: number;
  endFrame: number;
  codec: ExportCodec;
}): string[] {
  const [width, height] = RESOLUTIONS[resolution];
  return [
    "-y",
    "-hide_banner",
    "-nostats",
    "-progress", "pipe:1",
    "-i", src,
    "-vf", conformFilter({ fps, width, height, startFrame, endFrame }),
    "-an",
    ...codecArgs(codec),
    "-r", String(fps),
    out,
  ];
}

/** Concatenate clips into the sequence movie (sources trimmed in-frame). */
export function buildSequenceCommand({
  clips,
  fps,
  resolution,
  codec,
  out,
}: {
  clips: { src: string; inFrame: number; outFrame: number }[];
  fps: Fps;
  resolution: SequenceResolution;
  codec: ExportCodec;
  out: string;
}): string[] {
  const [width, height] = RESOLUTIONS[resolution];
  const parts = clips.map(
    (c, i) =>
      `[${i}:v]${conformFilter({ fps, width, height, startFrame: c.inFrame, endFrame: c.outFrame })}[v${i}]`,
  );
  const inputs = clips.map((_, i) => `[v${i}]`).join("");
  const filterComplex = `${parts.join(";")};${inputs}concat=n=${clips.length}:v=1:a=0[out]`;
  const args = ["-y", "-hide_banner", "-nostats", "-progress", "pipe:1"];
  for (const c of clips) args.push("-i", c.src);
  args.push(
    "-filter_complex", filterComplex,
    "-map", "[out]",
    "-an",
    ...codecArgs(codec),
    "-r", String(fps),
    out,
  );
  return args;
}
