import { Suspense } from "react";
import { ToolStudio } from "@/components/ToolStudio";
import { toStudioPreset } from "@/components/toolStudioData";
import { listPresets } from "@/server/presets/load";

export const dynamic = "force-dynamic";

export default function ImagePage() {
  const presets = listPresets()
    .filter((p) => p.category === "image")
    .map(toStudioPreset);
  return (
    <Suspense>
      <ToolStudio title="Image" icon="image" category="image" presets={presets} />
    </Suspense>
  );
}
