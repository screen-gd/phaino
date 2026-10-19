import { Suspense } from "react";
import { ToolStudio } from "@/components/ToolStudio";
import { toStudioPreset } from "@/components/toolStudioData";
import { listPresets } from "@/server/presets/load";

export const dynamic = "force-dynamic";

export default function CameraPage() {
  const presets = listPresets()
    .filter((p) => p.category === "camera")
    .map(toStudioPreset);
  return (
    <Suspense>
      <ToolStudio
        title="Camera moves"
        icon="camera"
        category="camera"
        presets={presets}
      />
    </Suspense>
  );
}
