import "server-only";
import { createHash } from "node:crypto";
import { config, models, type Models } from "@comfyorg/sdk";
import { getEnv, type StudioEnv } from "@/server/env";
import { ComfyNotConfigured, comfyTarget } from "./client";

const globalRouter = globalThis as { __phainoRouterKey?: string };

/**
 * The Comfy Router client. Shares the Settings key with the workflow client
 * but ignores the workflow base URL, since Router keeps its own host. The SDK
 * is reconfigured only when the resolved key changes; the memo stores a hash
 * so the raw key is never kept on globalThis.
 */
export function getRouter(env: StudioEnv = getEnv()): Models {
  const apiKey = comfyTarget(env).apiKey;
  if (apiKey === undefined) throw new ComfyNotConfigured();
  const keyHash = createHash("sha256")
    .update(apiKey)
    .digest("hex")
    .slice(0, 16);
  if (globalRouter.__phainoRouterKey !== keyHash) {
    config({ credentials: apiKey });
    globalRouter.__phainoRouterKey = keyHash;
  }
  return models;
}
