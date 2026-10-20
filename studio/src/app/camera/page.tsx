import { Suspense } from "react";
import { VideoStudio } from "@/components/studio/VideoStudio";
import { toStudioPreset } from "@/components/toolStudioData";
import { presetEstimates } from "@/server/jobs/credits";
import { listPresets } from "@/server/presets/load";

export const dynamic = "force-dynamic";

export default function CameraPage() {
  const listed = listPresets().filter((p) => p.category === "camera");
  const estimates = presetEstimates(listed.map((p) => p.id));
  const presets = listed.map((p) => ({
    ...toStudioPreset(p),
    estimate: estimates[p.id],
  }));
  return (
    <Suspense>
      <VideoStudio category="camera" presets={presets} />
    </Suspense>
  );
}
