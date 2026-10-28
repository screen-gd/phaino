import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import pkg from "../../../package.json";
import { DELETE, GET, POST } from "@/app/api/mcp/route";
import { getEnv } from "@/server/env";
import * as jobs from "@/server/jobs/store";
import * as runner from "@/server/jobs/runner";
import { toolHandlers } from "./server";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("MCP tool handlers", () => {
  it("lists Orbit with model, input and parameter keys from the real catalog", () => {
    expect(toolHandlers.list_presets()).toContainEqual(expect.objectContaining({
      id: "orbit", model: "LTX 2.5", chip: "90°", inputs: ["image"], params: expect.arrayContaining(["prompt", "seed"]),
    }));
  });

  it("reads the preset and both workflow formats", () => {
    expect(toolHandlers.get_preset({ id: "orbit" }).id).toBe("orbit");
    expect(toolHandlers.get_workflow({ id: "orbit", format: "ui" })).toHaveProperty("nodes");
    expect(toolHandlers.get_workflow({ id: "orbit", format: "api" })).toHaveProperty("395.class_type");
    expect(() => toolHandlers.get_preset({ id: "unknown-preset" })).toThrow("Unknown preset");
  });

  it("reports unknown jobs and converts output paths to download URLs", () => {
    const db = new DatabaseSync(":memory:");
    try {
      const store = new jobs.JobStore(db);
      vi.spyOn(jobs, "getStore").mockReturnValue(store);
      expect(() => toolHandlers.get_job({ id: "missing" })).toThrow("Job not found");
      const now = "2026-10-28T00:00:00.000Z";
      store.create({ id: "test-job", presetId: "orbit", category: "camera" }, now);
      store.update("test-job", { status: "succeeded", progress: 1, outputs: ["orbit/a shot.mp4"] }, now);
      expect(toolHandlers.get_job({ id: "test-job" })).toMatchObject({
        id: "test-job", status: "succeeded", progress: 1, outputs: ["/api/outputs/orbit/a%20shot.mp4"],
      });
    } finally {
      db.close();
    }
  });

  it("starts through the shared runner with REST defaults and returns immediately", () => {
    vi.stubEnv("PHAINO_DEMO", "off");
    const db = new DatabaseSync(":memory:");
    try {
      const store = new jobs.JobStore(db);
      const job = store.create({ id: "queued-job", presetId: "orbit", category: "camera" }, "2026-10-28T00:00:00.000Z");
      // Only replace submission; no remote generation or credential reads.
      const start = vi.spyOn(runner.JobRunner.prototype, "startJob").mockReturnValue(job);
      const sharedRunner = new runner.JobRunner({
        env: { ...getEnv(), comfyBaseUrl: "http://127.0.0.1:8189" },
        store, dataDir: "", now: () => job.createdAt,
        adapterFor: () => null,
        getClient: () => { throw new Error("Unexpected Comfy call"); },
        getRouter: () => { throw new Error("Unexpected Router call"); },
      });
      vi.spyOn(runner, "getRunner").mockReturnValue(sharedRunner);
      expect(toolHandlers.run_preset({ presetId: "orbit" })).toEqual({ id: "queued-job", status: "queued" });
      expect(start).toHaveBeenCalledWith({ presetId: "orbit", params: {}, inputs: {} });
      start.mockRestore();
      expect(() => toolHandlers.run_preset({ presetId: "orbit" })).toThrow("Missing required input");
    } finally {
      db.close();
    }
  });

  it("rejects malformed params and demo runs before accessing the runner", () => {
    expect(() => toolHandlers.run_preset({ presetId: "" })).toThrow();
    vi.stubEnv("PHAINO_DEMO", "on");
    const start = vi.spyOn(runner, "getRunner");
    expect(() => toolHandlers.run_preset({ presetId: "orbit" })).toThrow("hosted demo cannot run jobs");
    expect(start).not.toHaveBeenCalled();
  });
});

function rpcRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://127.0.0.1:3000/api/mcp", {
    method: "POST",
    headers: { host: "127.0.0.1:3000", "content-type": "application/json", accept: "application/json, text/event-stream", ...headers },
    body: JSON.stringify(body),
  });
}

describe("MCP HTTP transport", () => {
  it("initializes without a session and lists tools in a fresh request", async () => {
    const initialized = await POST(rpcRequest({ jsonrpc: "2.0", id: 1, method: "initialize", params: {
      protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "1" },
    } }));
    expect(initialized.status).toBe(200);
    expect(initialized.headers.has("mcp-session-id")).toBe(false);
    expect(await initialized.json()).toMatchObject({ result: { serverInfo: { name: "phaino", version: pkg.version } } });
    const listed = await POST(rpcRequest({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }));
    expect(listed.status).toBe(200);
    const result = z.object({ result: z.object({ tools: z.array(z.object({ name: z.string() })) }) }).parse(await listed.json());
    expect(result.result.tools.map((tool) => tool.name)).toEqual(["list_presets", "get_preset", "get_workflow", "run_preset", "get_job"]);
  });

  it("calls real catalog tools and returns tool errors over JSON-RPC", async () => {
    const response = await POST(rpcRequest({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_preset", arguments: { id: "orbit" } } }));
    expect(response.status).toBe(200);
    const result = z.object({ result: z.object({ content: z.array(z.object({ type: z.literal("text"), text: z.string() })) }) }).parse(await response.json());
    expect(JSON.parse(result.result.content[0].text)).toMatchObject({ id: "orbit" });
    const unknown = await POST(rpcRequest({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "get_preset", arguments: { id: "unknown-preset" } } }));
    expect(await unknown.json()).toMatchObject({ result: { isError: true } });
  });

  it.each(["localhost:3100", "127.0.0.1:3000", "[::1]:4100"])("allows loopback Host %s", async (host) => {
    const response = await POST(rpcRequest({ jsonrpc: "2.0", id: 5, method: "tools/list" }, { host, origin: `http://${host}` }));
    expect(response.status).toBe(200);
  });

  it("allows the configured site origin", async () => {
    const site = new URL(getEnv().siteUrl);
    const response = await POST(rpcRequest({ jsonrpc: "2.0", id: 6, method: "tools/list" }, { host: site.host, origin: site.origin }));
    expect(response.status).toBe(200);
  });

  it.each<Record<string, string>>([
    { host: "attacker.example" },
    { host: "localhost.attacker.example" },
    { origin: "https://attacker.example" },
    { origin: "null" },
    { origin: "http://localhost:3000/path" },
  ])("rejects untrusted Host/Origin %j", async (headers) => {
    expect((await POST(rpcRequest({ jsonrpc: "2.0", id: 7, method: "tools/list" }, headers))).status).toBe(403);
  });

  it("routes GET and DELETE through the transport", async () => {
    const response = await GET(new Request("http://localhost:3000/api/mcp", { headers: { host: "localhost:3000", accept: "text/event-stream" } }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    await response.body?.cancel();
    const deleted = await DELETE(new Request("http://localhost:3000/api/mcp", { method: "DELETE", headers: { host: "localhost:3000" } }));
    expect(deleted.status).toBe(200);
  });
});
