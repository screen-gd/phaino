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
    expect(proxy(new NextRequest("http://localhost/api/jobs", { method: "POST", headers: { host: "localhost:3000" } })).headers.get("x-middleware-next")).toBe("1");
  });
});

describe("local studio guard", () => {
  const passes = (response: Response) => response.headers.get("x-middleware-next") === "1";
  const request = (pathname: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) =>
    new NextRequest(`http://localhost:3000${pathname}`, { ...init, headers: { host: "localhost:3000", ...init.headers } });

  it.each(["localhost:3000", "127.0.0.1:3000", "[::1]:3000", "app.phaino.us.ci"])("allows Host %s", (host) => {
    vi.stubEnv("PHAINO_DEMO", "off");
    expect(passes(proxy(request("/api/jobs", { headers: { host } })))).toBe(true);
  });

  it.each(["evil.example", "localhost.evil.example", "evil.example:3000"])("rejects rebound Host %s", async (host) => {
    vi.stubEnv("PHAINO_DEMO", "off");
    for (const path of ["/api/social/accounts", "/api/outputs/a.mp4", "/api/comfy/credentials"]) {
      const response = proxy(request(path, { headers: { host } }));
      expect(response.status).toBe(403);
    }
    const put = proxy(request("/api/comfy/credentials", { method: "PUT", headers: { host, "content-type": "application/json" }, body: "{}" }));
    expect(put.status).toBe(403);
  });

  it.each(["https://evil.example", "null", "http://localhost:3000/path"])("rejects Origin %s", (origin) => {
    vi.stubEnv("PHAINO_DEMO", "off");
    const response = proxy(request("/api/social/posts", { method: "POST", headers: { origin, "content-type": "application/json" }, body: "{}" }));
    expect(response.status).toBe(403);
  });

  it("rejects a cross-site text/plain CSRF post", () => {
    vi.stubEnv("PHAINO_DEMO", "off");
    const response = proxy(request("/api/jobs", { method: "POST", headers: { origin: "https://evil.example", "content-type": "text/plain" }, body: "{}" }));
    expect(response.status).toBe(403);
  });

  it.each(["text/plain", "application/x-www-form-urlencoded", "text/plain;charset=UTF-8"])("rejects %s write bodies", (type) => {
    vi.stubEnv("PHAINO_DEMO", "off");
    const response = proxy(request("/api/social/posts", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": type }, body: "{}" }));
    expect(response.status).toBe(415);
  });

  it("rejects a typeless write body", () => {
    vi.stubEnv("PHAINO_DEMO", "off");
    const response = proxy(request("/api/jobs", { method: "POST", headers: { "content-length": "2" }, body: "{}" }));
    expect(response.status).toBe(415);
  });

  it("allows same-origin JSON, multipart, and bodiless writes", () => {
    vi.stubEnv("PHAINO_DEMO", "off");
    const origin = "http://localhost:3000";
    expect(passes(proxy(request("/api/jobs", { method: "POST", headers: { origin, "content-type": "application/json" }, body: "{}" })))).toBe(true);
    expect(passes(proxy(request("/api/uploads", { method: "POST", headers: { origin, "content-type": "multipart/form-data; boundary=x" }, body: "--x--" })))).toBe(true);
    expect(passes(proxy(request("/api/jobs/1/cancel", { method: "POST", headers: { origin } })))).toBe(true);
    expect(passes(proxy(request("/api/comfy/credentials", { method: "DELETE", headers: { origin, "content-length": "0" } })))).toBe(true);
  });
});
