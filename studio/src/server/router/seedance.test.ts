import type { RunResult } from "@comfyorg/sdk";
import { describe, expect, it } from "vitest";
import { seedanceAdapter } from "./seedance";
import { RouterOutputError } from "./types";

describe("seedanceAdapter.buildInput", () => {
  it("maps prompt, image, duration, resolution and ratio", () => {
    const input = seedanceAdapter.buildInput({
      params: {
        prompt: "a fox",
        duration: 8,
        resolution: "720p",
        ratio: "16:9",
        seed: 9,
      },
      images: { image: "data:image/png;base64,QUJD" },
    });
    expect(input).toEqual({
      content: [
        { type: "text", text: "a fox" },
        {
          type: "image_url",
          image_url: { url: "data:image/png;base64,QUJD" },
          role: "first_frame",
        },
      ],
      duration: 8,
      resolution: "720p",
      ratio: "16:9",
    });
  });

  it("sends only the text part without an image", () => {
    const input = seedanceAdapter.buildInput({
      params: { prompt: "a fox" },
      images: {},
    });
    expect(input).toEqual({
      content: [{ type: "text", text: "a fox" }],
      duration: 5,
      resolution: "1080p",
      ratio: "adaptive",
    });
  });

  it("defaults empty params", () => {
    const input = seedanceAdapter.buildInput({ params: {}, images: {} });
    expect(input).toEqual({
      content: [{ type: "text", text: "" }],
      duration: 5,
      resolution: "1080p",
      ratio: "adaptive",
    });
  });

  it("never sends a seed", () => {
    const input = seedanceAdapter.buildInput({
      params: { prompt: "a fox", seed: 9 },
      images: { image: "data:image/png;base64,QUJD" },
    });
    expect(input).not.toHaveProperty("seed");
    expect(JSON.stringify(input)).not.toContain("seed");
  });
});

describe("seedanceAdapter.readOutputs", () => {
  it("reads a video url from a json result", () => {
    const result: RunResult = {
      kind: "json",
      data: { content: { video_url: "https://x.test/v.mp4" }, id: "t1" },
      requestId: null,
      servingProvider: null,
      droppedParams: null,
    };
    expect(seedanceAdapter.readOutputs(result)).toEqual([
      { kind: "url", url: "https://x.test/v.mp4" },
    ]);
  });

  it("throws when content is null", () => {
    const result: RunResult = {
      kind: "json",
      data: { content: null },
      requestId: null,
      servingProvider: null,
      droppedParams: null,
    };
    expect(() => seedanceAdapter.readOutputs(result)).toThrow(
      RouterOutputError,
    );
  });

  it("reads a binary result as base64", () => {
    const result: RunResult = {
      kind: "binary",
      data: new Uint8Array([65, 66, 67]),
      contentType: "video/mp4",
      requestId: null,
      servingProvider: null,
      droppedParams: null,
    };
    expect(seedanceAdapter.readOutputs(result)).toEqual([
      { kind: "base64", data: "QUJD", mimeType: "video/mp4" },
    ]);
  });
});
