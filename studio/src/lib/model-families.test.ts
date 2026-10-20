import { describe, expect, it } from "vitest";
import { groupPickerRows, modelFamily } from "./model-families";

describe("modelFamily", () => {
  it("maps registry ids to family names", () => {
    expect(modelFamily("flux2-dev")).toBe("FLUX");
    expect(modelFamily("qwen-image-2512")).toBe("Qwen");
    expect(modelFamily("wan21-vace")).toBe("Wan");
    expect(modelFamily("ltx2-distilled")).toBe("LTX");
    expect(modelFamily("ltxv")).toBe("LTX");
    expect(modelFamily("minimax-h3")).toBe("MiniMax");
    expect(modelFamily("kandinsky5")).toBe("Kandinsky");
    expect(modelFamily("sdxl")).toBe("SD");
    expect(modelFamily("sd35")).toBe("SD");
  });
  it("counts FastH3 as MiniMax", () => {
    expect(modelFamily("fasth3")).toBe("MiniMax");
  });
  it("falls back to Other", () => {
    expect(modelFamily("mystery-model")).toBe("Other");
  });
});

const row = (id: string, group?: string) => ({ id, group });

describe("groupPickerRows", () => {
  it("orders families by FAMILY_PREFIXES order, not alphabetically", () => {
    const out = groupPickerRows([
      row("a", "Z-Image"),
      row("b", "Wan"),
      row("c", "Wan"),
      row("d", "LTX"),
      row("e", "LTX"),
      row("f", "HiDream"),
      row("g", "HiDream"),
      row("h", "Z-Image"),
    ]);
    expect(out.map((r) => r.id)).toEqual(["d", "e", "b", "c", "a", "h", "f", "g"]);
    // Wan before Qwen before HiDream; Z-Image between Kandinsky and HiDream.
    expect(out.map((r) => r.group)).toEqual([
      "LTX", "LTX",
      "Wan", "Wan",
      "Z-Image", "Z-Image",
      "HiDream", "HiDream",
    ]);
  });
  it("keeps registry order inside a family", () => {
    const out = groupPickerRows([
      row("flux2-dev", "FLUX"),
      row("flux3-klein", "FLUX"),
      row("flux1-dev", "FLUX"),
      row("wan21", "Wan"),
      row("wan22", "Wan"),
    ]);
    expect(out.map((r) => r.id)).toEqual([
      "wan21",
      "wan22",
      "flux2-dev",
      "flux3-klein",
      "flux1-dev",
    ]);
  });
  it("folds single-model families into a trailing More group", () => {
    const out = groupPickerRows([
      row("ltx25", "LTX"),
      row("ltx23", "LTX"),
      row("capybara", "Capybara"),
      row("humo", "HuMo"),
      row("wan21", "Wan"),
      row("wan22", "Wan"),
    ]);
    expect(out.map((r) => r.group)).toEqual([
      "LTX",
      "LTX",
      "Wan",
      "Wan",
      "More",
      "More",
    ]);
    expect(out.slice(-2).map((r) => r.id)).toEqual(["capybara", "humo"]);
  });
  it("a singleton in this list collapses even if the family has more elsewhere", () => {
    // image picker sees only one LTX model even though video has several
    const out = groupPickerRows([row("z-image", "Z-Image")]);
    expect(out).toEqual([{ id: "z-image", group: "More" }]);
  });
  it("rows without a group join Other, then More if alone", () => {
    const solo = groupPickerRows([row("x")]);
    expect(solo[0].group).toBe("More");
    const pair = groupPickerRows([
      row("a", "Other"),
      row("b", "Other"),
      row("c", "LTX"),
      row("d", "LTX"),
    ]);
    expect(pair.map((r) => r.id)).toEqual(["c", "d", "a", "b"]);
  });
});
