import type { RunResult } from "@comfyorg/sdk";
import { describe, expect, it } from "vitest";
import {
  KAWARIMI_ADAPTERS,
  kawarimiAlephAdapter,
  kawarimiGenjutsuAdapter,
  kawarimiH3Adapter,
  kawarimiHappyHorseAdapter,
  kawarimiKlingO1Adapter,
  kawarimiSeedanceAdapter,
  kawarimiWan27Adapter,
} from "./kawarimi";
import { RouterOutputError } from "./types";

const media = {
  video: "https://cdn.example.com/source.mp4",
  character: "https://cdn.example.com/character.png",
};

it("registers every Kawarimi partner adapter with mediaAsUrl", () => {
  const ids = KAWARIMI_ADAPTERS.map((a) => a.presetId).sort();
  expect(ids).toEqual([
    "kawarimi-aleph",
    "kawarimi-genjutsu",
    "kawarimi-h3",
    "kawarimi-happyhorse",
    "kawarimi-seedance",
    "kawarimi-wan27",
  ]);
  for (const adapter of KAWARIMI_ADAPTERS) {
    expect(adapter.mediaAsUrl).toBe(true);
  }
});

describe("kawarimiGenjutsuAdapter", () => {
  it("sends video_url, image_urls, prompt and resolution", () => {
    expect(
      kawarimiGenjutsuAdapter.buildInput({
        params: { prompt: "swap", resolution: "1080p" },
        images: media,
      }),
    ).toEqual({
      video_url: media.video,
      image_urls: [media.character],
      prompt: "swap",
      resolution: "1080p",
    });
  });

  it("falls back to the swap default prompt and 720p", () => {
    const body = kawarimiGenjutsuAdapter.buildInput({
      params: {},
      images: media,
    });
    expect(body.prompt).toContain("reference image");
    expect(body.resolution).toBe("720p");
  });
});

describe("kawarimiSeedanceAdapter", () => {
  it("sends reference_video + reference_image content with duration -1", () => {
    const body = kawarimiSeedanceAdapter.buildInput({
      params: { seed: 7, resolution: "1080p" },
      images: media,
    });
    expect(body.duration).toBe(-1);
    expect(body.generate_audio).toBe(false);
    expect(body.seed).toBe(7);
    expect(body.resolution).toBe("1080p");
    expect(body.content).toEqual([
      { type: "text", text: expect.any(String) },
      {
        type: "video_url",
        video_url: { url: media.video },
        role: "reference_video",
      },
      {
        type: "image_url",
        image_url: { url: media.character },
        role: "reference_image",
      },
    ]);
  });
});

describe("kawarimiH3Adapter", () => {
  it("uses reference_video and sets duration from the source length", () => {
    const body = kawarimiH3Adapter.buildInput({
      params: {},
      images: media,
      sourceSeconds: 7.4,
    });
    expect(body.duration).toBe(7);
    expect(body.resolution).toBe("768P");
    expect(body.content).toEqual([
      { type: "text", text: expect.any(String) },
      {
        type: "video_url",
        video_url: { url: media.video },
        role: "reference_video",
      },
      {
        type: "image_url",
        image_url: { url: media.character },
        role: "reference_image",
      },
    ]);
  });

  it.each([
    [2.4, 4],
    [18.9, 15],
  ])("clamps a %ss source into 4..15", (seconds, duration) => {
    expect(
      kawarimiH3Adapter.buildInput({
        params: {},
        images: media,
        sourceSeconds: seconds,
      }).duration,
    ).toBe(duration);
  });
});

describe("kawarimiKlingO1Adapter", () => {
  it("sends a base video_list entry and the character in image_list", () => {
    const body = kawarimiKlingO1Adapter.buildInput({
      params: { prompt: "swap", resolution: "720p" },
      images: media,
    });
    expect(body).toEqual({
      prompt: "swap",
      video_list: [
        {
          video_url: media.video,
          refer_type: "base",
          keep_original_sound: "yes",
        },
      ],
      image_list: [{ image_url: media.character }],
      mode: "std",
    });
  });

  it("defaults to pro mode", () => {
    expect(
      kawarimiKlingO1Adapter.buildInput({ params: {}, images: media }).mode,
    ).toBe("pro");
  });
});

describe("kawarimiWan27Adapter", () => {
  it("sends video + reference_image media and keeps origin audio", () => {
    const body = kawarimiWan27Adapter.buildInput({
      params: { seed: 3 },
      images: media,
    });
    expect(body.input).toEqual({
      prompt: expect.any(String),
      media: [
        { type: "video", url: media.video },
        { type: "reference_image", url: media.character },
      ],
    });
    expect(body.parameters).toEqual({
      resolution: "720P",
      watermark: false,
      audio_setting: "origin",
      seed: 3,
    });
  });
});

describe("kawarimiHappyHorseAdapter", () => {
  it("sends the same media list without audio_setting", () => {
    const body = kawarimiHappyHorseAdapter.buildInput({
      params: {},
      images: media,
    });
    expect((body.input as { media: unknown[] }).media).toHaveLength(2);
    expect(body.parameters).toEqual({ resolution: "720P", watermark: false });
  });
});

describe("kawarimiAlephAdapter", () => {
  it("sends videoUri and the character as a first-position prompt image", () => {
    const body = kawarimiAlephAdapter.buildInput({
      params: { prompt: "swap", seed: 9 },
      images: media,
    });
    expect(body).toEqual({
      promptText: "swap",
      videoUri: media.video,
      promptImage: [{ uri: media.character, position: "first" }],
      seed: 9,
    });
  });
});

describe("readOutputs", () => {
  const result: RunResult = {
    kind: "json",
    data: {
      output: { videos: [{ url: "https://x.test/swap.mp4" }] },
    },
    requestId: null,
    servingProvider: null,
    droppedParams: null,
  };

  it("reads a video url from a json payload", () => {
    expect(kawarimiWan27Adapter.readOutputs(result)).toEqual([
      { kind: "url", url: "https://x.test/swap.mp4" },
    ]);
  });

  it("throws when the payload has no media", () => {
    const empty: RunResult = {
      kind: "json",
      data: { task_status: "succeed" },
      requestId: null,
      servingProvider: null,
      droppedParams: null,
    };
    expect(() => kawarimiAlephAdapter.readOutputs(empty)).toThrow(
      RouterOutputError,
    );
  });
});
