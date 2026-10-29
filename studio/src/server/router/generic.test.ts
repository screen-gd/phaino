import { describe, expect, it } from "vitest";
import type { RunResult } from "@comfyorg/sdk";
import { ROUTER_CATALOG, routerSpecFor } from "./catalog";
import { genericAdapter, readGenericOutputs } from "./generic";
import { RouterInputError, RouterOutputError } from "./types";
import { routerAdapterFor } from "./adapters";

const spec = (id: string) => {
  const s = routerSpecFor(id);
  if (!s) throw new Error(`missing spec ${id}`);
  return s;
};

const pngDataUrl = "data:image/png;base64," + "a".repeat(64);
const mp4DataUrl = "data:video/mp4;base64," + "b".repeat(64);

const jsonResult = (data: unknown): RunResult => ({
  kind: "json",
  data,
  requestId: null,
  servingProvider: null,
  droppedParams: null,
  creditsUsed: null,
});

describe("genericAdapter buildInput", () => {
  it("builds a generic body with prompt, image and duration", () => {
    const a = genericAdapter(spec("wan-2-7-i2v"));
    expect(
      a.buildInput({
        params: { prompt: "a shot", duration: 5, aspect: "16:9" },
        images: { image: pngDataUrl },
      }),
    ).toEqual({
      prompt: "a shot",
      image: pngDataUrl,
      duration: 5,
      aspect_ratio: "16:9",
    });
  });

  it("omits adaptive aspect and empty prompt", () => {
    const a = genericAdapter(spec("minimax-h3"));
    expect(
      a.buildInput({ params: { prompt: "", aspect: "adaptive" }, images: {} }),
    ).toEqual({});
  });

  it("builds the seedance content array", () => {
    const a = genericAdapter(spec("seedance-2-0"));
    expect(
      a.buildInput({
        params: { prompt: "p", duration: 8, aspect: "9:16" },
        images: { image: pngDataUrl },
      }),
    ).toEqual({
      content: [
        { type: "text", text: "p" },
        { type: "image_url", image_url: { url: pngDataUrl }, role: "first_frame" },
      ],
      duration: 8,
      ratio: "9:16",
    });
  });

  it("builds the kling body with bare-base64 image list", () => {
    const a = genericAdapter(spec("kling-v3"));
    expect(
      a.buildInput({
        params: { prompt: "p", duration: 5 },
        images: { image: pngDataUrl },
      }),
    ).toEqual({
      prompt: "p",
      duration: "5",
      image_list: [{ image_url: "a".repeat(64), type: "first_frame" }],
    });
  });

  it("builds the veo instances/parameters shape", () => {
    const a = genericAdapter(spec("veo-3-1"));
    expect(
      a.buildInput({
        params: { prompt: "p", duration: 8, aspect: "16:9" },
        images: { image: pngDataUrl },
      }),
    ).toEqual({
      instances: [{ prompt: "p", image: { bytesBase64Encoded: "a".repeat(64) } }],
      parameters: { aspectRatio: "16:9", durationSeconds: 8, generateAudio: true, sampleCount: 1 },
    });
  });

  it("falls back to 8s and drops aspects veo does not accept", () => {
    const a = genericAdapter(spec("veo-3-1"));
    const body = a.buildInput({ params: { prompt: "p", duration: 5, aspect: "1:1" }, images: {} });
    expect(body.parameters).toEqual({ durationSeconds: 8, generateAudio: true, sampleCount: 1 });
  });

  it("accepts a numeric-string duration", () => {
    const a = genericAdapter(spec("veo-3-1"));
    const body = a.buildInput({ params: { prompt: "p", duration: "6" }, images: {} });
    expect(body.parameters).toEqual({ durationSeconds: 6, generateAudio: true, sampleCount: 1 });
  });

  it("builds the gemini contents/parts shape", () => {
    const a = genericAdapter(spec("gemini-3-pro-image"));
    expect(
      a.buildInput({
        params: { prompt: "p", aspect: "3:2" },
        images: { image: pngDataUrl },
      }),
    ).toEqual({
      contents: [
        {
          role: "user",
          parts: [
            { text: "p" },
            { inlineData: { data: "a".repeat(64), mimeType: "image/png" } },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: "3:2" },
      },
    });
  });

  it("builds the runway promptText/promptImage shape", () => {
    const a = genericAdapter(spec("runway-gen4-turbo"));
    expect(
      a.buildInput({
        params: { prompt: "p", duration: 5 },
        images: { image: pngDataUrl },
      }),
    ).toEqual({
      promptText: "p",
      promptImage: [{ uri: pngDataUrl }],
      duration: 5,
    });
  });

  it("passes the aleph source video as videoUri", () => {
    const a = genericAdapter(spec("runway-aleph2"));
    expect(
      a.buildInput({
        params: { prompt: "p" },
        images: { video: mp4DataUrl },
      }),
    ).toEqual({ promptText: "p", videoUri: mp4DataUrl });
  });

  it("builds the bfl body with input_image and input_video", () => {
    const a = genericAdapter(spec("bfl-video-edit"));
    expect(
      a.buildInput({
        params: { prompt: "relight" },
        images: { video: mp4DataUrl },
      }),
    ).toEqual({ prompt: "relight", input_video: mp4DataUrl });
  });

  it("merges options JSON last so it can override mapped fields", () => {
    const a = genericAdapter(spec("wan-2-7-t2v"));
    expect(
      a.buildInput({
        params: { prompt: "p", options: '{"resolution":"1080p","prompt":"win"}' },
        images: {},
      }),
    ).toEqual({ prompt: "win", resolution: "1080p" });
  });

  it("rejects malformed options JSON", () => {
    const a = genericAdapter(spec("wan-2-7-t2v"));
    expect(() =>
      a.buildInput({ params: { options: "not json" }, images: {} }),
    ).toThrow(RouterInputError);
    expect(() =>
      a.buildInput({ params: { options: "[1]" }, images: {} }),
    ).toThrow(RouterInputError);
  });
});

describe("readGenericOutputs", () => {
  it("finds nested media urls", () => {
    const out = readGenericOutputs(
      jsonResult({ data: { task_result: { videos: [{ url: "https://x/v.mp4" }] } } }),
      "video",
    );
    expect(out).toEqual([{ kind: "url", url: "https://x/v.mp4" }]);
  });

  it("reads a list of output urls", () => {
    const out = readGenericOutputs(
      jsonResult({ data: { status: "completed", outputs: ["https://x/a.png", "https://x/b.png"] } }),
      "image",
    );
    expect(out).toEqual([
      { kind: "url", url: "https://x/a.png" },
      { kind: "url", url: "https://x/b.png" },
    ]);
  });

  it("skips status and callback links", () => {
    const out = readGenericOutputs(
      jsonResult({
        status_url: "https://x/status",
        callback_url: "https://x/cb",
        video_url: "https://x/v.mp4",
      }),
      "video",
    );
    expect(out).toEqual([{ kind: "url", url: "https://x/v.mp4" }]);
  });

  it("finds openai-style b64_json with default mime", () => {
    const out = readGenericOutputs(
      jsonResult({ data: [{ b64_json: "a".repeat(600) }] }),
      "image",
    );
    expect(out).toEqual([
      { kind: "base64", data: "a".repeat(600), mimeType: "image/png" },
    ]);
  });

  it("finds gemini inlineData with sibling mimeType", () => {
    const out = readGenericOutputs(
      jsonResult({
        candidates: [
          {
            content: {
              parts: [
                { inlineData: { data: "a".repeat(600), mimeType: "image/webp" } },
              ],
            },
          },
        ],
      }),
      "image",
    );
    expect(out).toEqual([
      { kind: "base64", data: "a".repeat(600), mimeType: "image/webp" },
    ]);
  });

  it("reads binary results as base64", () => {
    const out = readGenericOutputs(
      {
        kind: "binary",
        data: new Uint8Array([1, 2, 3]),
        contentType: "video/mp4",
        requestId: null,
        servingProvider: null,
        droppedParams: null,
      },
      "video",
    );
    expect(out).toEqual([
      { kind: "base64", data: Buffer.from([1, 2, 3]).toString("base64"), mimeType: "video/mp4" },
    ]);
  });

  it("throws when the payload carries no media", () => {
    expect(() => readGenericOutputs(jsonResult({ message: "done" }), "image")).toThrow(
      RouterOutputError,
    );
  });
});

describe("catalog wiring", () => {
  it("every catalog entry resolves an adapter", () => {
    for (const s of ROUTER_CATALOG) {
      expect(routerAdapterFor(s.presetId)?.model).toBe(s.model);
    }
  });

  it("catalog ids are unique and slugs", () => {
    const ids = ROUTER_CATALOG.map((s) => s.presetId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });
});
