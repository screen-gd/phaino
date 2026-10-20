import { Suspense } from "react";
import {
  EditStudio,
  type EditToolMeta,
  type ExtendModel,
} from "@/components/edit/EditStudio";
import { toStudioPreset } from "@/components/toolStudioData";
import { presetEstimates } from "@/server/jobs/credits";
import { listTools } from "@/server/models/resolve";
import { toStudioModels } from "@/server/models/view";
import { getPreset } from "@/server/presets/load";

export const dynamic = "force-dynamic";

export default function EditPage() {
  // Failed tools never reach the picker; extend is app code, always listed.
  const listed = listTools().filter((t) => t.tool.template == null || t.presetId);
  const tools: EditToolMeta[] = listed.map(({ tool, presetId }) => ({
    id: tool.id,
    label: tool.label,
    description: tool.description,
    icon: tool.icon,
    presetId,
    maxSeconds: tool.maxSeconds,
  }));

  const presetIds = listed
    .map((t) => t.presetId)
    .filter((id): id is string => !!id);
  const estimates = presetEstimates(presetIds);
  const presets = presetIds.flatMap((id) => {
    const loaded = getPreset(id);
    return loaded
      ? [{ ...toStudioPreset(loaded.preset), estimate: estimates[id] }]
      : [];
  });

  const extendModels: ExtendModel[] = toStudioModels("video")
    .filter((m) => m.modes.i2v)
    .map((m) => ({ id: m.id, label: m.label }));

  return (
    <Suspense>
      <EditStudio tools={tools} presets={presets} extendModels={extendModels} />
    </Suspense>
  );
}
