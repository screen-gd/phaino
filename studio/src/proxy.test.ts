import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
import { isDemoMode } from "./lib/demo-mode";

afterEach(() => vi.unstubAllEnvs());

describe("hosted demo", () => {
  it("defaults to demo on Vercel while preserving local operation and explicit overrides", () => {
    expect(isDemoMode({})).toBe(false);
    expect(isDemoMode({ VERCEL: "1" })).toBe(true);
    expect(isDemoMode({ PHAINO_DEMO: "on" })).toBe(true);
    expect(isDemoMode({ VERCEL: "1", PHAINO_DEMO: "off" })).toBe(false);
  });

  it.each(["/api/jobs", "/api/uploads", "/api/comfy/credentials", "/api/sequence", "/api/edits/extend", "/api/social/posts", "/api/social/credentials"])(
    "blocks writes to %s before the real backend is reached", async (pathname) => {
      vi.stubEnv("PHAINO_DEMO", "on");
      for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
        const response = proxy(new NextRequest(`http://localhost${pathname}`, { method }));
        expect(response.status).toBe(403);
        expect(await response.json()).toMatchObject({ error: "demo_mode" });
      }
    },
  );

  it("never reads or reveals a saved Zernio key", async () => {
    vi.stubEnv("PHAINO_DEMO", "on");
    const creds = proxy(new NextRequest("http://localhost/api/social/credentials"));
    expect(await creds.json()).toEqual({ configured: false, maskedKey: null });
    const accounts = proxy(new NextRequest("http://localhost/api/social/accounts"));
    expect(await accounts.json()).toEqual({ configured: false, accounts: [] });
  });

  it("provides empty job history without opening SQLite", async () => {
    vi.stubEnv("PHAINO_DEMO", "on");
    const response = proxy(new NextRequest("http://localhost/api/jobs?category=image"));
    expect(await response.json()).toEqual({ jobs: [] });
  });

  it("does not expose credentials or probe the backend in demo mode", async () => {
    vi.stubEnv("PHAINO_DEMO", "on");
    const credentials = proxy(new NextRequest("http://localhost/api/comfy/credentials"));
    expect(await credentials.json()).toMatchObject({ configured: false, maskedKey: null });
    const health = proxy(new NextRequest("http://localhost/api/health"));
    expect(await health.json()).toMatchObject({ status: "not_configured", latencyMs: null });
  });

  it("continues catalog reads and real backend requests outside demo mode", () => {
    vi.stubEnv("PHAINO_DEMO", "on");
    expect(proxy(new NextRequest("http://localhost/api/presets")).headers.get("x-middleware-next")).toBe("1");
    vi.stubEnv("PHAINO_DEMO", "off");
    expect(proxy(new NextRequest("http://localhost/api/jobs", { method: "POST" })).headers.get("x-middleware-next")).toBe("1");
  });
});
