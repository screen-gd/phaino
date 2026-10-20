import { describe, expect, it } from "vitest";
import { applyPreset, PresetBindError, type WorkflowApi } from "./bind";
import type { Preset } from "./schema";

const preset = {
  id: "test",
  name: "Test",
  description: "test preset",
  category: "image",
  order: 1,
  engine: "workflow",
  model: { id: "m", label: "M", license: "open" },
  source: { template: "test" },
  inputs: [
    {
      key: "image",
      type: "image",
      label: "Image",
      required: true,
      bind: { node: "5", field: "image" },
    },
  ],
  params: [
    {
      type: "text",
      key: "prompt",
      label: "Prompt",
      default: "",
      template: "{prompt}{style}",
      bind: { node: "1", field: "text" },
    },
    {
      type: "choice",
      key: "style",
      label: "Style",
      default: "",
      options: [
        { value: "", label: "None" },
        { value: ", noir", label: "Noir" },
      ],
    },
    { type: "seed", key: "seed", label: "Seed", bind: { node: "2", field: "noise_seed" } },
    {
      type: "choice",
      key: "aspect",
      label: "Aspect",
      default: "1:1",
      options: [
        {
          value: "1:1",
          label: "1:1",
          set: [
            { node: "3", field: "width", value: 1024 },
            { node: "3", field: "height", value: 1024 },
          ],
        },
        {
          value: "16:9",
          label: "16:9",
          set: [
            { node: "3", field: "width", value: 1360 },
            { node: "3", field: "height", value: 768 },
          ],
        },
      ],
    },
    {
      type: "int",
      key: "count",
      label: "Count",
      default: 1,
      min: 1,
      max: 4,
      bind: { node: "4", field: "batch_size" },
    },
  ],
  outputs: [{ node: "6", kind: "image" }],
} satisfies Preset;

function makeGraph(): WorkflowApi {
  return {
    "1": { class_type: "CLIPTextEncode", inputs: { text: "" } },
    "2": { class_type: "RandomNoise", inputs: { noise_seed: 0 } },
    "3": { class_type: "EmptyLatentImage", inputs: { width: 1024, height: 1024 } },
    "4": { class_type: "EmptyFlux2LatentImage", inputs: { batch_size: 1 } },
    "5": { class_type: "LoadImage", inputs: { image: "" } },
    "6": { class_type: "SaveImage", inputs: {} },
  };
}

const base = {
  inputs: { image: "photo.png" },
  params: { prompt: "a cat" },
};

describe("applyPreset", () => {
  it("resolves text templates against other params", () => {
    const out = applyPreset(makeGraph(), preset, {
      inputs: base.inputs,
      params: { prompt: "a cat", style: ", noir" },
    }, { seed: 7 });
    expect(out["1"].inputs?.text).toBe("a cat, noir");
  });

  it("applies a choice's set entries", () => {
    const out = applyPreset(makeGraph(), preset, {
      ...base,
      params: { ...base.params, aspect: "16:9" },
    }, { seed: 7 });
    expect(out["3"].inputs?.width).toBe(1360);
    expect(out["3"].inputs?.height).toBe(768);
  });

  it("uses the explicit seed param over opts.seed", () => {
    const out = applyPreset(makeGraph(), preset, {
      ...base,
      params: { ...base.params, seed: 42 },
    }, { seed: 7 });
    expect(out["2"].inputs?.noise_seed).toBe(42);
  });

  it("falls back to opts.seed when no seed param is given", () => {
    const out = applyPreset(makeGraph(), preset, base, { seed: 7 });
    expect(out["2"].inputs?.noise_seed).toBe(7);
  });

  it("writes image inputs to their bind", () => {
    const out = applyPreset(makeGraph(), preset, base, { seed: 7 });
    expect(out["5"].inputs?.image).toBe("photo.png");
  });

  it("rejects unknown keys", () => {
    expect(() =>
      applyPreset(makeGraph(), preset, {
        ...base,
        params: { ...base.params, bogus: 1 },
      }, { seed: 7 }),
    ).toThrow(PresetBindError);
    expect(() =>
      applyPreset(makeGraph(), preset, {
        inputs: { ...base.inputs, extra: "x" },
      }, { seed: 7 }),
    ).toThrow(PresetBindError);
  });

  it("rejects a missing required input", () => {
    expect(() =>
      applyPreset(makeGraph(), preset, { params: {} }, { seed: 7 }),
    ).toThrow(PresetBindError);
  });

  it("rejects out-of-range ints", () => {
    expect(() =>
      applyPreset(makeGraph(), preset, {
        ...base,
        params: { ...base.params, count: 9 },
      }, { seed: 7 }),
    ).toThrow(PresetBindError);
  });

  it("never mutates the input graph", () => {
    const graph = makeGraph();
    const before = structuredClone(graph);
    applyPreset(graph, preset, {
      inputs: { image: "photo.png" },
      params: { prompt: "x", style: ", noir", aspect: "16:9", seed: 1, count: 2 },
    }, { seed: 7 });
    expect(graph).toEqual(before);
  });
});
