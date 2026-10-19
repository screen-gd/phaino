import "server-only";
import { ComfyLow } from "@comfyorg/sdk/low";
import type { Backend } from "@/lib/backend";
import type { BackendHealth, HealthStatus } from "@/lib/health";
import { backendTarget } from "./client";
import { getEnv, type StudioEnv } from "@/server/env";
import pkg from "../../../package.json";

const PROBE_TIMEOUT_MS = 5_000;
/** Existence probe: any well-formed blake3 hash works; 404 still proves reachability. */
const PROBE_PATH = `/api/v2/assets/by-hash/blake3:${"0".repeat(64)}`;

/** What a probe observed, fed to classifyProbe for the status mapping. */
export type ProbeOutcome =
  | { kind: "response"; status: number; code?: string }
  | { kind: "thrown"; error: unknown }
  | { kind: "not_configured"; envVar: string };

/** Map a probe outcome to a health status. Pure, so it stays unit-testable. */
export function classifyProbe(outcome: ProbeOutcome): {
  status: HealthStatus;
  message?: string;
} {
  switch (outcome.kind) {
    case "response": {
      const { status, code } = outcome;
      if (status === 200 || status === 404) {
        return { status: "ok" };
      }
      if (status === 401 || status === 403) {
        return { status: "unauthorized", message: `HTTP ${status}: check the API key` };
      }
      if (code === "upstream_error" || status >= 500) {
        return {
          status: "upstream_down",
          message: `HTTP ${status}: the Comfy service behind this endpoint is down`,
        };
      }
      return { status: "error", message: `HTTP ${status}` };
    }
    case "thrown": {
      const { error } = outcome;
      if (isNetworkOrTimeout(error)) {
        return { status: "unreachable", message: describeThrown(error) };
      }
      return { status: "error", message: describeThrown(error) };
    }
    case "not_configured": {
      return {
        status: "not_configured",
        message: `Set ${outcome.envVar} in studio/.env.local`,
      };
    }
  }
}

function isNetworkOrTimeout(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "TimeoutError" || error.name === "AbortError") return true;
  // fetch() rejects with TypeError on DNS, refused connections and TLS errors.
  if (error instanceof TypeError) return true;
  return error.cause instanceof Error && isNetworkOrTimeout(error.cause);
}

function describeThrown(error: unknown): string {
  if (error instanceof Error) {
    return error.name === "TimeoutError" || error.name === "AbortError"
      ? `Timed out after ${PROBE_TIMEOUT_MS / 1000}s`
      : error.message;
  }
  return String(error);
}

/** HEAD-probe one backend through the low transport and classify the result. */
export async function probeBackend(backend: Backend, env: StudioEnv = getEnv()): Promise<BackendHealth> {
  const target = backendTarget(backend, env);
  if (!target.configured || !target.baseUrl) {
    const envVar = backend === "local" ? "COMFY_BASE_URL" : "COMFY_API_KEY";
    return {
      backend,
      host: null,
      latencyMs: null,
      ...classifyProbe({ kind: "not_configured", envVar }),
    };
  }

  const host = new URL(target.baseUrl).host;
  const low = new ComfyLow(target.baseUrl, target.apiKey, {
    clientInfo: `cutaway/${pkg.version}`,
  });

  const started = performance.now();
  try {
    const response = await low.request("HEAD", PROBE_PATH, { timeoutMs: PROBE_TIMEOUT_MS });
    const latencyMs = Math.round(performance.now() - started);
    // A HEAD reply carries no body, so no error envelope to read a code from.
    return {
      backend,
      host,
      latencyMs,
      ...classifyProbe({ kind: "response", status: response.status }),
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - started);
    return {
      backend,
      host,
      latencyMs,
      ...classifyProbe({ kind: "thrown", error }),
    };
  }
}
