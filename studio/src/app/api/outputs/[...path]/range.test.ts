import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "phaino-range-"));
process.env.PHAINO_DATA_DIR = dataDir;

const file = path.join(dataDir, "outputs", "x", "clip.mp4");
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, Buffer.alloc(1000, 7));

const { GET } = await import("./route");

function req(range?: string) {
  const headers = range ? { range } : undefined;
  return new Request("http://localhost/api/outputs/x/clip.mp4", { headers });
}

const params = { params: Promise.resolve({ path: ["x", "clip.mp4"] }) };

describe("GET /api/outputs/[...path] ranges", () => {
  it("returns 206 with Content-Range for a byte range", async () => {
    const res = await GET(req("bytes=100-199"), params);
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe("bytes 100-199/1000");
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    expect(res.headers.get("content-length")).toBe("100");
    const body = Buffer.from(await res.arrayBuffer());
    expect(body.length).toBe(100);
    expect(body[0]).toBe(7);
  });

  it("returns 416 for an out-of-bounds range", async () => {
    const res = await GET(req("bytes=2000-"), params);
    expect(res.status).toBe(416);
    expect(res.headers.get("content-range")).toBe("bytes */1000");
  });

  it("serves the whole file without a Range header", async () => {
    const res = await GET(req(), params);
    expect(res.status).toBe(200);
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    expect(res.headers.get("content-length")).toBe("1000");
  });
});
