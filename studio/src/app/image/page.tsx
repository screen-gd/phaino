import { Suspense } from "react";
import { ImageStudio } from "@/components/studio/ImageStudio";
import { toStudioPreset } from "@/components/toolStudioData";
import { listPresets } from "@/server/presets/load";

export const dynamic = "force-dynamic";

export default function ImagePage() {
  const presets = listPresets()
    .filter((p) => p.category === "image")
    .map(toStudioPreset);
  return (
    <Suspense>
      <ImageStudio presets={presets} />
    </Suspense>
  );
}
