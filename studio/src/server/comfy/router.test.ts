import { beforeEach, describe, expect, it, vi } from "vitest";
import { config, models } from "@comfyorg/sdk";
import type { StudioEnv } from "@/server/env";
import { ComfyNotConfigured } from "./client";
import { getRouter } from "./router";

vi.mock("@comfyorg/sdk", async (orig) => ({
  ...(await orig<typeof import("@comfyorg/sdk")>()),
  config: vi.fn(),
}));

const configMock = vi.mocked(config);
const routerGlobal = globalThis as {
  __phainoRouterKeys?: WeakMap<object, string>;
  __phainoRouterKey?: string;
};

const baseEnv = {
  comfyApiKey: undefined,
  comfyBaseUrl: undefined,
  presetsDir: "/presets",
  forksDir: "/forks",
  dataDir: "/data",
  user: "local",
  siteUrl: "http://localhost:3000",
  ffmpegPath: "ffmpeg",
  ffprobePath: "ffprobe",
  trackerFile: "/tracker/tasks.json",
} satisfies StudioEnv;

beforeEach(() => {
  configMock.mockClear();
  delete routerGlobal.__phainoRouterKeys;
});

describe("getRouter", () => {
  it("throws ComfyNotConfigured without a key and does not configure", () => {
    expect(() => getRouter(baseEnv)).toThrow(ComfyNotConfigured);
    expect(configMock).not.toHaveBeenCalled();
  });

  it("throws ComfyNotConfigured for a custom base URL with no key", () => {
    const env = { ...baseEnv, comfyBaseUrl: "http://127.0.0.1:8189" };
    expect(() => getRouter(env)).toThrow(ComfyNotConfigured);
    expect(configMock).not.toHaveBeenCalled();
  });

  it("returns models and configures with the env key", () => {
    const result = getRouter({ ...baseEnv, comfyApiKey: "key-a" });
    expect(result).toBe(models);
    expect(configMock).toHaveBeenCalledTimes(1);
    expect(configMock).toHaveBeenCalledWith({ credentials: "key-a" });
  });

  it("does not reconfigure on a second call with the same key", () => {
    const env = { ...baseEnv, comfyApiKey: "key-a" };
    getRouter(env);
    getRouter(env);
    expect(configMock).toHaveBeenCalledTimes(1);
  });

  it("reconfigures when the key changes", () => {
    getRouter({ ...baseEnv, comfyApiKey: "key-a" });
    getRouter({ ...baseEnv, comfyApiKey: "key-b" });
    expect(configMock).toHaveBeenCalledTimes(2);
    expect(configMock).toHaveBeenLastCalledWith({ credentials: "key-b" });
  });

  it("reconfigures a fresh SDK instance even with the same key", async () => {
    getRouter({ ...baseEnv, comfyApiKey: "key-a" });
    expect(configMock).toHaveBeenCalledTimes(1);
    // A dev hot reload swaps the sdk module; the memo keys off `models`.
    vi.resetModules();
    vi.doMock("@comfyorg/sdk", async (orig) => ({
      ...(await orig<typeof import("@comfyorg/sdk")>()),
      models: { fresh: true },
      config: configMock,
    }));
    const { getRouter: getRouterFresh } = await import("./router");
    getRouterFresh({ ...baseEnv, comfyApiKey: "key-a" });
    expect(configMock).toHaveBeenCalledTimes(2);
  });

  it("ignores the workflow base URL, passing only credentials", () => {
    const env = {
      ...baseEnv,
      comfyApiKey: "key",
      comfyBaseUrl: "http://127.0.0.1:8189",
    };
    getRouter(env);
    expect(configMock).toHaveBeenCalledWith({ credentials: "key" });
  });

  it("never stores the raw key on globalThis", () => {
    getRouter({ ...baseEnv, comfyApiKey: "key-a" });
    expect(routerGlobal.__phainoRouterKeys).toBeInstanceOf(WeakMap);
    expect(routerGlobal.__phainoRouterKey).toBeUndefined();
  });
});
