import { describe, expect, it } from "vitest";
import { loadTracker } from "./tracker";

describe("loadTracker", () => {
  it("parses the real tracker/tasks.json", () => {
    const tracker = loadTracker();
    expect(tracker.milestones.length).toBeGreaterThan(0);
    expect(tracker.milestones.every((m) => m.tasks.length > 0)).toBe(true);
  });
});
