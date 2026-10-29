import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { createDemoJob, demoSource, outputPosterUrl, outputUrl } from "./demo";

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

it("maps video outputs to a poster image url", () => {
  expect(outputPosterUrl("/explore/examples/ltx25-i2v.mp4")).toBe(
    "/explore/examples/ltx25-i2v.webp",
  );
  expect(outputPosterUrl("seedance25-i2v/abc-0.mp4")).toBe(
    "/api/outputs/seedance25-i2v/abc-0.mp4?poster=1",
  );
});

it("serves bundled Kawarimi swaps and their source clips", () => {
  const job = createDemoJob({ category: "video", presetId: "kawarimi-h3", params: {}, inputs: {} });
  expect(job.outputs).toHaveLength(1);
  const output = job.outputs[0];
  expect(output).toMatch(/^\/explore\/examples\/kawarimi_[12]\.mp4$/);
  const source = demoSource(output);
  expect(source).toMatch(/^\/explore\/examples\/kawarimi_[12]_source\.mp4$/);
  for (const file of [output, source]) {
    expect(fs.existsSync(path.join(process.cwd(), "public", file!))).toBe(true);
  }
  expect(demoSource("kawarimi-h3/result.mp4")).toBeUndefined();
>>>>>>> 481bc23 (Add Kawarimi character swap on SCAIL-2 and Router partner engines)
});
