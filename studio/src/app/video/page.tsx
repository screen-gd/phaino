import { Suspense } from "react";
import { VideoStudio } from "@/components/studio/VideoStudio";
import { toStudioPreset } from "@/components/toolStudioData";
import { presetEstimates } from "@/server/jobs/credits";
import { isKawarimiPreset } from "@/server/kawarimi/engines";
import { toStudioModels } from "@/server/models/view";
import { listPresets } from "@/server/presets/load";

export const dynamic = "force-dynamic";

export default function VideoPage() {
  // Kawarimi presets stay out of the picker; they run via API/MCP.
  const listed = listPresets().filter(
    (p) => p.category === "video" && !isKawarimiPreset(p.id),
  );
  const estimates = presetEstimates(listed.map((p) => p.id));
  const presets = listed.map((p) => ({
    ...toStudioPreset(p),
    estimate: estimates[p.id],
  }));
  const models = toStudioModels("video");
  return (
    <Suspense>
      <VideoStudio category="video" presets={presets} models={models} />
    </Suspense>
  );
}
