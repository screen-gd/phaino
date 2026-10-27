import "server-only";
import path from "node:path";
import { z } from "zod";

const blank = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optionalString = z.preprocess(blank, z.string().optional());
const optionalHttpUrl = z.preprocess(
  blank,
  z
    .string()
    .refine(
      (s) => {
        try {
          const protocol = new URL(s).protocol;
          return protocol === "http:" || protocol === "https:";
        } catch {
          return false;
        }
      },
      { error: "Must be an http(s) URL" },
    )
    .optional(),
);

const envSchema = z.object({
  COMFY_API_KEY: optionalString,
  COMFY_BASE_URL: optionalHttpUrl,
  PRESETS_DIR: optionalString,
  FORKS_DIR: optionalString,
  PHAINO_DATA_DIR: optionalString,
  PHAINO_USER: optionalString,
  NEXT_PUBLIC_SITE_URL: optionalString,
  PHAINO_SITE_URL: optionalString,
  FFMPEG_PATH: optionalString,
  FFPROBE_PATH: optionalString,
  // Old CUTAWAY_* names still work as fallbacks.
  CUTAWAY_DATA_DIR: optionalString,
  CUTAWAY_USER: optionalString,
  TRACKER_FILE: optionalString,
});

function buildEnv() {
  const e = envSchema.parse(process.env);
  const dataDir = path.resolve(/* turbopackIgnore: true */ process.cwd(), e.PHAINO_DATA_DIR ?? e.CUTAWAY_DATA_DIR ?? ".data");
  return {
    comfyApiKey: e.COMFY_API_KEY,
    comfyBaseUrl: e.COMFY_BASE_URL,
    presetsDir: path.resolve(/* turbopackIgnore: true */ process.cwd(), e.PRESETS_DIR ?? "../presets"),
    dataDir,
    user: e.PHAINO_USER ?? e.CUTAWAY_USER ?? "local",
    siteUrl: e.NEXT_PUBLIC_SITE_URL ?? e.PHAINO_SITE_URL ?? "https://app.phaino.us.ci",
    ffmpegPath: e.FFMPEG_PATH ?? "ffmpeg",
    ffprobePath: e.FFPROBE_PATH ?? "ffprobe",
    forksDir: path.resolve(/* turbopackIgnore: true */ process.cwd(), e.FORKS_DIR ?? path.join(dataDir, "forks")),
    trackerFile: path.resolve(/* turbopackIgnore: true */ process.cwd(), e.TRACKER_FILE ?? "../tracker/tasks.json"),
  };
}

export type StudioEnv = ReturnType<typeof buildEnv>;

let cached: StudioEnv | undefined;

/** Parsed studio environment, resolved once per process. */
export function getEnv(): StudioEnv {
  return (cached ??= buildEnv());
}
