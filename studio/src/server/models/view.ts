import "server-only";

import { getEnv, type StudioEnv } from "@/server/env";
import { listModels } from "./resolve";
import { MODE_LABELS } from "./registry";
import { getPreset } from "../presets/load";
import type { ModeKey } from "@/lib/modes";
import type { StudioModel } from "@/components/toolStudioData";

const MODE_ORDER: ModeKey[] = ["t2i", "edit", "t2v", "i2v", "flf2v"];

/**
 * Client-facing model list for the studio pickers. `modes` maps each passing
 * mode to the preset id that serves it; `defaultPresetId` is the picker's row
 * id (text-to-* first).
 */
export function toStudioModels(
  kind: "image" | "video",
  env: StudioEnv = getEnv(),
): StudioModel[] {
  const presetExists = (id: string) => getPreset(id, env) != null;
  return listModels(env, presetExists)
    .filter((m) => m.kind === kind)
    .map((m) => {
      const modes: Partial<Record<ModeKey, string>> = {};
      for (const { mode, presetId } of m.modes) {
        if (mode === "swap") continue;
        modes[mode] = presetId;
      }
      const preferred: ModeKey[] =
        kind === "video" ? ["t2v", "i2v", "flf2v"] : ["t2i", "edit"];
      const defaultPresetId = preferred.map((k) => modes[k]).find(Boolean)!;
      const labels = MODE_ORDER.filter((mode) => modes[mode])
        .map((mode) => MODE_LABELS[mode])
        .join(" · ");
      return {
        id: m.id,
        label: m.label,
        kind: m.kind,
        modes,
        defaultPresetId,
        thumbUrl: `/api/presets/${defaultPresetId}/thumb`,
        modeLabels: labels,
      };
    });
}
