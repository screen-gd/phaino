import { describe, expect, it } from "vitest";
import { resolveImageMode, resolveVideoMode } from "./modes";

describe("resolveVideoMode", () => {
  const all = ["t2v", "i2v", "flf2v"] as const;

  it("no frames -> t2v", () => {
    expect(resolveVideoMode(all, false, false)).toEqual({
      mode: "t2v",
      error: null,
    });
  });
  it("first frame -> i2v", () => {
    expect(resolveVideoMode(all, true, false)).toEqual({
      mode: "i2v",
      error: null,
    });
  });
  it("first and last -> flf2v", () => {
    expect(resolveVideoMode(all, true, true)).toEqual({
      mode: "flf2v",
      error: null,
    });
  });
  it("last frame alone is an error", () => {
    const r = resolveVideoMode(all, false, true);
    expect(r.mode).toBeNull();
    expect(r.error).toMatch(/first frame/i);
  });
  it("falls back to i2v when flf2v is missing", () => {
    expect(resolveVideoMode(["t2v", "i2v"], true, true).mode).toBe("i2v");
    expect(resolveVideoMode(["t2v", "i2v"], true, true).error).not.toBeNull();
  });
  it("no t2v: missing first frame is an error", () => {
    const r = resolveVideoMode(["i2v"], false, false);
    expect(r.mode).toBeNull();
    expect(r.error).toMatch(/first frame/i);
  });
});

describe("resolveImageMode", () => {
  it("no reference -> t2i", () => {
    expect(resolveImageMode(["t2i", "edit"], false).mode).toBe("t2i");
  });
  it("reference -> edit", () => {
    expect(resolveImageMode(["t2i", "edit"], true).mode).toBe("edit");
  });
  it("reference on a t2i-only model is an error", () => {
    const r = resolveImageMode(["t2i"], true);
    expect(r.mode).toBeNull();
    expect(r.error).toMatch(/reference/i);
  });
});
