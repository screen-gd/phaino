import "server-only";

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getEnv } from "@/server/env";

const execFileAsync = promisify(execFile);

export type ProbeResult = {
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  hasAudio: boolean;
};

function parseRate(rate: unknown): number | undefined {
  if (typeof rate !== "string" || rate === "0/0") return undefined;
  const [n, d] = rate.split("/").map(Number);
  if (!n || !d) return undefined;
  return n / d;
}

function parseSec(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

type ProbeStream = {
  codec_type?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  nb_frames?: string;
  duration?: string;
};

type ProbeOutput = {
  streams?: ProbeStream[];
  format?: { duration?: string };
};

/** Whether the file carries an audio stream. */
export async function hasAudioStream(absPath: string): Promise<boolean> {
  const { stdout } = await execFileAsync(getEnv().ffprobePath, [
    "-v", "error",
    "-select_streams", "a:0",
    "-show_entries", "stream=codec_type",
    "-of", "json",
    absPath,
  ]);
  const parsed = JSON.parse(stdout) as ProbeOutput;
  return (parsed.streams?.length ?? 0) > 0;
}

/** ffprobe one video file: size, fps, duration in seconds and audio presence. */
export async function probeVideo(absPath: string): Promise<ProbeResult> {
  const { stdout } = await execFileAsync(getEnv().ffprobePath, [
    "-v", "error",
    "-show_entries",
    "stream=codec_type,width,height,avg_frame_rate,r_frame_rate,nb_frames,duration:format=duration",
    "-of", "json",
    absPath,
  ]);
  const parsed = JSON.parse(stdout) as ProbeOutput;
  const stream = parsed.streams?.find((s) => s.codec_type === "video");
  if (!stream?.width || !stream.height) {
    throw new Error(`No video stream in ${path.basename(absPath)}`);
  }
  const fps =
    parseRate(stream.avg_frame_rate) ?? parseRate(stream.r_frame_rate);
  if (!fps) throw new Error(`No frame rate in ${path.basename(absPath)}`);
  const durationSec =
    parseSec(stream.duration) ??
    parseSec(parsed.format?.duration) ??
    (stream.nb_frames ? Number(stream.nb_frames) / fps : undefined);
  if (!durationSec) {
    throw new Error(`No duration in ${path.basename(absPath)}`);
  }
  return {
    width: stream.width,
    height: stream.height,
    fps,
    durationSec,
    hasAudio: (parsed.streams ?? []).some((s) => s.codec_type === "audio"),
  };
}

/** ffprobe an audio-only file: duration in seconds. */
export async function probeAudio(absPath: string): Promise<{
  durationSec: number;
  hasAudio: true;
}> {
  const { stdout } = await execFileAsync(getEnv().ffprobePath, [
    "-v", "error",
    "-select_streams", "a:0",
    "-show_entries", "stream=duration:format=duration",
    "-of", "json",
    absPath,
  ]);
  const parsed = JSON.parse(stdout) as ProbeOutput;
  const durationSec =
    parseSec(parsed.streams?.[0]?.duration) ??
    parseSec(parsed.format?.duration);
  if (!durationSec) {
    throw new Error(`No audio stream in ${path.basename(absPath)}`);
  }
  return { durationSec, hasAudio: true };
}

/** A 480px-wide jpeg poster of the frame at `atSec`. */
export async function makePoster(
  absPath: string,
  outFile: string,
  atSec = 0,
): Promise<void> {
  await mkdir(path.dirname(outFile), { recursive: true });
  await execFileAsync(getEnv().ffmpegPath, [
    "-y",
    "-ss", String(atSec),
    "-i", absPath,
    "-frames:v", "1",
    "-vf", "scale=480:-2",
    "-q:v", "4",
    outFile,
  ]);
}
