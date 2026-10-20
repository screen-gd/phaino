import "server-only";
import fs from "node:fs";
import path from "node:path";
import { getEnv, type StudioEnv } from "@/server/env";
import {
  cacheFiles,
  loadModelsManifest,
  syntheticPreset,
  syntheticToolPreset,
} from "../models/resolve";
import {
  MODEL_REGISTRY,
  modeForPresetId,
  modePresetId,
  type ModelMode,
} from "../models/registry";
import { EDIT_TOOLS, toolForPresetId } from "../models/tools";
import { presetSchema, type Preset } from "./schema";

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A preset as listed: folder preset, template-backed model mode, or fork. */
export type ListedPreset = Preset & { origin: "builtin" | "fork" | "model" };

export type LoadedPreset = {
  preset: ListedPreset;
  workflowApi: Record<string, unknown>;
  workflowUi: unknown;
};

function presetDir(env: StudioEnv, name: string) {
  return path.join(env.presetsDir, name);
}

export function forkDir(env: StudioEnv, name: string) {
  return path.join(env.forksDir, name);
}

/**
 * The folder a preset id resolves to: PRESETS_DIR first, then forks.
 * Null when the id isn't a slug, has no preset.json, or is a hidden
 * partner preset.
 */
export function resolvePresetDir(id: string, env: StudioEnv = getEnv()): string | null {
  if (!SLUG.test(id)) return null;
  const builtin = presetDir(env, id);
  const dir = fs.existsSync(path.join(builtin, "preset.json")) ? builtin : forkDir(env, id);
  const presetFile = path.join(dir, "preset.json");
  if (!fs.existsSync(presetFile)) return null;
  try {
    const preset = parsePreset(id, JSON.parse(fs.readFileSync(presetFile, "utf8")));
    return presetVisible(preset, env) ? dir : null;
  } catch {
    return null;
  }
}

/** Partner presets hide unless PHAINO_PARTNER_MODELS=on. */
export function presetVisible(preset: Preset, env: StudioEnv = getEnv()): boolean {
  return preset.model.license !== "partner" || env.partnerModels;
}

function parsePreset(dirName: string, raw: unknown): Preset {
  const parsed = presetSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Preset "${dirName}" is invalid: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    );
  }
  if (parsed.data.id !== dirName) {
    throw new Error(
      `Preset "${dirName}": id "${parsed.data.id}" does not match the folder name`,
    );
  }
  return parsed.data;
}

function listDir(dir: string, origin: "builtin" | "fork"): ListedPreset[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: ListedPreset[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const file = path.join(dir, entry.name, "preset.json");
    if (!fs.existsSync(file)) continue;
    try {
      out.push({
        ...parsePreset(entry.name, JSON.parse(fs.readFileSync(file, "utf8"))),
        origin,
      });
    } catch (error) {
      console.warn(error instanceof Error ? error.message : `Skipping preset "${entry.name}"`);
    }
  }
  return out;
}

/**
 * Every valid preset under PRESETS_DIR plus template-backed model modes whose
 * manifest gate passes, plus the user's forks, sorted by category then order.
 * Invalid folders are skipped with a warning so one bad preset cannot take
 * down the whole list. Partner presets are hidden unless
 * PHAINO_PARTNER_MODELS=on.
 */
export function listPresets(env: StudioEnv = getEnv()): ListedPreset[] {
  const synthetic: ListedPreset[] = [];
  for (const model of MODEL_REGISTRY) {
    for (const mode of Object.keys(model.modes) as ModelMode[]) {
      const src = model.modes[mode];
      if (src && "template" in src) {
        const p = syntheticPreset(modePresetId(model, mode), env);
        if (p) synthetic.push({ ...p, origin: "model" });
      }
    }
  }
  for (const tool of EDIT_TOOLS) {
    if (!tool.template) continue;
    const t = syntheticToolPreset(`edit-${tool.id}`, env);
    if (t) synthetic.push({ ...t.preset, origin: "model" });
  }
  const all = [
    ...listDir(env.presetsDir, "builtin"),
    ...synthetic,
    ...listDir(env.forksDir, "fork"),
  ];
  return all
    .filter((p) => presetVisible(p, env))
    .sort(
      (a, b) =>
        a.category.localeCompare(b.category) ||
        a.order - b.order ||
        (a.origin === "fork" ? 1 : 0) - (b.origin === "fork" ? 1 : 0),
    );
}

