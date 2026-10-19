import "server-only";
import fs from "node:fs";
import path from "node:path";
import { getEnv } from "@/server/env";
import { presetSchema, type Preset } from "./schema";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type LoadedPreset = {
  preset: Preset;
  workflowApi: Record<string, unknown>;
  workflowUi: unknown;
};

function presetDir(name: string) {
  return path.join(getEnv().presetsDir, name);
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

/**
 * Every valid preset under PRESETS_DIR, sorted by category then order.
 * Invalid folders are skipped with a warning so one bad preset cannot
 * take down the whole list.
 */
export function listPresets(): Preset[] {
  const dir = getEnv().presetsDir;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const out: Preset[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const file = path.join(dir, entry.name, "preset.json");
    if (!fs.existsSync(file)) continue;
    try {
      out.push(parsePreset(entry.name, JSON.parse(fs.readFileSync(file, "utf8"))));
    } catch (error) {
      console.warn(error instanceof Error ? error.message : `Skipping preset "${entry.name}"`);
    }
  }
  return out.sort((a, b) => a.category.localeCompare(b.category) || a.order - b.order);
}

/**
 * One preset with its exported graphs. Returns null when the folder or
 * preset.json does not exist; throws when the preset is present but invalid
 * or its exported graphs are missing.
 */
export function getPreset(id: string): LoadedPreset | null {
  if (!SLUG.test(id)) return null;
  const dir = presetDir(id);
  const presetFile = path.join(dir, "preset.json");
  if (!fs.existsSync(presetFile)) return null;

  const preset = parsePreset(id, JSON.parse(fs.readFileSync(presetFile, "utf8")));

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
