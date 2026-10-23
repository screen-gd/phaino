import { describe, expect, it } from "vitest";
import { findAdapter, routerAdapterFor, type RouterAdapter } from "./adapters";
import { nanoBananaAdapter } from "./nanoBanana";
import { seedanceAdapter } from "./seedance";

const adapter: RouterAdapter = {
  presetId: "test-preset",
  model: "provider/model",
  buildInput: ({ params, images }) => ({ ...params, ...images }),
  readOutputs: () => [],
};

describe("findAdapter", () => {
  it("returns the matching adapter from a non-empty registry", () => {
    expect(findAdapter([adapter], "test-preset")).toBe(adapter);
  });

  it("returns null when a non-empty registry has no match", () => {
    expect(findAdapter([adapter], "unknown-preset")).toBeNull();
  });
});

describe("routerAdapterFor", () => {
  it("returns null for Kling while the registry is empty", () => {
    expect(routerAdapterFor("kling3-video")).toBeNull();
  });

  it("returns the Nano Banana 2 adapter", () => {
    expect(routerAdapterFor("nano-banana-2")).toBe(nanoBananaAdapter);
  });

  it("returns the Seedance 2.5 adapter", () => {
    expect(routerAdapterFor("seedance25-i2v")).toBe(seedanceAdapter);
  });
});
