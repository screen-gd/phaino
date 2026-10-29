/**
 * Kawarimi outputs keep the source clip's audio: remux each saved result so
 * its audio track is the (trimmed) source audio. Skipped when the source has
 * no audio stream. The output file is replaced in place so Library rows and
 * the stored output path stay valid.
 */
import "server-only";

import { rename } from "node:fs/promises";
import path from "node:path";
import { runFfmpeg } from "@/server/edits/prepare";
import { hasAudioStream } from "@/server/sequence/probe";

export type AudioRemuxDeps = {
  hasAudio: (absPath: string) => Promise<boolean>;
  ffmpeg: (args: string[]) => Promise<void>;
  rename: (from: string, to: string) => Promise<void>;
};

const defaultDeps: AudioRemuxDeps = {
  hasAudio: hasAudioStream,
  ffmpeg: runFfmpeg,
  rename,
};

/**
 * Mux the source clip's audio into a saved result file in place. Returns
 * false (and leaves the result alone) when the source has no audio.
 */
export async function remuxSourceAudio(
  resultPath: string,
  sourcePath: string,
  deps: AudioRemuxDeps = defaultDeps,
): Promise<boolean> {
  if (!(await deps.hasAudio(sourcePath))) return false;
  const tmp = `${resultPath}.audiomux${path.extname(resultPath)}`;
  await deps.ffmpeg([
    "-y",
    "-i", resultPath,
    "-i", sourcePath,
    "-map", "0:v:0",
    "-map", "1:a:0",
    "-c:v", "copy",
    "-c:a", "aac",
    "-shortest",
    tmp,
  ]);
  await deps.rename(tmp, resultPath);
  return true;
}
