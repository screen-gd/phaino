import "server-only";

import fs from "node:fs";
import path from "node:path";
import { getEnv, type StudioEnv } from "@/server/env";
import type { Preset } from "../presets/schema";
import { loadObjectInfo } from "../presets/validate";
import { detectPreset } from "./bindings";
import {
  MODEL_REGISTRY,
  modeForPresetId,
  modePresetId,
  type ModelEntry,
  type ModelMode,
} from "./registry";

export type ModeManifestEntry = {
  template: string;
  gate: "pass" | "fail";
  reasons: string[];
  licenses?: {
    model: string;
    url: string;
    license: string | null;
    gated?: boolean;
  }[];
};

export type ModelsManifest = {
  ref: string;
  modes: Record<string, ModeManifestEntry>;
};

/** models/ sits next to presets/ at the repo root. */
export function modelsDir(env: StudioEnv = getEnv()): string {
  return path.resolve(env.presetsDir, "..", "models");
}

export function modelsCacheDir(env: StudioEnv = getEnv()): string {
  return path.join(modelsDir(env), "cache");
}

export function loadModelsManifest(
  env: StudioEnv = getEnv(),
): ModelsManifest | null {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(modelsDir(env), "manifest.json"), "utf8"),
    ) as ModelsManifest;
  } catch {
    return null;
  }
}

export function cacheFiles(
  template: string,
  env: StudioEnv = getEnv(),
): { apiFile: string; uiFile: string; thumbFile: string } {
  const dir = modelsCacheDir(env);
  return {
    apiFile: path.join(dir, `${template}.api.json`),
    uiFile: path.join(dir, `${template}.ui.json`),
    thumbFile: path.join(dir, `${template}.webp`),
  };
}

const syntheticCache = new Map<string, Preset | null>();

/** Detect the synthetic preset for a model mode id; null when not gated pass. */
export function syntheticPreset(
  id: string,
  env: StudioEnv = getEnv(),
): Preset | null {
  const cached = syntheticCache.get(id);
  if (cached !== undefined) return cached;

  const preset = buildSynthetic(id, env);
  syntheticCache.set(id, preset);
  return preset;
}

function buildSynthetic(id: string, env: StudioEnv): Preset | null {
  const hit = modeForPresetId(id);
  if (!hit) return null;
  const entry = loadModelsManifest(env)?.modes?.[id];
  if (!entry || entry.gate !== "pass") return null;
  const files = cacheFiles(entry.template, env);
  if (!fs.existsSync(files.apiFile) || !fs.existsSync(files.uiFile)) return null;
  try {
    const api = JSON.parse(fs.readFileSync(files.apiFile, "utf8"));
    const ui = JSON.parse(fs.readFileSync(files.uiFile, "utf8"));
    const detected = detectPreset(hit.model, hit.mode, api, ui, loadObjectInfo());
    return detected.preset && detected.problems.length === 0
      ? detected.preset
      : null;
  } catch {
    return null;
  }
}

export type ListedModel = {
  id: string;
  label: string;
  kind: "image" | "video";
  /** Passing modes with the preset id that serves each. */
  modes: { mode: ModelMode; presetId: string }[];
};

/**
 * The picker's model list: registry models with at least one visible mode.
 * Preset-backed modes count when the preset resolves; template modes when the
 * manifest gates them pass and the cache exists.
 */
export function listModels(
  env: StudioEnv,
  presetExists: (id: string) => boolean,
): ListedModel[] {
  const out: ListedModel[] = [];
  for (const model of MODEL_REGISTRY) {
    const modes: ListedModel["modes"] = [];
    for (const mode of Object.keys(model.modes) as ModelMode[]) {
      const src = model.modes[mode];
      if (!src) continue;
      const id = modePresetId(model, mode);
      const ok = "preset" in src ? presetExists(id) : syntheticPreset(id, env) !== null;
      if (ok) modes.push({ mode, presetId: id });
    }
    if (modes.length > 0) {
      out.push({ id: model.id, label: model.label, kind: model.kind, modes });
    }
  }
  return out;
}
