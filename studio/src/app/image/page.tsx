import { Suspense } from "react";
import { ImageStudio } from "@/components/studio/ImageStudio";
import { toStudioPreset } from "@/components/toolStudioData";
import { presetEstimates } from "@/server/jobs/credits";
import { isKawarimiPreset } from "@/server/kawarimi/engines";
import { toStudioModels } from "@/server/models/view";
import { listPresets } from "@/server/presets/load";

export const dynamic = "force-dynamic";

export default function ImagePage() {
  // Kawarimi presets stay out of the picker; they run via API/MCP.
  const listed = listPresets().filter(
    (p) => p.category === "image" && !isKawarimiPreset(p.id),
  );
  const estimates = presetEstimates(listed.map((p) => p.id));
  const presets = listed.map((p) => ({
    ...toStudioPreset(p),
    estimate: estimates[p.id],
  }));
  const models = toStudioModels("image");
  return (
    <Suspense>
      <ImageStudio presets={presets} models={models} />
    </Suspense>
  );
}
