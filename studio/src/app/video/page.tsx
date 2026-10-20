import { Suspense } from "react";
import { VideoStudio } from "@/components/studio/VideoStudio";
import { toStudioPreset } from "@/components/toolStudioData";
import { listPresets } from "@/server/presets/load";

export const dynamic = "force-dynamic";

export default function VideoPage() {
  const presets = listPresets()
    .filter((p) => p.category === "video")
    .map(toStudioPreset);
  return (
    <Suspense>
      <VideoStudio category="video" presets={presets} />
    </Suspense>
  );
}
