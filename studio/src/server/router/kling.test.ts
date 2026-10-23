import type { RunResult } from "@comfyorg/sdk";
import { describe, expect, it } from "vitest";
import { klingAdapter } from "./kling";
import { RouterInputError, RouterOutputError } from "./types";

describe("klingAdapter.buildInput", () => {
  it("maps a blank second prompt to one shot with a bare base64 first frame", () => {
    const input = klingAdapter.buildInput({
      params: {
        prompt: "a fox",
        prompt2: "  ",
        duration: 2,
        duration2: 3,
        resolution: "1080p",
        seed: 1,
      },
      images: { image: "data:image/png;base64,QUJD" },
    });
    expect(input).toEqual({
      prompt: "a fox",
      duration: "5",
      mode: "pro",
      image_list: [{ image_url: "QUJD", type: "first_frame" }],
    });
  });

  it("maps two prompts to customized shots in standard mode", () => {
    const input = klingAdapter.buildInput({
      params: {
        prompt: "a fox",
        prompt2: "then it runs",
        duration: 2,
        duration2: 3,
        resolution: "720p",
      },
      images: { image: "data:image/png;base64,QUJD" },
    });
    expect(input).toEqual({
      multi_shot: true,
      shot_type: "customize",
      multi_prompt: [
        { index: 1, prompt: "a fox", duration: "2" },
        { index: 2, prompt: "then it runs", duration: "3" },
      ],
      duration: "5",
      mode: "std",
      image_list: [{ image_url: "QUJD", type: "first_frame" }],
    });
    expect(input).not.toHaveProperty("prompt");
  });

  it("omits image_list without an image", () => {
    const input = klingAdapter.buildInput({
      params: { prompt: "a fox" },
      images: {},
    });
    expect(input).toEqual({ prompt: "a fox", duration: "5", mode: "pro" });
    expect(input).not.toHaveProperty("image_list");
  });

  it("defaults non-string prompts and non-integer durations", () => {
    expect(
      klingAdapter.buildInput({
        params: { prompt: 1, prompt2: false, duration: 2.5, duration2: "3" },
        images: {},
      }),
    ).toEqual({ prompt: "", duration: "5", mode: "pro" });
  });

  it("preserves prompt whitespace when sending two shots", () => {
    const input = klingAdapter.buildInput({
      params: { prompt: " a fox ", prompt2: " then it runs " },
      images: {},
    });
    expect(input.multi_prompt).toEqual([
      { index: 1, prompt: " a fox ", duration: "2" },
      { index: 2, prompt: " then it runs ", duration: "3" },
    ]);
  });

  it.each([
    { duration: 10, duration2: 6 },
    { duration: 1, duration2: 1 },
  ])("rejects an invalid total for $duration + $duration2 seconds", (params) => {
    const buildInput = () => klingAdapter.buildInput({ params, images: {} });
    expect(buildInput).toThrow(RouterInputError);
    expect(buildInput).toThrow("Kling 3.0 total length must be 3 to 15 seconds");
  });

  it.each([
    { duration: 1, duration2: 2, total: "3" },
    { duration: 10, duration2: 5, total: "15" },
  ])("accepts a total of $total seconds", ({ duration, duration2, total }) => {
    const input = klingAdapter.buildInput({
      params: { duration, duration2 },
      images: {},
    });
    expect(input.duration).toBe(total);
  });

  it.each(["", "then it runs"])("never sends seed or sound with prompt2 %j", (prompt2) => {
    const input = klingAdapter.buildInput({
      params: { prompt: "a fox", prompt2, seed: 1, sound: "on" },
      images: {},
    });
    expect(JSON.stringify(input)).not.toContain("seed");
    expect(JSON.stringify(input)).not.toContain("sound");
  });
});

describe("klingAdapter.readOutputs", () => {
  it("reads video urls in order from a json result", () => {
    const result: RunResult = {
      kind: "json",
      data: {
        code: 0,
        message: "SUCCEED",
        data: {
          task_id: "t1",
          task_status: "succeed",
          task_result: {
            videos: [
              { id: "v1", url: "https://x.test/1.mp4", duration: "5" },
              { id: "v2", url: "https://x.test/2.mp4", duration: "5" },
            ],
          },
        },
      },
      requestId: null,
      servingProvider: null,
      droppedParams: null,
    };
    expect(klingAdapter.readOutputs(result)).toEqual([
      { kind: "url", url: "https://x.test/1.mp4" },
      { kind: "url", url: "https://x.test/2.mp4" },
    ]);
  });

  it("throws on a failed json result without videos", () => {
    const result: RunResult = {
      kind: "json",
      data: { code: 0, data: { task_status: "failed" } },
      requestId: null,
      servingProvider: null,
      droppedParams: null,
    };
    expect(() => klingAdapter.readOutputs(result)).toThrow(RouterOutputError);
    expect(() => klingAdapter.readOutputs(result)).toThrow(
      "Unexpected Kling 3.0 response",
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
    expect(klingAdapter.readOutputs(result)).toEqual([
      { kind: "base64", data: "QUJD", mimeType: "video/mp4" },
    ]);
  });
});
