import type { Preset, PresetBind } from "./schema";

/** Loosely-typed API-format graph: node id -> { class_type, inputs }. */
export type WorkflowApi = Record<
  string,
  { class_type?: string; inputs?: Record<string, unknown> }
>;

export class PresetBindError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PresetBindError";
  }
}

type ResolvedValues = Record<string, string | number | boolean>;

function write(graph: WorkflowApi, bind: PresetBind, value: string | number | boolean) {
  const node = graph[bind.node];
  if (!node || typeof node !== "object") {
    throw new PresetBindError(`Bind target node "${bind.node}" is not in the workflow`);
  }
  (node.inputs ??= {})[bind.field] = value;
}

/**
 * Produce a new API-format graph with the preset's inputs and params applied.
 * Missing params fall back to their defaults; seed falls back to `opts.seed`.
 * The input graph is never mutated.
 */
export function applyPreset(
  workflowApi: WorkflowApi,
  preset: Preset,
  values: {
    inputs?: Record<string, string>;
    params?: Record<string, string | number | boolean>;
  },
  opts: { seed: number },
): WorkflowApi {
  const graph = structuredClone(workflowApi);
  const inputs = values.inputs ?? {};
  const params = values.params ?? {};

  for (const key of Object.keys(inputs)) {
    if (!preset.inputs.some((i) => i.key === key)) {
      throw new PresetBindError(`Unknown input "${key}"`);
    }
  }
  for (const key of Object.keys(params)) {
    if (!preset.params.some((p) => p.key === key)) {
      throw new PresetBindError(`Unknown param "${key}"`);
    }
  }

  // First pass: raw value per param (user value or default).
  const resolved: ResolvedValues = {};
  for (const param of preset.params) {
    const given = params[param.key];
    switch (param.type) {
      case "text":
        resolved[param.key] = given === undefined ? param.default : String(given);
        break;
      case "seed": {
        const seed = given === undefined ? opts.seed : Number(given);
        if (!Number.isInteger(seed)) {
          throw new PresetBindError(`Seed "${param.key}" must be an integer`);
        }
        resolved[param.key] = seed;
        break;
      }
      case "choice": {
        const raw = given === undefined ? param.default : given;
        if (!param.options.some((o) => o.value === raw)) {
          throw new PresetBindError(
            `Choice "${param.key}" must be one of: ${param.options.map((o) => String(o.value)).join(", ")}`,
          );
        }
        resolved[param.key] = raw;
        break;
      }
      case "int": {
        const raw = given === undefined ? param.default : Number(given);
        if (!Number.isInteger(raw) || raw < param.min || raw > param.max) {
          throw new PresetBindError(
            `Int "${param.key}" must be an integer in [${param.min}, ${param.max}]`,
          );
        }
        resolved[param.key] = raw;
        break;
      }
      case "float": {
        const raw = given === undefined ? param.default : Number(given);
        if (!Number.isFinite(raw) || raw < param.min || raw > param.max) {
          throw new PresetBindError(
            `Float "${param.key}" must be a number in [${param.min}, ${param.max}]`,
          );
        }
        resolved[param.key] = raw;
        break;
      }
    }
  }

  // Second pass: write everything into the graph.
  for (const input of preset.inputs) {
    const value = inputs[input.key];
    if (value === undefined) {
      if (input.required) {
        throw new PresetBindError(`Missing required input "${input.key}"`);
      }
      continue;
    }
    write(graph, input.bind, value);
  }

  for (const param of preset.params) {
    switch (param.type) {
      case "text": {
        const raw = String(resolved[param.key]);
        const final = param.template
          ? param.template.replace(
              /\{([a-z][a-zA-Z0-9]*)\}/g,
              (placeholder, key: string) => {
                if (!(key in resolved)) {
                  throw new PresetBindError(
                    `Template on "${param.key}" references unknown param "${key}"`,
                  );
                }
                return String(resolved[key]);
              },
            ).trim()
          : raw;
        write(graph, param.bind, final);
        break;
      }
      case "seed":
        write(graph, param.bind, resolved[param.key]);
        break;
      case "choice": {
        const option = param.options.find((o) => o.value === resolved[param.key]);
        if (!option) break; // unreachable: validated above
        if (param.bind) write(graph, param.bind, option.value);
        for (const set of option.set ?? []) {
          write(graph, set, set.value);
        }
        break;
      }
      case "int":
      case "float":
        write(graph, param.bind, resolved[param.key]);
        break;
    }
  }

  return graph;
}
