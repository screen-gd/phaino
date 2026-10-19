import "server-only";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { getEnv } from "@/server/env";

export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const presetSummarySchema = z
  .object({
    id: slugSchema,
    name: z.string(),
    category: z.enum(["camera", "image"]),
    model: z.object({
      label: z.string(),
      license: z.enum(["open", "partner"]),
    }),
  })
  .loose();

export type PresetSummary = z.infer<typeof presetSummarySchema>;

/**
 * One summary per `<PRESETS_DIR>/<id>/preset.json`. The folder name must equal
 * the preset id; invalid entries are skipped with a warning. A missing
 * presets directory yields an empty list.
 */
export function listPresetSummaries(): PresetSummary[] {
  const dir = getEnv().presetsDir;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const out: PresetSummary[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const raw = JSON.parse(
        fs.readFileSync(path.join(dir, entry.name, "preset.json"), "utf8"),
      );
      const parsed = presetSummarySchema.safeParse(raw);
      if (!parsed.success) {
        console.warn(`Skipping preset "${entry.name}": ${parsed.error.issues[0]?.message}`);
        continue;
      }
      if (parsed.data.id !== entry.name) {
        console.warn(`Skipping preset "${entry.name}": id "${parsed.data.id}" does not match the folder name`);
        continue;
      }
      out.push(parsed.data);
    } catch {
      console.warn(`Skipping preset "${entry.name}": unreadable preset.json`);
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
