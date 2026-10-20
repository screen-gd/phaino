import { describe, expect, it } from "vitest";
import { getPreset } from "./load";
import { miniGraph } from "./miniGraph";

describe("miniGraph", () => {
  it("normalises orbit into a 0..1 box with bound nodes", () => {
    const loaded = getPreset("orbit");
    expect(loaded).not.toBeNull();
    const g = miniGraph(loaded!.preset, loaded!.workflowUi);
    expect(g).not.toBeNull();
    expect(g!.aspect).toBeGreaterThan(0);
    expect(g!.nodes.length).toBeGreaterThan(0);
    expect(g!.nodes.length).toBeLessThanOrEqual(80);
    for (const n of g!.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.x).toBeLessThanOrEqual(1);
      expect(n.y).toBeGreaterThanOrEqual(0);
      expect(n.y).toBeLessThanOrEqual(1 / g!.aspect + 0.05);
    }
    expect(g!.nodes.some((n) => n.bound)).toBe(true);
    expect(g!.links.length).toBeGreaterThan(0);
    for (const [x1, y1, x2, y2] of g!.links) {
      for (const v of [x1, y1, x2, y2]) {
        expect(Math.round(v * 1000)).toBe(v * 1000);
      }
    }
  });
});
