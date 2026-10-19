import "server-only";
import { Comfy, COMFY_CLOUD_BASE_URL } from "@comfyorg/sdk";
import { getEnv, type StudioEnv } from "@/server/env";
import pkg from "../../../package.json";

export class ComfyNotConfigured extends Error {
  constructor() {
    super("Set COMFY_API_KEY in studio/.env.local");
    this.name = "ComfyNotConfigured";
  }
}

/**
 * Where the Comfy client points: Comfy Cloud when COMFY_BASE_URL is unset,
 * otherwise the custom endpoint. A custom proxy may need no key, so only the
 * cloud target requires COMFY_API_KEY.
 */
export function comfyTarget(env: StudioEnv) {
  if (env.comfyBaseUrl) {
    return {
      kind: "custom" as const,
      baseUrl: env.comfyBaseUrl,
      host: new URL(env.comfyBaseUrl).host,
      configured: true,
    };
  }
  return {
    kind: "cloud" as const,
    baseUrl: COMFY_CLOUD_BASE_URL,
    host: new URL(COMFY_CLOUD_BASE_URL).host,
    configured: env.comfyApiKey !== undefined,
  };
}

const globalClient = globalThis as { __phainoComfy?: Comfy };

/**
 * The shared Comfy client, memoized on globalThis to survive dev HMR.
 * The SDK reads COMFY_BASE_URL itself at construction, so no env handling
 * is needed here beyond passing the key.
 */
export function getComfy(): Comfy {
  if (!globalClient.__phainoComfy) {
    const env = getEnv();
    const target = comfyTarget(env);
    if (!target.configured) throw new ComfyNotConfigured();
    globalClient.__phainoComfy = new Comfy({
      apiKey: env.comfyApiKey,
      clientInfo: `phaino/${pkg.version}`,
    });
  }
  return globalClient.__phainoComfy;
}
