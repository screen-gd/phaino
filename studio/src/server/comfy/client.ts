import "server-only";
import { createHash } from "node:crypto";
import { Comfy, COMFY_CLOUD_BASE_URL } from "@comfyorg/sdk";
import { getEnv, type StudioEnv } from "@/server/env";
import { getStoredComfyCredentials } from "./credentials";
import pkg from "../../../package.json";

export class ComfyNotConfigured extends Error {
  constructor() {
    super("Add your Comfy API key in Settings");
    this.name = "ComfyNotConfigured";
  }
}

export type ComfyTarget = {
  kind: "cloud" | "custom";
  baseUrl: string;
  host: string;
  configured: boolean;
  apiKey?: string;
  /** Where the key came from: Settings, env, or none. */
  source: "settings" | "env" | null;
};

/**
 * Where the Comfy client points. The key saved in Settings wins over
 * COMFY_API_KEY; the saved base URL wins over COMFY_BASE_URL. A custom proxy
 * may need no key, so only the cloud target requires one.
 */
export function comfyTarget(env: StudioEnv): ComfyTarget {
  const stored = getStoredComfyCredentials(env);
  const apiKey = stored?.apiKey ?? env.comfyApiKey;
  const baseUrl = stored?.baseUrl ?? env.comfyBaseUrl;
  const source: ComfyTarget["source"] = stored
    ? "settings"
    : env.comfyApiKey
      ? "env"
      : null;
  if (baseUrl) {
    return {
      kind: "custom",
      baseUrl,
      host: new URL(baseUrl).host,
      configured: true,
      apiKey,
      source,
    };
  }
  return {
    kind: "cloud",
    baseUrl: COMFY_CLOUD_BASE_URL,
    host: new URL(COMFY_CLOUD_BASE_URL).host,
    configured: apiKey !== undefined,
    apiKey,
    source,
  };
}

const globalClient = globalThis as {
  __phainoComfy?: { key: string; client: Comfy };
  __phainoComfyBaseUrlSet?: boolean;
};

/**
 * The shared Comfy client, memoized on globalThis to survive dev HMR and
 * rebuilt whenever the resolved key or base URL changes. The memo key hashes
 * the api key; the raw key is never stored on globalThis.
 */
export function getComfy(env: StudioEnv = getEnv()): Comfy {
  const target = comfyTarget(env);
  if (!target.configured) throw new ComfyNotConfigured();
  const memoKey = `${target.baseUrl}:${createHash("sha256")
    .update(target.apiKey ?? "")
    .digest("hex")
    .slice(0, 16)}`;
  if (globalClient.__phainoComfy?.key !== memoKey) {
    // The SDK resolves COMFY_BASE_URL itself at construction; set it for a
    // stored/custom endpoint, and clear it only when we set it.
    if (target.baseUrl !== COMFY_CLOUD_BASE_URL) {
      process.env.COMFY_BASE_URL = target.baseUrl;
      globalClient.__phainoComfyBaseUrlSet = true;
    } else if (globalClient.__phainoComfyBaseUrlSet) {
      delete process.env.COMFY_BASE_URL;
      globalClient.__phainoComfyBaseUrlSet = false;
    }
    globalClient.__phainoComfy = {
      key: memoKey,
      client: new Comfy({
        apiKey: target.apiKey,
        clientInfo: `phaino/${pkg.version}`,
      }),
    };
  }
  return globalClient.__phainoComfy.client;
}
