import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Preset, PresetBind } from "./schema";

/**
 * Validates a workflow_api.json graph against the object_info snapshot:
 * every node class is known, every binding lands on a literal input that
 * exists, and output nodes are Save* nodes. Shared by presets.test.ts and
 * the fork workflow-upload route.
 */

export type ObjectInfoSpec = [unknown, ...unknown[]];
export type ObjectInfoNode = {
  input?: {
    required?: Record<string, ObjectInfoSpec>;
    optional?: Record<string, ObjectInfoSpec>;
  };
};
export type ObjectInfo = { meta?: Record<string, unknown>; nodes: Record<string, ObjectInfoNode> };
export type WorkflowApiGraph = Record<
  string,
  { class_type?: string; inputs?: Record<string, unknown> }
>;

type ComboOption = {
  key?: string;
  inputs?: {
    required?: Record<string, ObjectInfoSpec>;
    optional?: Record<string, ObjectInfoSpec>;
  };
};

let cachedSnapshot: ObjectInfo | undefined;

/** The bundled object_info snapshot used for binding checks. */
export function loadObjectInfo(): ObjectInfo {
  return (cachedSnapshot ??= JSON.parse(
    fs.readFileSync(
      path.resolve(process.cwd(), "src/server/comfy/object_info.snapshot.json"),
      "utf8",
    ),
  ) as ObjectInfo);
}

export function inputSpec(
  snapshot: ObjectInfo,
  node: { class_type?: string; inputs?: Record<string, unknown> },
  field: string,
): ObjectInfoSpec | null {
  const info = snapshot.nodes[node.class_type ?? ""];
  if (!info?.input) return null;
  const direct = info.input.required?.[field] ?? info.input.optional?.[field];
  if (direct) return direct;
  // COMFY_DYNAMICCOMBO fields serialize sub-inputs as "<combo>.<name>".
  const dot = field.indexOf(".");
  if (dot < 0) return null;
  const parentName = field.slice(0, dot);
  const sub = field.slice(dot + 1);
  const parent =
    info.input.required?.[parentName] ?? info.input.optional?.[parentName];
  const options = (parent?.[1] as { options?: ComboOption[] } | undefined)?.options;
  const opt = options?.find((o) => o.key === node.inputs?.[parentName]);
  return opt?.inputs?.required?.[sub] ?? opt?.inputs?.optional?.[sub] ?? null;
}

export function comboOptions(spec: ObjectInfoSpec): unknown[] | null {
  if (Array.isArray(spec[0])) return spec[0] as unknown[];
  const cfg = spec[1] as { options?: unknown[] } | undefined;
  if (spec[0] === "COMBO" && Array.isArray(cfg?.options)) return cfg.options;
  return null;
}

function bindProblem(
  snapshot: ObjectInfo,
  graph: WorkflowApiGraph,
  bind: PresetBind,
  ctx: string,
): string | null {
  const node = graph[bind.node];
  if (!node) return `${ctx}: node "${bind.node}" missing from workflow_api.json`;
  const value = node.inputs?.[bind.field];
  if (value === undefined || Array.isArray(value)) {
    return `${ctx}: ${bind.node}.${bind.field} is not a literal widget value`;
  }
  if (!inputSpec(snapshot, node, bind.field)) {
    return `${ctx}: ${node.class_type}.${bind.field} not in object_info snapshot`;
  }
  return null;
}

/** A list of problems; empty means the graph still satisfies the preset. */
export function validateWorkflowApi(
  graph: WorkflowApiGraph,
  preset: Preset,
  snapshot: ObjectInfo = loadObjectInfo(),
): string[] {
  const problems: string[] = [];
  for (const [nodeId, node] of Object.entries(graph)) {
    if (!snapshot.nodes[node.class_type ?? ""]) {
      problems.push(`node ${nodeId} (${node.class_type ?? "?"}) not in snapshot`);
    }
  }
  for (const input of preset.inputs) {
    const p = bindProblem(snapshot, graph, input.bind, `input ${input.key}`);
    if (p) problems.push(p);
  }
  for (const param of preset.params) {
    if ("bind" in param && param.bind) {
      const p = bindProblem(snapshot, graph, param.bind, `param ${param.key}`);
      if (p) problems.push(p);
    }
    if (param.type === "choice") {
      for (const option of param.options) {
        const checks: { bind: PresetBind; value: unknown }[] = [
          ...(param.bind ? [{ bind: param.bind, value: option.value }] : []),
          ...(option.set ?? []).map((set) => ({ bind: set, value: set.value })),
        ];
        for (const { bind, value } of checks) {
          const bp = bindProblem(snapshot, graph, bind, `param ${param.key}`);
          if (bp) {
            problems.push(bp);
            continue;
          }
          const node = graph[bind.node];
          const spec = inputSpec(snapshot, node, bind.field);
          const options = spec ? comboOptions(spec) : null;
          if (options && !options.includes(value)) {
            problems.push(
              `param ${param.key}: value ${JSON.stringify(value)} not in ${node.class_type}.${bind.field} options`,
            );
          }
        }
      }
    }
  }
  for (const out of preset.outputs) {
    const node = graph[out.node];
    if (!node) {
      problems.push(`output node ${out.node} missing`);
    } else if (!["SaveVideo", "SaveImage"].includes(node.class_type ?? "")) {
      problems.push(`output node ${out.node} is not a Save* node`);
    }
  }
  return problems;
}
