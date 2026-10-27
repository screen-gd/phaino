"use client";

import { useDemo } from "./DemoProvider";
import type { StudioPreset } from "./toolStudioData";
import { demoOutput } from "@/lib/demo";
import { isVideoPath } from "./studio/JobViews";

const SAMPLES = [
  { id: "flux2-klein", name: "FLUX.2 Klein", category: "image" },
  { id: "qwen-image", name: "Qwen Image", category: "image" },
  { id: "ltx25-i2v", name: "LTX 2.5", category: "video" },
  { id: "wan22-i2v", name: "Wan 2.2", category: "video" },
];

export function DemoLibrary({ presets }: { presets: Pick<StudioPreset, "id" | "name">[] }) {
  const demo = useDemo();
  const items = [
    ...demo.jobs.flatMap((job) => job.outputs.map((url) => ({
      id: job.id,
      name: presets.find((preset) => preset.id === job.presetId)?.name ?? job.presetId,
      url,
    }))),
    ...SAMPLES.map((sample) => ({ ...sample, url: demoOutput(sample.category, sample.id) })),
  ];
  return (
    <div className="px-4 py-6">
      <h1 className="mb-2 text-lead font-semibold">Library</h1>
      <p className="mb-4 text-caption text-t3">Sample media. Your preview history is saved in this browser.</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-xl border border-line bg-s2">
            {isVideoPath(item.url)
              ? <video src={item.url} controls muted playsInline preload="metadata" className="aspect-video w-full object-cover" />
              : <img src={item.url} alt={item.name} className="aspect-video w-full object-cover" />}
            <p className="p-3 text-caption text-t2">{item.name} · Sample</p>
          </div>
        ))}
      </div>
    </div>
  );
}
