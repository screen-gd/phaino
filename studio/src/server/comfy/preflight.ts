import "server-only";
import { createHash } from "node:crypto";
import type { ComfyTarget } from "./client";
import {
  comboOptions,
  inputSpec,
  loadObjectInfo,
  type ObjectInfo,
  type WorkflowApiGraph,
} from "@/server/presets/validate";

/** What a live Comfy target reports about itself. */
export type TargetInfo = {
  nodes: ObjectInfo["nodes"];
  comfyuiVersion: string | null;
};

const TIMEOUT_MS = 10_000;
const CACHE_MS = 10 * 60_000;

const g = globalThis as {
  __phainoTargetInfo?: Map<
    string,
    { at: number; p: Promise<TargetInfo | null> }
  >;
};
const infoCache = () => (g.__phainoTargetInfo ??= new Map());

async function fetchEndpoint(
  baseUrl: string,
  name: string,
  apiKey: string | undefined,
): Promise<unknown> {
  const headers = apiKey ? { "X-API-Key": apiKey } : undefined;
  for (const url of [`${baseUrl}/api/${name}`, `${baseUrl}/${name}`]) {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 404) continue;
    if (!res.ok) return null;
    return res.json();
  }
  return null;
}

/**
 * Read the live target's object_info and system_stats. Null on any failure:
 * a server that doesn't answer these endpoints must not block jobs. Cached
 * per base URL and key hash for ten minutes; the raw key is never stored.
 */
export function fetchTargetInfo(
  target: Pick<ComfyTarget, "baseUrl" | "apiKey">,
): Promise<TargetInfo | null> {
  const memoKey = `${target.baseUrl}:${createHash("sha256")
    .update(target.apiKey ?? "")
    .digest("hex")
    .slice(0, 16)}`;
  const hit = infoCache().get(memoKey);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.p;
  const p = (async () => {
    try {
      const objectInfo = await fetchEndpoint(
        target.baseUrl,
        "object_info",
        target.apiKey,
      );
      if (!objectInfo || typeof objectInfo !== "object") return null;
      const stats = (await fetchEndpoint(
        target.baseUrl,
        "system_stats",
        target.apiKey,
      )) as { system?: { comfyui_version?: unknown } } | null;
      const version = stats?.system?.comfyui_version;
      return {
        nodes: objectInfo as ObjectInfo["nodes"],
        comfyuiVersion: typeof version === "string" ? version : null,
      };
    } catch {
      return null;
    }
  })();
  infoCache().set(memoKey, { at: Date.now(), p });
  return p;
}

/** ComfyUI version the bundled object_info snapshot was generated from. */
export function snapshotComfyVersion(): string | null {
  const v = loadObjectInfo().meta?.comfyuiVersion;
  return typeof v === "string" ? v : null;
}

const MODEL_FILE = /\.(safetensors|sft|ckpt|pt|pth|bin|gguf|onnx)$/i;

/**
 * Problems a bound graph would hit on this target: missing node classes and
 * literal combo values naming model files (safetensors, gguf, etc.) that the
 * target doesn't offer. Other combos (like CustomCombo's user-defined
 * choice) are skipped, as are input binds that get upload filenames at run
 * time.
 */
export function targetProblems(
  graph: WorkflowApiGraph,
  preset: {
    inputs: readonly { bind: { node: string; field: string } }[];
  },
  info: TargetInfo,
): string[] {
  const problems: string[] = [];
  const snapshot: ObjectInfo = { nodes: info.nodes };
  const bound = new Set(
    preset.inputs.map((input) => `${input.bind.node}.${input.bind.field}`),
  );
  for (const [nodeId, node] of Object.entries(graph)) {
    const cls = node.class_type ?? "?";
    if (!info.nodes[cls]) {
      problems.push(`node ${cls} is not installed`);
      continue;
    }
    for (const [field, value] of Object.entries(node.inputs ?? {})) {
      if (
        typeof value !== "string" ||
        !MODEL_FILE.test(value) ||
        bound.has(`${nodeId}.${field}`)
      ) {
        continue;
      }
      const spec = inputSpec(snapshot, node, field);
      const options = spec ? comboOptions(spec) : null;
      if (options && !options.includes(value)) {
        problems.push(`${cls}.${field}: "${value}" not found`);
      }
    }
  }
  return problems;
}

/** Dotted-numeric compare: true when a < b; unparseable inputs are false. */
export function isOlder(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  const pa = a.replace(/^v/i, "").split(".").map(Number);
  const pb = b.replace(/^v/i, "").split(".").map(Number);
  if (pa.some(Number.isNaN) || pb.some(Number.isNaN)) return false;
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0;
  }
  return false;
}
