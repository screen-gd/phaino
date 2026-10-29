import type { StudioJob } from "@/components/toolStudioData";

export const DEMO_MESSAGE = "Demo: explore the controls and preview sample results. No generation or credits used.";

/** Existing, credited Comfy examples, independent of the prompt and uploads. */
export function demoOutput(category: string, presetId: string): string {
  if (category === "image") {
    return presetId.includes("qwen")
      ? "/explore/examples/qwen-image.webp"
      : "/explore/examples/flux2-klein.webp";
  }
  if (presetId.startsWith("kawarimi")) {
    // Two bundled swaps; the preset picks one deterministically.
    const n =
      [...presetId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 2 + 1;
    return `/explore/examples/kawarimi_${n}.mp4`;
  }
  return presetId.includes("wan")
    ? "/explore/examples/wan22-i2v.mp4"
    : "/explore/examples/ltx25-i2v.mp4";
}

/**
 * The "before" clip for a Kawarimi demo result, e.g.
 * /explore/examples/kawarimi_1.mp4 -> /explore/examples/kawarimi_1_source.mp4.
 */
export function demoSource(output: string): string | undefined {
  const m = /^\/explore\/examples\/kawarimi_(\d+)\.mp4$/.exec(output);
  return m ? `/explore/examples/kawarimi_${m[1]}_source.mp4` : undefined;
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

/** Poster image for a video output: the example sibling .webp, else the poster endpoint. */
export function outputPosterUrl(output: string): string {
  return output.startsWith("/explore/examples/")
    ? output.replace(/\.[^.]+$/, ".webp")
    : `/api/outputs/${output}?poster=1`;
}
