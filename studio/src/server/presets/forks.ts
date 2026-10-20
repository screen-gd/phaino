import "server-only";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getEnv, type StudioEnv } from "@/server/env";
import {
  forkDir,
  getPreset,
  resolvePresetDir,
  resolveThumbPath,
  SLUG,
  type ListedPreset,
} from "./load";
import { presetSchema, type Preset } from "./schema";
import { validateWorkflowApi } from "./validate";

const FORK_FILES = ["preset.json", "workflow.json", "workflow_api.json", "thumb.webp"];
const MAX_WORKFLOW_BYTES = 5 * 1024 * 1024;

export class ForkError extends Error {
  readonly status: number;
  readonly problems?: string[];
  constructor(message: string, status = 400, problems?: string[]) {
    super(message);
    this.name = "ForkError";
    this.status = status;
    this.problems = problems;
  }
}

function newForkId(baseId: string, env: StudioEnv): string {
  for (let i = 0; i < 20; i++) {
    const suffix = crypto.randomBytes(4).readUInt32BE(0).toString(36).slice(0, 6).padStart(6, "0");
    const id = `${baseId}-fork-${suffix}`;
    if (SLUG.test(id) && !fs.existsSync(forkDir(env, id))) return id;
  }
  throw new ForkError("Could not allocate a fork id", 500);
}

function readForkPreset(id: string, env: StudioEnv): { preset: Preset; dir: string } {
  // The slug shape blocks traversal; the resolve() check in deleteFork is
  // belt-and-braces. The folder must live under forksDir.
  if (!SLUG.test(id)) throw new ForkError("Not a fork id", 404);
  const dir = forkDir(env, id);
  const file = path.join(dir, "preset.json");
  if (!fs.existsSync(file)) throw new ForkError("Unknown fork", 404);
  const preset = presetSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
  if (preset.id !== id) throw new ForkError("Unknown fork", 404);
  return { preset, dir };
}

/** Copy a preset folder into a new fork under forksDir. Template-backed model
 * modes have no folder; their loaded preset and graphs are materialised. */
export function createFork(presetId: string, env: StudioEnv = getEnv()): ListedPreset {
  const dir = resolvePresetDir(presetId, env);
  const forkId = newForkId(presetId, env);
  const target = forkDir(env, forkId);
  fs.mkdirSync(target, { recursive: true });

  let raw: Record<string, unknown>;
  if (dir) {
    raw = JSON.parse(fs.readFileSync(path.join(dir, "preset.json"), "utf8")) as Record<string, unknown>;
    for (const name of FORK_FILES) {
      if (name === "preset.json") continue;
      const src = path.join(dir, name);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(target, name));
    }
  } else {
    const loaded = getPreset(presetId, env);
    if (!loaded || loaded.preset.origin !== "model") {
      fs.rmSync(target, { recursive: true, force: true });
      throw new ForkError(`Unknown preset "${presetId}"`, 404);
    }
    raw = loaded.preset as unknown as Record<string, unknown>;
    fs.writeFileSync(
      path.join(target, "workflow.json"),
      JSON.stringify(loaded.workflowUi, null, 2) + "\n",
    );
    fs.writeFileSync(
      path.join(target, "workflow_api.json"),
      JSON.stringify(loaded.workflowApi, null, 2) + "\n",
    );
    const thumb = resolveThumbPath(presetId, env);
    if (thumb) fs.copyFileSync(thumb, path.join(target, "thumb.webp"));
  }

  const forkPreset = presetSchema.parse({
    ...raw,
    id: forkId,
    name: `${String(raw.name ?? presetId)} (fork)`,
    forkOf: presetId,
  });
  fs.writeFileSync(path.join(target, "preset.json"), JSON.stringify(forkPreset, null, 2) + "\n");
  return { ...forkPreset, origin: "fork" };
}

export type ForkPatch = {
  name?: string;
  description?: string;
  defaults?: Record<string, string | number | boolean>;
};

