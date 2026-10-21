import { afterEach, expect, it, vi } from "vitest";
import { presetEstimates } from "./credits";
import * as store from "./store";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("renders demo studios without opening the filesystem database, even with no presets", () => {
  vi.stubEnv("PHAINO_DEMO", "on");
  const open = vi.spyOn(store, "getStore").mockImplementation(() => {
    throw new Error("The deployed filesystem is read-only");
  });
  expect(presetEstimates([])).toEqual({});
  expect(presetEstimates(["orbit", "flux2-klein", "wan22-i2v"])).toEqual({});
  expect(open).not.toHaveBeenCalled();
});
