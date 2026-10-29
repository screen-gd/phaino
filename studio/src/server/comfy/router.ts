import "server-only";
import { createHash } from "node:crypto";
import { config, models, type Models } from "@comfyorg/sdk";
import { getEnv, type StudioEnv } from "@/server/env";
import { ComfyNotConfigured, comfyTarget } from "./client";

const globalRouter = globalThis as {
  __phainoRouterKeys?: WeakMap<object, string>;
};

/**
 * The Comfy Router client. Shares the Settings key with the workflow client
 * but ignores the workflow base URL, since Router keeps its own host. The SDK
 * is reconfigured only when its own module instance has not seen this key;
 * the memo is keyed by the `models` object identity so a dev hot reload of
 * the SDK (which resets SDK state but not globalThis) reconfigures too. The
 * map stores a hash so the raw key is never kept on globalThis.
 */
export function getRouter(env: StudioEnv = getEnv()): Models {
  const apiKey = comfyTarget(env).apiKey;
  if (apiKey === undefined) throw new ComfyNotConfigured();
  const keyHash = createHash("sha256")
    .update(apiKey)
    .digest("hex")
    .slice(0, 16);
  const keys = (globalRouter.__phainoRouterKeys ??= new WeakMap());
  if (keys.get(models) !== keyHash) {
    config({ credentials: apiKey });
    keys.set(models, keyHash);
  }
  return models;
}
