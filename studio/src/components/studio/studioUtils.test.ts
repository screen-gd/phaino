import { describe, expect, it } from "vitest";
import type { StudioParam, StudioPreset } from "@/components/toolStudioData";
import {
  filterPresets,
  formatParamValue,
  paramKind,
} from "./studioUtils";

const p = (over: Partial<StudioPreset> = {}): StudioPreset => ({
  id: "x",
  name: "X",
  description: "desc",
  model: { id: "m", label: "M" },
  thumbUrl: "/t",
  inputs: [],
  params: [],
  ...over,
});

const int = (key: string, label: string): StudioParam => ({
  type: "int",
  key,
  label,
  default: 5,
  min: 1,
  max: 10,
});

const choice = (
  key: string,
  label: string,
  options: { value: string; label: string }[],
  def = options[0].value,
): StudioParam => ({
  type: "choice",
  key,
  label,
  default: def,
  options,
});

const seed = (key = "seed"): StudioParam => ({
  type: "seed",
  key,
  label: "Seed",
});

describe("filterPresets", () => {
  const presets = [
    p({ id: "orbit", name: "Orbit", description: "Slow orbit around the subject", model: { id: "ltx", label: "LTX 2.5" } }),
    p({ id: "kling3-video", name: "Kling 3.0", description: "First frame to video on Kling 3.0", model: { id: "kling", label: "Kling 3.0" } }),
    p({ id: "nano-banana-2", name: "Nano Banana 2", description: "Text to image on Nano Banana 2", model: { id: "nb", label: "Nano Banana 2" } }),
  ];

  it("matches name, model label and description, case-insensitively", () => {
    expect(filterPresets(presets, "ORBIT").map((x) => x.id)).toEqual(["orbit"]);
    expect(filterPresets(presets, "kling 3.0").map((x) => x.id)).toEqual([
      "kling3-video",
    ]);
    expect(filterPresets(presets, "first frame").map((x) => x.id)).toEqual([
      "kling3-video",
    ]);
    expect(filterPresets(presets, "banana").map((x) => x.id)).toEqual([
      "nano-banana-2",
    ]);
  });

  it("returns all for an empty query", () => {
    expect(filterPresets(presets, "")).toHaveLength(3);
    expect(filterPresets(presets, "   ")).toHaveLength(3);
  });
});

describe("paramKind", () => {
  it("classifies real preset params", () => {
    // wan22-i2v / kling3-video / cameras
    expect(paramKind(int("duration", "Duration (s)"))).toBe("duration");
    expect(paramKind(int("duration2", "Second shot (s)"))).toBe("duration");
    // nano-banana-2 / qwen-image / cameras / seedance25-i2v
    expect(
      paramKind(choice("aspect", "Aspect", [{ value: "16:9", label: "16:9" }])),
    ).toBe("aspect");
    expect(
      paramKind(
        choice("ratio", "Aspect", [{ value: "adaptive", label: "Adaptive" }]),
      ),
    ).toBe("aspect");
    expect(
      paramKind(
        choice("size", "Size", [{ value: "640x640", label: "1:1 640" }]),
      ),
    ).toBe("aspect");
    // kling3-video / seedance25-i2v / nano-banana-2
    expect(
      paramKind(
        choice("resolution", "Resolution", [
          { value: "1080p", label: "1080p" },
        ]),
      ),
    ).toBe("resolution");
    // most presets
    expect(paramKind(seed())).toBe("seed");
    // flux2-klein style choice / fps
    expect(
      paramKind(choice("style", "Style", [{ value: "none", label: "None" }])),
    ).toBe("other");
    expect(
      paramKind(choice("fps", "FPS", [{ value: "24", label: "24" }])),
    ).toBe("other");
  });
});

describe("formatParamValue", () => {
  it("formats durations, choices and seeds", () => {
    expect(formatParamValue(int("duration", "Duration (s)"), 5)).toBe("5s");
    expect(formatParamValue(int("duration", "Duration (s)"), undefined)).toBe(
      "5s",
    );
    expect(
      formatParamValue(
        choice(
          "aspect",
          "Aspect",
          [
            { value: "16:9", label: "16:9" },
            { value: "adaptive", label: "Adaptive" },
          ],
          "16:9",
        ),
        "adaptive",
      ),
    ).toBe("Adaptive");
    expect(formatParamValue(seed(), "random")).toBe("Random");
    expect(formatParamValue(seed(), undefined)).toBe("Random");
    expect(formatParamValue(seed(), 42)).toBe("42");
  });
});

