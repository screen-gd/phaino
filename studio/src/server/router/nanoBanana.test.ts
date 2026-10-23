import type { RunResult } from "@comfyorg/sdk";
import { describe, expect, it } from "vitest";
import { nanoBananaAdapter } from "./nanoBanana";
import { RouterOutputError } from "./types";

describe("nanoBananaAdapter.buildInput", () => {
  it("maps prompt, aspect and resolution", () => {
    const input = nanoBananaAdapter.buildInput({
      params: { prompt: "a leaf", aspect: "16:9", resolution: "2K" },
      images: {},
    });
    expect(input).toEqual({
      contents: [{ role: "user", parts: [{ text: "a leaf" }] }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: "16:9", imageSize: "2K" },
      },
    });
  });

  it("omits aspectRatio for auto", () => {
    const input = nanoBananaAdapter.buildInput({
      params: { prompt: "a leaf", aspect: "auto", resolution: "1K" },
      images: {},
    });
    expect(input).not.toHaveProperty("generationConfig.imageConfig.aspectRatio");
    expect(input).toEqual({
      contents: [{ role: "user", parts: [{ text: "a leaf" }] }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: { imageSize: "1K" },
      },
    });
  });

  it("never sends a seed", () => {
    const input = nanoBananaAdapter.buildInput({
      params: { prompt: "a leaf", seed: 123 },
      images: {},
    });
    expect(input).not.toHaveProperty("seed");
    expect(input).not.toHaveProperty("generationConfig.seed");
    expect(JSON.stringify(input)).not.toContain("seed");
  });
});

describe("nanoBananaAdapter.readOutputs", () => {
  it("reads inline images from a json result", () => {
    const result: RunResult = {
      kind: "json",
      data: {
        candidates: [
          {
            content: {
              parts: [
                { text: "hi" },
                { inlineData: { data: "QUJD", mimeType: "image/png" } },
              ],
            },
          },
        ],
      },
      requestId: null,
      servingProvider: null,
      droppedParams: null,
    };
    expect(nanoBananaAdapter.readOutputs(result)).toEqual([
      { kind: "base64", data: "QUJD", mimeType: "image/png" },
    ]);
  });

  it("reads a binary result as base64", () => {
    const result: RunResult = {
      kind: "binary",
      data: new Uint8Array([65, 66, 67]),
      contentType: "image/jpeg",
      requestId: null,
      servingProvider: null,
      droppedParams: null,
    };
    expect(nanoBananaAdapter.readOutputs(result)).toEqual([
      { kind: "base64", data: "QUJD", mimeType: "image/jpeg" },
    ]);
  });

  it("throws on an unexpected json shape", () => {
    const result: RunResult = {
      kind: "json",
      data: { foo: 1 },
      requestId: null,
      servingProvider: null,
      droppedParams: null,
    };
    expect(() => nanoBananaAdapter.readOutputs(result)).toThrow(
      RouterOutputError,
    );
  });
});
