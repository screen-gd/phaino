import "server-only";
import { Comfy } from "@comfyorg/sdk";
import type { Backend } from "@/lib/backend";
import { getEnv, type StudioEnv } from "@/server/env";
import pkg from "../../../package.json";

export class BackendNotConfigured extends Error {
  readonly backend: Backend;
  readonly envVar: string;

  constructor(backend: Backend, envVar: string) {
    super(`Backend "${backend}" is not configured. Set ${envVar} in studio/.env.local.`);
    this.name = "BackendNotConfigured";
    this.backend = backend;
    this.envVar = envVar;
  }
}

/** Connection target for a backend, or `configured: false` with the missing piece. */
export function backendTarget(backend: Backend, env: StudioEnv) {
  if (backend === "local") {
    return env.comfyBaseUrl
      ? { configured: true, baseUrl: env.comfyBaseUrl, apiKey: env.comfyLocalToken }
      : { configured: false, baseUrl: null, apiKey: undefined };
  }
  return env.comfyApiKey
    ? { configured: true, baseUrl: env.comfyCloudUrl, apiKey: env.comfyApiKey }
    : { configured: false, baseUrl: null, apiKey: undefined };
}

/**
 * Build a Comfy client for one backend. The SDK only reads COMFY_BASE_URL
 * and falls back to COMFY_API_KEY at construction time, so both are pinned
 * synchronously here (and the cloud key deleted for a credential-less local
 * backend) and restored exactly before returning.
 */
export function createComfyClient(
  backend: Backend,
  env: StudioEnv,
  options?: { fetch?: typeof fetch },
): Comfy {
  const target = backendTarget(backend, env);
  if (!target.configured || !target.baseUrl) {
    throw new BackendNotConfigured(
      backend,
      backend === "local" ? "COMFY_BASE_URL" : "COMFY_API_KEY",
    );
  }

  const prevBaseUrl = process.env.COMFY_BASE_URL;
  const prevApiKey = process.env.COMFY_API_KEY;
  try {
    process.env.COMFY_BASE_URL = target.baseUrl;
    if (target.apiKey === undefined) {
      delete process.env.COMFY_API_KEY;
    } else {
      process.env.COMFY_API_KEY = target.apiKey;
    }
    return new Comfy({
      apiKey: target.apiKey,
      clientInfo: `cutaway/${pkg.version}`,
      fetch: options?.fetch,
    });
  } finally {
    if (prevBaseUrl === undefined) {
      delete process.env.COMFY_BASE_URL;
    } else {
      process.env.COMFY_BASE_URL = prevBaseUrl;
    }
    if (prevApiKey === undefined) {
      delete process.env.COMFY_API_KEY;
    } else {
      process.env.COMFY_API_KEY = prevApiKey;
    }
  }
}

const globalClients = globalThis as { __cutawayComfy?: Partial<Record<Backend, Comfy>> };

/** Memoized Comfy client per backend; kept on globalThis to survive dev HMR. */
export function getComfy(backend: Backend): Comfy {
  const cache = (globalClients.__cutawayComfy ??= {});
  return (cache[backend] ??= createComfyClient(backend, getEnv()));
}
