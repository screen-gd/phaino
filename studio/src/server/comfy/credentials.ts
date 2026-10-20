import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import { COMFY_CLOUD_BASE_URL } from "@comfyorg/sdk";
import { z } from "zod";
import { getEnv, type StudioEnv } from "@/server/env";
import type { ComfyHealth } from "@/lib/health";
import { probeEndpoint } from "./health";
import { QueuedJsonFile } from "@/server/jsonFile";

export const credentialsSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  savedAt: z.string(),
});
export type ComfyCredentials = z.infer<typeof credentialsSchema>;

type FileData = { credentials: ComfyCredentials | null };

/** "••••" + the last 4 characters, for display masking. */
export function maskKey(key: string): string {
  return key.length >= 8 ? `\u2022\u2022\u2022\u2022${key.slice(-4)}` : "\u2022\u2022\u2022\u2022";
}

/**
 * The key saved in Settings, stored at ${dataDir}/comfy.json.
 * Synchronous read so comfyTarget() can stay sync for the runner.
 */
export function getStoredComfyCredentials(
  env: StudioEnv = getEnv(),
): ComfyCredentials | null {
  try {
    const raw = JSON.parse(
      readFileSync(path.join(env.dataDir, "comfy.json"), "utf8"),
    ) as FileData;
    return raw?.credentials ? credentialsSchema.parse(raw.credentials) : null;
  } catch {
    return null;
  }
}

function file(env: StudioEnv) {
  return new QueuedJsonFile<FileData>(path.join(env.dataDir, "comfy.json"), () => ({
    credentials: null,
  }));
}

export async function saveComfyCredentials(
  credentials: ComfyCredentials,
  env: StudioEnv = getEnv(),
): Promise<void> {
  await file(env).update((data) => {
    data.credentials = credentials;
  });
}

export async function clearComfyCredentials(
  env: StudioEnv = getEnv(),
): Promise<void> {
  await file(env).update((data) => {
    data.credentials = null;
  });
}

export type CredentialsProbe = (
  baseUrl: string,
  apiKey: string,
) => Promise<ComfyHealth>;

export type CredentialSaveResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

/**
 * Probe the candidate key first; save only when the endpoint answers ok.
 * `probe` is injectable for tests.
 */
export async function saveCredentialsWithProbe(
  input: { apiKey: string; baseUrl?: string },
  opts: { env?: StudioEnv; probe?: CredentialsProbe } = {},
): Promise<CredentialSaveResult> {
  const env = opts.env ?? getEnv();
  const probe: CredentialsProbe =
    opts.probe ??
    ((baseUrl, apiKey) => probeEndpoint(baseUrl, apiKey));
  const health = await probe(input.baseUrl ?? COMFY_CLOUD_BASE_URL, input.apiKey);
  if (health.status !== "ok") {
    const status =
      health.status === "unreachable" || health.status === "upstream_down"
        ? 502
        : 400;
    return {
      ok: false,
      status,
      message: health.message ?? "The Comfy endpoint rejected the key",
    };
  }
  await saveComfyCredentials(
    {
      apiKey: input.apiKey,
      baseUrl: input.baseUrl,
      savedAt: new Date().toISOString(),
    },
    env,
  );
  return { ok: true };
}
