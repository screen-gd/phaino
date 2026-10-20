/** ffmpeg arg builders for media conforming (NLE package). */
import {
  outputSize,
  type SequenceAspect,
  type SequenceFit,
  type SequenceResolution,
} from "./timecode";

export type ExportCodec = "h264" | "prores";

export function codecExt(codec: ExportCodec): ".mp4" | ".mov" {
  return codec === "prores" ? ".mov" : ".mp4";
}

function codecArgs(codec: ExportCodec): string[] {
  return codec === "prores"
    ? [
        "-c:v", "prores_ks",
        "-profile:v", "3",
        "-vendor", "apl0",
        "-pix_fmt", "yuv422p10le",
        "-c:a", "pcm_s16le",
      ]
    : [
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
      ];
}

export type MediaCommand = {
  src: string;
  out: string;
  fps: number;
  aspect: SequenceAspect;
  resolution: SequenceResolution;
  fit: SequenceFit;
  startFrame: number;
  endFrame: number;
  codec: ExportCodec;
  hasAudio: boolean;
};

/**
 * Conform a media range: project fps and aspect (letterbox/crop) with handles,
 * audio carried through when present.
 */
export function buildMediaCommand(c: MediaCommand): string[] {
  const [w, h] = outputSize(c.aspect, c.resolution);
  const scale =
    c.fit === "cover"
      ? `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`
      : `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black`;
  const video = `[0:v]fps=${c.fps},trim=start_frame=${c.startFrame}:end_frame=${c.endFrame},setpts=PTS-STARTPTS,${scale},setsar=1[v]`;
  const audio = `[0:a]atrim=start=${c.startFrame / c.fps}:end=${c.endFrame / c.fps},asetpts=PTS-STARTPTS[a]`;
  return [
    "-y",
    "-hide_banner",
    "-nostats",
    "-progress", "pipe:1",
    "-i", c.src,
    "-filter_complex",
    c.hasAudio ? `${video};${audio}` : video,
    "-map", "[v]",
    ...(c.hasAudio ? ["-map", "[a]"] : ["-an"]),
    ...codecArgs(c.codec),
    "-r", String(c.fps),
    c.out,
  ];
}
