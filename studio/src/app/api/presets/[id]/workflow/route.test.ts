import { describe, expect, it } from "vitest";
import { GET } from "./route";

const call = (id: string, url: string) =>
  GET(new Request(url), { params: Promise.resolve({ id }) });

describe("GET /api/presets/[id]/workflow", () => {
  it("serves the UI json as an attachment named <id>.json", async () => {
    const res = await call("orbit", "http://localhost/api/presets/orbit/workflow");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="orbit.json"',
    );
    const body = (await res.json()) as { nodes?: unknown[]; links?: unknown[] };
    expect(Array.isArray(body.nodes)).toBe(true);
    expect(Array.isArray(body.links)).toBe(true);
  });

  it("serves the API json as <id>_api.json", async () => {
    const res = await call(
      "orbit",
      "http://localhost/api/presets/orbit/workflow?format=api",
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="orbit_api.json"',
    );
  });

  it("serves a partner preset that runs on Router", async () => {
    expect(
      (await call("kling3-video", "http://localhost/x/api/presets/kling3-video/workflow")).status,
    ).toBe(200);
  });

  it("404s for unknown ids", async () => {
    expect(
      (await call("nope", "http://localhost/x/api/presets/nope/workflow")).status,
    ).toBe(404);
  });
});
