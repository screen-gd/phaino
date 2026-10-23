import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RouterOutputError } from "./adapters";
import { extForMime, saveRouterOutput, uploadDataUrl } from "./media";

describe("extForMime", () => {
  it.each([
    ["image/png", ".png"],
    ["image/jpeg", ".jpg"],
    ["image/webp", ".webp"],
    ["video/mp4", ".mp4"],
    ["video/quicktime", ".mov"],
    ["video/webm", ".webm"],
    ["IMAGE/PNG", ".png"],
    ["image/png; charset=binary", ".png"],
    ["application/octet-stream", ".bin"],
    ["", ".bin"],
  ])("maps %s to %s", (mime, ext) => {
    expect(extForMime(mime)).toBe(ext);
  });
});

describe("Router media files", () => {
  let dir: string;
  const bytes = new Uint8Array([0, 1, 127, 128, 255]);

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "phaino-router-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("round-trips an upload as a data URL", async () => {
    const absPath = path.join(dir, "upload.png");
    fs.writeFileSync(absPath, bytes);

    const url = await uploadDataUrl({ absPath, mimeType: "image/png" });

    expect(url).toBe(`data:image/png;base64,${Buffer.from(bytes).toString("base64")}`);
    expect(Buffer.from(url.split(",")[1], "base64")).toEqual(Buffer.from(bytes));
  });

  it("decodes base64 and creates the output's parent directories", async () => {
    const dest = path.join(dir, "nested", "output");

    const written = await saveRouterOutput({
      kind: "base64",
      data: Buffer.from(bytes).toString("base64"),
      mimeType: "image/png",
    }, dest);

    expect(written).toBe(`${dest}.png`);
    expect(fs.readFileSync(written)).toEqual(Buffer.from(bytes));
  });

  it("uses the response MIME type before the URL extension", async () => {
    const dest = path.join(dir, "nested", "output");
    const fetchImpl: typeof fetch = async () => new Response(bytes, {
      headers: { "content-type": "video/mp4" },
    });

    const written = await saveRouterOutput({
      kind: "url", url: "https://example.com/x.webp",
    }, dest, fetchImpl);

    expect(written).toBe(`${dest}.mp4`);
    expect(fs.readFileSync(written)).toEqual(Buffer.from(bytes));
  });

  it.each([
    ["x.webp", ".webp"],
    ["x.jpeg?download=1", ".jpg"],
    ["x.PNG", ".png"],
    ["x.exe", ".bin"],
    ["x", ".bin"],
  ])("falls back to an allowed URL extension for %s", async (name, ext) => {
    const dest = path.join(dir, "output");
    const fetchImpl: typeof fetch = async () => new Response(bytes, {
      headers: { "content-type": "application/octet-stream" },
    });

    const written = await saveRouterOutput({
      kind: "url", url: `https://example.com/${name}`,
    }, dest, fetchImpl);

    expect(written).toBe(`${dest}${ext}`);
    expect(fs.readFileSync(written)).toEqual(Buffer.from(bytes));
  });

  it("rejects failed downloads with a RouterOutputError", async () => {
    const dest = path.join(dir, "output");
    const fetchImpl: typeof fetch = async () => new Response(null, { status: 404 });
    const saving = saveRouterOutput({
      kind: "url", url: "https://example.com/x.png",
    }, dest, fetchImpl);

    await expect(saving).rejects.toThrow(RouterOutputError);
    await expect(saving).rejects.toThrow("Download failed (404)");
    expect(fs.readdirSync(dir)).toEqual([]);
  });
});
