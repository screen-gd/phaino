import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { createDemoJob, outputUrl } from "./demo";

it("previews bundled samples for all three studios without submitting a job", () => {
  for (const [category, presetId] of [["image", "flux2-klein"], ["image", "qwen-image"], ["video", "wan22-i2v"], ["camera", "orbit"]]) {
    const job = createDemoJob({ category, presetId, params: { prompt: "test" }, inputs: {} });
    expect(job.status).toBe("succeeded");
    expect(job.comfyJobId).toBeNull();
    expect(job.message).toContain("Existing sample");
    for (const output of job.outputs) {
      expect(fs.existsSync(path.join(process.cwd(), "public", output))).toBe(true);
      expect(outputUrl(output)).toBe(output);
    }
  }
  expect(outputUrl("orbit/clip.mp4")).toBe("/api/outputs/orbit/clip.mp4");
});
