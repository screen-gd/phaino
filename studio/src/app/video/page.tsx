import { Suspense } from "react";
import { ToolStudio } from "@/components/ToolStudio";
import { toStudioPreset } from "@/components/toolStudioData";
import { listPresets } from "@/server/presets/load";

export const dynamic = "force-dynamic";

export default function VideoPage() {
  const presets = listPresets()
    .filter((p) => p.category === "video")
    .map(toStudioPreset);
  return (
    <Suspense>
      <ToolStudio title="Video" icon="video" category="video" presets={presets} />
    </Suspense>
  );
}
