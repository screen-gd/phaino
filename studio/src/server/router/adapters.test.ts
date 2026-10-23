import { describe, expect, it } from "vitest";
import { findAdapter, routerAdapterFor, type RouterAdapter } from "./adapters";

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
});
