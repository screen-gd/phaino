import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { StudioEnv } from "@/server/env";
import { comfyTarget, getComfy } from "./client";
import {
  clearComfyCredentials,
  getStoredComfyCredentials,
  maskKey,
  saveComfyCredentials,
  saveCredentialsWithProbe,
} from "./credentials";

const dirs: string[] = [];

function envWith(dataDir: string, key?: string, baseUrl?: string): StudioEnv {
  return {
    comfyApiKey: key,
    comfyBaseUrl: baseUrl,
    partnerModels: false,
    presetsDir: "/presets",
    forksDir: "/forks",
    dataDir,
    user: "local",
    siteUrl: "http://localhost:3000",
    ffmpegPath: "ffmpeg",
    ffprobePath: "ffprobe",
    trackerFile: "/tracker/tasks.json",
  };
}

function tempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "phaino-creds-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
  const g = globalThis as { __phainoComfy?: unknown; __phainoComfyBaseUrlSet?: boolean };
  delete g.__phainoComfy;
  g.__phainoComfyBaseUrlSet = false;
});

describe("comfy credentials store", () => {
  it("saves, reads and clears the stored key", async () => {
    const env = envWith(tempDir());
    expect(getStoredComfyCredentials(env)).toBeNull();

    await saveComfyCredentials(
      { apiKey: "comfyui-secret-1234", savedAt: "2026-10-19T00:00:00.000Z" },
      env,
    );
    expect(getStoredComfyCredentials(env)).toMatchObject({
      apiKey: "comfyui-secret-1234",
    });

    await clearComfyCredentials(env);
    expect(getStoredComfyCredentials(env)).toBeNull();
  });

  it("masks to •••• plus the last 4", () => {
    expect(maskKey("comfyui-secret-1234")).toBe("••••1234");
    expect(maskKey("short")).toBe("••••");
  });
});

describe("comfyTarget resolution order", () => {
  it("uses the settings key before the env key", async () => {
    const dataDir = tempDir();
    const env = envWith(dataDir, "env-key-1234");
    await saveComfyCredentials(
      { apiKey: "settings-key-5678", savedAt: "2026-10-19T00:00:00.000Z" },
      env,
    );
    const t = comfyTarget(env);
    expect(t.apiKey).toBe("settings-key-5678");
    expect(t.source).toBe("settings");
    expect(t.configured).toBe(true);
  });

  it("falls back to the env key and marks source env", () => {
    const t = comfyTarget(envWith(tempDir(), "env-key-1234"));
    expect(t.apiKey).toBe("env-key-1234");
    expect(t.source).toBe("env");
    expect(t.configured).toBe(true);
  });

  it("is not configured with neither", () => {
    const t = comfyTarget(envWith(tempDir()));
    expect(t.apiKey).toBeUndefined();
    expect(t.source).toBeNull();
    expect(t.configured).toBe(false);
  });

  it("uses the stored base URL before COMFY_BASE_URL", async () => {
    const dataDir = tempDir();
    const env = envWith(dataDir, "env-key-1234", "https://env-endpoint.example.com");
    await saveComfyCredentials(
      {
        apiKey: "settings-key-5678",
        baseUrl: "https://settings-endpoint.example.com",
        savedAt: "2026-10-19T00:00:00.000Z",
      },
      env,
    );
    const t = comfyTarget(env);
    expect(t.baseUrl).toBe("https://settings-endpoint.example.com");
    expect(t.kind).toBe("custom");
  });
});

describe("saveCredentialsWithProbe", () => {
  it("rejects when the probe reports unauthorized and does not save", async () => {
    const env = envWith(tempDir());
    const result = await saveCredentialsWithProbe(
      { apiKey: "bad-key-1234" },
      {
        env,
        probe: async () => ({
          status: "unauthorized",
          target: "cloud",
          host: "cloud.comfy.org",
          latencyMs: 20,
          message: "HTTP 401: check the API key",
        }),
      },
    );
    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(getStoredComfyCredentials(env)).toBeNull();
  });

  it("returns 502 when the endpoint is unreachable", async () => {
    const env = envWith(tempDir());
    const result = await saveCredentialsWithProbe(
      { apiKey: "valid-looking-key" },
      {
        env,
        probe: async () => ({
          status: "unreachable",
          target: "cloud",
          host: "cloud.comfy.org",
          latencyMs: 5000,
          message: "Timed out after 5s",
        }),
      },
    );
    expect(result).toMatchObject({ ok: false, status: 502 });
  });

  it("saves and returns ok when the probe answers ok", async () => {
    const env = envWith(tempDir());
    const result = await saveCredentialsWithProbe(
      { apiKey: "valid-looking-key" },
      {
        env,
        probe: async () => ({
          status: "ok",
          target: "cloud",
          host: "cloud.comfy.org",
          latencyMs: 20,
        }),
      },
    );
    expect(result).toEqual({ ok: true });
    expect(getStoredComfyCredentials(env)?.apiKey).toBe("valid-looking-key");
  });
});

describe("getComfy memo", () => {
  it("rebuilds the client when the resolved key changes", async () => {
    const dataDir = tempDir();
    const env = envWith(dataDir, "env-key-1234");
    const first = getComfy(env);

    await saveComfyCredentials(
      { apiKey: "settings-key-5678", savedAt: "2026-10-19T00:00:00.000Z" },
      env,
    );
    const second = getComfy(env);
    expect(second).not.toBe(first);

    // Same resolution again: the memo hits.
    expect(getComfy(env)).toBe(second);
  });
});
