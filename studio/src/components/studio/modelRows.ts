"use client";

import { useMemo } from "react";
import type { ModeKey } from "@/lib/modes";
import { modelFamily } from "@/lib/model-families";
import type { StudioModel, StudioPreset } from "@/components/toolStudioData";
import type { PickerRow } from "./ModelPicker";

export type ModelMaps = {
  /** preset id -> owning model */
  modelOf: Map<string, StudioModel>;
  /** preset id -> mode key */
  modeOf: Map<string, ModeKey>;
  /** Models plus presets a model doesn't claim (forks, partners). */
  pickerRows: PickerRow[];
};

const MODE_SHORT: Record<ModeKey, string> = {
  t2i: "T2I",
  edit: "Edit",
  t2v: "T2V",
  i2v: "I2V",
  flf2v: "FLF",
};

export function useModelMaps(
  models: StudioModel[],
  presets: StudioPreset[],
): ModelMaps {
  return useMemo(() => {
    const modelOf = new Map<string, StudioModel>();
    const modeOf = new Map<string, ModeKey>();
    for (const model of models) {
      for (const [mode, pid] of Object.entries(model.modes)) {
        if (pid) {
          modelOf.set(pid, model);
          modeOf.set(pid, mode as ModeKey);
        }
      }
    }
    const claimed = new Set(modelOf.keys());
    // Family grouping happens in the picker; rows keep registry order.
    const pickerRows: PickerRow[] = models.map((m) => ({
      id: m.defaultPresetId,
      name: m.label,
      description: m.modeLabels,
      thumbUrl: m.thumbUrl,
      model: { label: m.label },
      group: modelFamily(m.id),
      modes: (Object.keys(MODE_SHORT) as ModeKey[])
        .filter((k) => m.modes[k])
        .map((k) => MODE_SHORT[k]),
    }));
    for (const p of presets) {
      if (!claimed.has(p.id)) {
        pickerRows.push({
          id: p.id,
          name: p.name,
          description: p.description,
          thumbUrl: p.thumbUrl,
          isFork: p.isFork,
          model: p.model,
        });
      }
    }
    return { modelOf, modeOf, pickerRows };
  }, [models, presets]);
}
