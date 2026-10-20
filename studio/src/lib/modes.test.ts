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
  it("i2v-only model: first frame lands on i2v, not t2v", () => {
    expect(resolveVideoMode(["i2v"], true, false)).toEqual({
      mode: "i2v",
      error: null,
    });
  });
  it("i2v-only model never falls to t2v", () => {
    const r = resolveVideoMode(["i2v"], false, false);
    expect(r.mode).not.toBe("t2v");
    expect(r.error).toMatch(/first frame/i);
  });
  it("flf2v-only model asks for both frames", () => {
    const r = resolveVideoMode(["flf2v"], true, false);
    expect(r.mode).toBeNull();
    expect(r.error).toMatch(/first and last/i);
    expect(resolveVideoMode(["flf2v"], true, true).mode).toBe("flf2v");
  });
  it("removing the first frame on i2v-only keeps an error", () => {
    const withFrame = resolveVideoMode(["i2v"], true, false);
    const without = resolveVideoMode(["i2v"], false, false);
    expect(withFrame.mode).toBe("i2v");
    expect(without.mode).toBeNull();
    expect(without.error).not.toBeNull();
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
  it("edit-only model needs a reference", () => {
    const r = resolveImageMode(["edit"], false);
    expect(r.mode).toBeNull();
    expect(r.error).toMatch(/reference/i);
  });
  it("edit-only model with a reference lands on edit", () => {
    expect(resolveImageMode(["edit"], true)).toEqual({
      mode: "edit",
      error: null,
    });
  });
  it("removing the reference on edit-only keeps an error", () => {
    expect(resolveImageMode(["edit"], true).mode).toBe("edit");
    const r = resolveImageMode(["edit"], false);
    expect(r.mode).toBeNull();
    expect(r.error).not.toBeNull();
  });
});
