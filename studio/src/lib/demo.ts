import type { StudioJob } from "@/components/toolStudioData";

export const DEMO_MESSAGE = "Demo: explore the controls and preview sample results. No generation or credits used.";

/** Existing, credited Comfy examples, independent of the prompt and uploads. */
export function demoOutput(category: string, presetId: string): string {
  if (category === "image") {
    return presetId.includes("qwen")
      ? "/explore/examples/qwen-image.webp"
      : "/explore/examples/flux2-klein.webp";
  }
  return presetId.includes("wan")
    ? "/explore/examples/wan22-i2v.mp4"
    : "/explore/examples/ltx25-i2v.mp4";
}

export function createDemoJob(input: Pick<StudioJob, "category" | "presetId" | "params" | "inputs">): StudioJob {
  const now = new Date().toISOString();
  return {
    ...input,
    id: crypto.randomUUID(),
    status: "succeeded",
    comfyJobId: null,
    progress: 1,
    message: "Existing sample, independent of the selected model, prompt and uploads.",
    error: null,
    outputs: [demoOutput(input.category, input.presetId)],
    createdAt: now,
    updatedAt: now,
  };
}

export function outputUrl(output: string): string {
  return output.startsWith("/explore/examples/") ? output : `/api/outputs/${output}`;
}