/**
 * One preset with its exported graphs, from PRESETS_DIR or forks.
 * Returns null when the folder or preset.json does not exist, the preset is
 * a hidden partner preset, or the id is not a slug; throws when the preset
 * is present but invalid or its exported graphs are missing.
 */
export function getPreset(id: string, env: StudioEnv = getEnv()): LoadedPreset | null {
  if (!SLUG.test(id)) return null;
  const presetFileBuiltin = path.join(presetDir(env, id), "preset.json");
  if (!fs.existsSync(presetFileBuiltin) && !fs.existsSync(path.join(forkDir(env, id), "preset.json"))) {
    // A template-backed entry (model mode or edit tool): models/cache holds
    // its graphs.
    const manifest = loadModelsManifest(env);
    const hit = modeForPresetId(id);
    const tool = toolForPresetId(id);
    const entry = hit
      ? manifest?.modes?.[id]
      : tool
        ? manifest?.tools?.[id]
        : undefined;
    if (!entry) return null;
    const preset = hit
      ? (syntheticPreset(id, env) ?? null)
      : (syntheticToolPreset(id, env)?.preset ?? null);
    if (!preset) return null;
    const files = cacheFiles(entry.template, env);
    return {
      preset: { ...preset, origin: "model" },
      workflowApi: JSON.parse(fs.readFileSync(files.apiFile, "utf8")),
      workflowUi: JSON.parse(fs.readFileSync(files.uiFile, "utf8")),
    };
  }
  const isFork = !fs.existsSync(presetFileBuiltin);
  const dir = isFork ? forkDir(env, id) : presetDir(env, id);
  const presetFile = path.join(dir, "preset.json");
  if (!fs.existsSync(presetFile)) return null;

  const raw = parsePreset(id, JSON.parse(fs.readFileSync(presetFile, "utf8")));
  const preset: ListedPreset = {
    ...raw,
    origin: isFork ? "fork" : "builtin",
  };
  if (!presetVisible(preset, env)) return null;

  const apiFile = path.join(dir, "workflow_api.json");
  const uiFile = path.join(dir, "workflow.json");
  if (!fs.existsSync(apiFile) || !fs.existsSync(uiFile)) {
    throw new Error(
      `Preset "${id}" is missing workflow_api.json or workflow.json; run export:workflows`,
    );
  }

  return {
    preset,
    workflowApi: JSON.parse(fs.readFileSync(apiFile, "utf8")),
    workflowUi: JSON.parse(fs.readFileSync(uiFile, "utf8")),
  };
}

/**
 * The thumb.webp file for any preset id: the preset folder for builtins and
 * forks, models/cache/<template>.webp for template-backed modes. Null when
 * the preset is hidden, missing, or has no thumb.
 */
export function resolveThumbPath(id: string, env: StudioEnv = getEnv()): string | null {
  if (!SLUG.test(id)) return null;
  const dir = resolvePresetDir(id, env);
  if (dir) {
    const file = path.join(dir, "thumb.webp");
    return fs.existsSync(file) ? file : null;
  }
  const manifest = loadModelsManifest(env);
  const hit = modeForPresetId(id);
  if (hit) {
    if (!syntheticPreset(id, env)) return null;
    const entry = manifest?.modes?.[id];
    if (!entry) return null;
    const file = cacheFiles(entry.template, env).thumbFile;
    return fs.existsSync(file) ? file : null;
  }
  const tool = toolForPresetId(id);
  if (!tool) return null;
  if (!syntheticToolPreset(id, env)) return null;
  const entry = manifest?.tools?.[id];
  if (!entry) return null;
  const file = cacheFiles(entry.template, env).thumbFile;
  return fs.existsSync(file) ? file : null;
}