function validateDefaults(preset: Preset, defaults: Record<string, string | number | boolean>): string[] {
  const problems: string[] = [];
  for (const [key, value] of Object.entries(defaults)) {
    const param = preset.params.find((p) => p.key === key);
    if (!param) {
      problems.push(`Unknown param "${key}"`);
      continue;
    }
    switch (param.type) {
      case "text":
        if (typeof value !== "string") problems.push(`"${key}" must be a string`);
        break;
      case "seed":
      case "int": {
        const n = Number(value);
        if (!Number.isInteger(n)) {
          problems.push(`"${key}" must be an integer`);
        } else if (param.type === "int" && (n < param.min || n > param.max)) {
          problems.push(`"${key}" must be in [${param.min}, ${param.max}]`);
        }
        break;
      }
      case "float": {
        const n = Number(value);
        if (!Number.isFinite(n) || n < param.min || n > param.max) {
          problems.push(`"${key}" must be a number in [${param.min}, ${param.max}]`);
        }
        break;
      }
      case "choice":
        if (!param.options.some((o) => o.value === value)) {
          problems.push(`"${key}" must be one of its options`);
        }
        break;
    }
  }
  return problems;
}

/** Update a fork's name, description and param defaults. */
export function updateFork(id: string, patch: ForkPatch, env: StudioEnv = getEnv()): ListedPreset {
  const { preset, dir } = readForkPreset(id, env);
  const problems = patch.defaults ? validateDefaults(preset, patch.defaults) : [];
  if (problems.length > 0) {
    throw new ForkError("Invalid defaults", 400, problems);
  }
  const next = {
    ...preset,
    name: patch.name?.trim() || preset.name,
    description: patch.description?.trim() || preset.description,
    params: preset.params.map((p) =>
      patch.defaults && p.key in patch.defaults
        ? { ...p, default: patch.defaults[p.key] }
        : p,
    ),
  };
  const validated = presetSchema.parse(next);
  fs.writeFileSync(path.join(dir, "preset.json"), JSON.stringify(validated, null, 2) + "\n");
  return { ...validated, origin: "fork" };
}

/**
 * Replace a fork's two workflow files after validating that the API graph
 * still satisfies the preset's bindings and known node classes.
 */
export function replaceForkWorkflow(
  id: string,
  workflowUi: unknown,
  workflowApi: unknown,
  env: StudioEnv = getEnv(),
): ListedPreset {
  const { preset, dir } = readForkPreset(id, env);
  const ui = workflowUi as { nodes?: unknown; links?: unknown };
  if (!ui || !Array.isArray(ui.nodes) || !Array.isArray(ui.links)) {
    throw new ForkError("workflow.json is not a ComfyUI graph (needs nodes + links)", 400, [
      "workflow.json: missing nodes/links",
    ]);
  }
  const api = workflowApi as Record<string, { class_type?: string }> | null;
  if (!api || typeof api !== "object" || Object.values(api).some((n) => !n || typeof n !== "object" || typeof n.class_type !== "string")) {
    throw new ForkError("workflow_api.json is not an API-format graph", 400, [
      "workflow_api.json: expected {id: {class_type, inputs}}",
    ]);
  }
  const problems = validateWorkflowApi(api, preset);
  if (problems.length > 0) {
    throw new ForkError("workflow_api.json does not satisfy this preset", 400, problems);
  }
  fs.writeFileSync(path.join(dir, "workflow.json"), JSON.stringify(workflowUi, null, 2) + "\n");
  fs.writeFileSync(path.join(dir, "workflow_api.json"), JSON.stringify(workflowApi, null, 2) + "\n");
  return { ...preset, origin: "fork" };
}

/** Delete a fork folder. Never touches presetsDir or paths outside forksDir. */
export function deleteFork(id: string, env: StudioEnv = getEnv()): void {
  const { dir } = readForkPreset(id, env);
  const root = path.resolve(env.forksDir);
  const resolved = path.resolve(dir);
  if (resolved !== path.join(root, id) || !resolved.startsWith(root + path.sep)) {
    throw new ForkError("Refusing to delete outside the forks folder", 400);
  }
  fs.rmSync(resolved, { recursive: true, force: true });
}

export { MAX_WORKFLOW_BYTES };

