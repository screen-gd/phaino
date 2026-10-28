import { describe, expect, it } from "vitest";
import { healthLabel, type ComfyHealth } from "./health";

const health = (over: Partial<ComfyHealth>): ComfyHealth => ({
  status: "ok",
  target: "cloud",
  host: "cloud.comfy.org",
  latencyMs: null,
  ...over,
});

describe("healthLabel", () => {
  it("reports Checking while health is loading", () => {
    expect(healthLabel(null)).toBe("Checking...");
  });

  it("maps ok to Connected", () => {
    expect(healthLabel(health({}))).toBe("Connected");
  });

  it("maps not_configured to Not connected", () => {
    expect(healthLabel(health({ status: "not_configured" }))).toBe(
      "Not connected",
    );
  });

  it("uses the server message for errors when present", () => {
    expect(
      healthLabel(health({ status: "unauthorized", message: "key expired" })),
    ).toBe("Error: key expired");
  });

  it("falls back per error status", () => {
    expect(healthLabel(health({ status: "unauthorized" }))).toBe(
      "Error: API key rejected",
    );
    expect(healthLabel(health({ status: "upstream_down" }))).toBe(
      "Error: Comfy Cloud is unavailable",
    );
    expect(healthLabel(health({ status: "unreachable" }))).toBe(
      "Error: Can't reach the host",
    );
    expect(healthLabel(health({ status: "error" }))).toBe(
      "Error: Unknown error",
    );
  });
});
