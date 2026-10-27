import { Suspense } from "react";
import { EditStudio } from "@/components/edit/EditStudio";
import { availableEffects } from "@/components/effects/effects";
import { toStudioPreset } from "@/components/toolStudioData";
import { presetEstimates } from "@/server/jobs/credits";
import { listTools } from "@/server/models/resolve";
import { getPreset } from "@/server/presets/load";

export const dynamic = "force-dynamic";

export default function EffectsPage() {
  const listed = listTools().filter((entry) => entry.presetId);
  const presetIds = listed.flatMap((entry) => entry.presetId ? [entry.presetId] : []);
  const estimates = presetEstimates(presetIds);
  const presets = presetIds.flatMap((id) => {
    const loaded = getPreset(id);
    return loaded ? [{ ...toStudioPreset(loaded.preset), estimate: estimates[id] }] : [];
  });
  const effects = availableEffects(presets);
  const effectPresets = presets.filter((preset) => effects.some((effect) => effect.presetId === preset.id));
  const tools = listed.map(({ tool, presetId }) => ({ ...tool, presetId }));

  return (
    <Suspense>
      <EditStudio tools={tools} presets={effectPresets} extendModels={[]} effects={effects} />
    </Suspense>
  );
}
