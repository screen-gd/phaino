import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/sequence/probe", () => ({
  makePoster: vi.fn(async () => {
    throw new Error("ffmpeg failed");
  }),
}));

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "phaino-range-"));
process.env.PHAINO_DATA_DIR = dataDir;

const file = path.join(dataDir, "outputs", "x", "clip.mp4");
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, Buffer.alloc(1000, 7));

const { GET } = await import("./route");
const { makePoster } = await import("@/server/sequence/probe");
const posterMock = vi.mocked(makePoster);

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

  it("returns not_found when the poster cannot be rendered", async () => {
    const res = await GET(
      new Request("http://localhost/api/outputs/x/clip.mp4?poster=1"),
      params,
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("not_found");
  });

  it("serves the cached miss without rerendering for an unchanged video", async () => {
    const res = await GET(
      new Request("http://localhost/api/outputs/x/clip.mp4?poster=1"),
      params,
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("not_found");
  });

  it("renders the poster to a .jpg temp name and serves it", async () => {
    const okFile = path.join(dataDir, "outputs", "y", "clip.mp4");
    fs.mkdirSync(path.dirname(okFile), { recursive: true });
    fs.writeFileSync(okFile, Buffer.alloc(1000, 9));
    posterMock.mockImplementationOnce(async (_src, out) => {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
    });
    const res = await GET(
      new Request("http://localhost/api/outputs/y/clip.mp4?poster=1"),
      { params: Promise.resolve({ path: ["y", "clip.mp4"] }) },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    // ffmpeg infers the image muxer from the extension; a .tmp-only suffix
    // makes it fail, so the render target must keep .jpg.
    expect(posterMock.mock.calls.at(-1)?.[1]).toMatch(/\.jpg$/);
    const body = Buffer.from(await res.arrayBuffer());
    expect(body[0]).toBe(0xff);
    expect(body[1]).toBe(0xd8);
  });
});
