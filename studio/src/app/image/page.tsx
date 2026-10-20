import { Suspense } from "react";
import { ImageStudio } from "@/components/studio/ImageStudio";
import { toStudioPreset } from "@/components/toolStudioData";
import { presetEstimates } from "@/server/jobs/credits";
import { listPresets } from "@/server/presets/load";

export const dynamic = "force-dynamic";

export default function ImagePage() {
  const listed = listPresets().filter((p) => p.category === "image");
  const estimates = presetEstimates(listed.map((p) => p.id));
  const presets = listed.map((p) => ({
    ...toStudioPreset(p),
    estimate: estimates[p.id],
  }));
  return (
    <Suspense>
      <ImageStudio presets={presets} />
    </Suspense>
  );
}
