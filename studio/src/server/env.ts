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
  CUTAWAY_DATA_DIR: optionalString,
  CUTAWAY_USER: optionalString,
});

function buildEnv() {
  const e = envSchema.parse(process.env);
  return {
    comfyApiKey: e.COMFY_API_KEY,
    comfyBaseUrl: e.COMFY_BASE_URL,
    presetsDir: path.resolve(/* turbopackIgnore: true */ process.cwd(), e.PRESETS_DIR ?? "../presets"),
    forksDir: path.resolve(/* turbopackIgnore: true */ process.cwd(), e.FORKS_DIR ?? "../forks"),
    dataDir: path.resolve(/* turbopackIgnore: true */ process.cwd(), e.CUTAWAY_DATA_DIR ?? ".data"),
    user: e.CUTAWAY_USER ?? "local",
  };
}

export type StudioEnv = ReturnType<typeof buildEnv>;

let cached: StudioEnv | undefined;

/** Parsed studio environment, resolved once per process. */
export function getEnv(): StudioEnv {
  return (cached ??= buildEnv());
}
