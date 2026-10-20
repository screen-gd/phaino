import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveOutput } from "@/server/social/media";
import { resolveUpload } from "@/server/uploads";

let dir: string;
let outDir: string;

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "phaino-out-"));
  outDir = path.join(dir, "outputs", "img");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "shot.png"), PNG);
  writeFileSync(path.join(dir, "outputs", "clip.mp4"), Buffer.from([0, 0, 0]));
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

async function call(pathValue: string) {
  vi.stubEnv("PHAINO_DATA_DIR", dir);
  vi.resetModules();
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/uploads/from-output", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: pathValue }),
    }),
  );
}

describe("POST /api/uploads/from-output", () => {
  it("rejects traversal outside the outputs dir", async () => {
    expect(() => resolveOutput(dir, "../../etc/passwd.png")).toThrow();
    const res = await call("../shot.png");
    expect(res.status).toBe(400);
  });

  it("rejects non-image outputs", async () => {
    const res = await call("clip.mp4");
    expect(res.status).toBe(400);
  });

  it("copies an image output into uploads and returns the upload shape", async () => {
    const res = await call("img/shot.png");
    expect(res.status).toBe(201);
    const body = (await res.json()) as { uploadId: string; previewUrl: string };
    expect(body.uploadId).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(body.previewUrl).toBe(`/api/uploads/${body.uploadId}`);
    const resolved = resolveUpload(dir, body.uploadId);
    expect(readFileSync(resolved.absPath)).toEqual(PNG);
  });
});
