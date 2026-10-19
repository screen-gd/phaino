import { describe, expect, it } from "vitest";
import { resolveOutput } from "./media";

const dataDir = "C:\\data";

describe("resolveOutput", () => {
  it("rejects paths escaping the outputs directory", () => {
    expect(() => resolveOutput(dataDir, "../x.mp4")).toThrowError(/escapes|Absolute/);
    expect(() => resolveOutput(dataDir, "a/../../x.mp4")).toThrowError(/escapes|Absolute/);
  });

  it("rejects absolute paths", () => {
    expect(() => resolveOutput(dataDir, "C:\\temp\\x.mp4")).toThrowError(/Absolute/);
  });

  it("rejects extensions outside the allowlist", () => {
    expect(() => resolveOutput(dataDir, "a/x.exe")).toThrowError(/Unsupported/);
  });

  it("accepts a nested video path", () => {
    const resolved = resolveOutput(dataDir, "a/b.mp4");
    expect(resolved.kind).toBe("video");
    expect(resolved.mimeType).toBe("video/mp4");
    expect(resolved.absPath).toContain("outputs");
  });
});
