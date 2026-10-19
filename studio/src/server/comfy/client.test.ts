import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudioEnv } from "@/server/env";
import { createComfyClient } from "./client";

const LOCAL_URL = "http://127.0.0.1:8189";
const CLOUD_URL = "https://cloud.example.test";
const CLOUD_KEY = "secret-cloud";

const env = {
  comfyBaseUrl: LOCAL_URL,
  comfyLocalToken: undefined,
  comfyApiKey: CLOUD_KEY,
  comfyCloudUrl: CLOUD_URL,
  presetsDir: "/presets",
  forksDir: "/forks",
  dataDir: "/data",
  user: "local",
} satisfies StudioEnv;

function notFoundEnvelope() {
  return new Response(
    JSON.stringify({ error: { code: "not_found", message: "no such job" } }),
    { status: 404, headers: { "Content-Type": "application/json" } },
  );
}

describe("createComfyClient", () => {
  const saved = { ...process.env };

  beforeEach(() => {
    process.env.COMFY_BASE_URL = "http://should-be-restored:1";
    process.env.COMFY_API_KEY = CLOUD_KEY;
  });

  afterEach(() => {
    process.env = { ...saved };
    vi.restoreAllMocks();
  });

  it("local backend sends no Authorization header and hits the local URL", async () => {
    const spy = vi.fn<typeof fetch>(async () => notFoundEnvelope());
    const client = createComfyClient("local", env, { fetch: spy });

    await expect(client.jobs.get("x")).rejects.toThrow();

    expect(spy).toHaveBeenCalledOnce();
    const [url, init] = spy.mock.calls[0];
    expect(String(url)).toBe(`${LOCAL_URL}/api/v2/jobs/x`);
    expect(new Headers(init?.headers).get("authorization")).toBeNull();
  });

  it("cloud backend sends the cloud key to COMFY_CLOUD_URL", async () => {
    const spy = vi.fn<typeof fetch>(async () => notFoundEnvelope());
    const client = createComfyClient("cloud", env, { fetch: spy });

    await expect(client.jobs.get("x")).rejects.toThrow();

    const [url, init] = spy.mock.calls[0];
    expect(String(url)).toBe(`${CLOUD_URL}/api/v2/jobs/x`);
    expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${CLOUD_KEY}`);
  });

  it("restores COMFY_BASE_URL and COMFY_API_KEY exactly after construction", () => {
    createComfyClient("local", env);
    expect(process.env.COMFY_BASE_URL).toBe("http://should-be-restored:1");
    expect(process.env.COMFY_API_KEY).toBe(CLOUD_KEY);
  });

  it("restores unset env vars to unset after construction", () => {
    delete process.env.COMFY_BASE_URL;
    delete process.env.COMFY_API_KEY;
    createComfyClient("local", env);
    expect(process.env.COMFY_BASE_URL).toBeUndefined();
    expect(process.env.COMFY_API_KEY).toBeUndefined();
  });
});
