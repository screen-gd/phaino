import { describe, expect, it } from "vitest";
import type { StudioEnv } from "@/server/env";
import { comfyTarget } from "./client";

const baseEnv = {
  comfyApiKey: undefined,
  comfyBaseUrl: undefined,
  partnerModels: false,
  presetsDir: "/presets",
  forksDir: "/forks",
  dataDir: "/data",
  user: "local",
  siteUrl: "http://localhost:3000",
  ffmpegPath: "ffmpeg",
  ffprobePath: "ffprobe",
  trackerFile: "/tracker/tasks.json",
} satisfies StudioEnv;

describe("comfyTarget", () => {
  it("targets Comfy Cloud, configured, when no base URL and a key is set", () => {
    const t = comfyTarget({ ...baseEnv, comfyApiKey: "key" });
    expect(t.kind).toBe("cloud");
    expect(t.configured).toBe(true);
    expect(t.host).toBe("cloud.comfy.org");
  });

  it("targets Comfy Cloud, not configured, when no base URL and no key", () => {
    const t = comfyTarget(baseEnv);
    expect(t.kind).toBe("cloud");
    expect(t.configured).toBe(false);
  });

  it("targets a custom endpoint, configured without a key", () => {
    const t = comfyTarget({ ...baseEnv, comfyBaseUrl: "http://127.0.0.1:8189" });
    expect(t.kind).toBe("custom");
    expect(t.configured).toBe(true);
    expect(t.host).toBe("127.0.0.1:8189");
  });
});
