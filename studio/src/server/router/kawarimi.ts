/**
 * Bespoke Router adapters for the Kawarimi (character swap) partner engines.
 * Inputs are `video` (source clip) and `character` (reference image), passed
 * to the models as Comfy storage https URLs (mediaAsUrl). Each engine keeps
 * the source clip's motion, camera and timing; provider-specific duration
 * and resolution fields are filled per schema.
 */
import { readGenericOutputs } from "./generic";
import type { RouterAdapter, RouterParams } from "./types";

function textParam(params: RouterParams, key: string): string {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

function intParam(params: RouterParams, key: string): number | undefined {
  const value = params[key];
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) ? n : undefined;
}

function prompt(params: RouterParams, fallback: string): string {
  const p = textParam(params, "prompt").trim();
  return p === "" ? fallback : p;
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

const readVideo = (result: Parameters<RouterAdapter["readOutputs"]>[0]) =>
  readGenericOutputs(result, "video");

/** Higgsfield Genjutsu: recast the subject, keep motion/camera/audio. */
export const kawarimiGenjutsuAdapter: RouterAdapter = {
  presetId: "kawarimi-genjutsu",
  model: "higgsfield/higgsfield-genjutsu-motion-transfer-v1.0",
  mediaAsUrl: true,
  buildInput: ({ params, images }) => ({
    video_url: images.video,
    image_urls: [images.character],
    prompt: prompt(
      params,
      "Recast the person as the character from the reference image. Keep the source motion, camera movement, timing and audio.",
    ),
    resolution: textParam(params, "resolution") || "720p",
  }),
  readOutputs: readVideo,
};

/** BytePlus Seedance 2.5 video editing: reference_video + reference_image. */
export const kawarimiSeedanceAdapter: RouterAdapter = {
  presetId: "kawarimi-seedance",
  model: "byteplus/dreamina-seedance-2-5-260628",
  mediaAsUrl: true,
  buildInput: ({ params, images }) => ({
    content: [
      {
        type: "text",
        text: prompt(
          params,
          "Replace the person in the video with the character from the reference image. Keep the motion, characters, composition and timing exactly the same.",
        ),
      },
      {
        type: "video_url",
        video_url: { url: images.video },
        role: "reference_video",
      },
      {
        type: "image_url",
        image_url: { url: images.character },
        role: "reference_image",
      },
    ],
    // Video editing tasks support only -1: the output keeps the source length.
    duration: -1,
    generate_audio: false,
    ...(intParam(params, "seed") !== undefined
      ? { seed: intParam(params, "seed") }
      : {}),
    ...(textParam(params, "resolution")
      ? { resolution: textParam(params, "resolution") }
      : {}),
  }),
  readOutputs: readVideo,
};

/** MiniMax H3: regenerate the base video, recast by reference image. */
export const kawarimiH3Adapter: RouterAdapter = {
  presetId: "kawarimi-h3",
  model: "minimax/minimax-h3",
  mediaAsUrl: true,
  buildInput: ({ params, images, sourceSeconds }) => ({
    content: [
      {
        type: "text",
        text: prompt(
          params,
          "Replace the person in <Video 1> with the character from <Picture 1>. Keep the motion, camera and background.",
        ),
      },
      {
        type: "video_url",
        video_url: { url: images.video },
        role: "reference_video",
      },
      {
        type: "image_url",
        image_url: { url: images.character },
        role: "reference_image",
      },
    ],
    resolution: textParam(params, "resolution") || "768P",
    duration: clamp(Math.round(sourceSeconds ?? 5), 4, 15),
    ...(intParam(params, "seed") !== undefined
      ? { seed: intParam(params, "seed") }
      : {}),
  }),
  readOutputs: readVideo,
};

/** Kling O1 omni video edit: video_list base + image_list reference. */
export const kawarimiKlingO1Adapter: RouterAdapter = {
  presetId: "kawarimi-kling-o1",
  model: "kling/kling-video-o1",
  mediaAsUrl: true,
  buildInput: ({ params, images }) => ({
    prompt: prompt(
      params,
      "Change the person in [@Video] to the character from [@Image], keeping the original motion, camera and background.",
    ),
    video_list: [
      {
        video_url: images.video,
        refer_type: "base",
        keep_original_sound: "yes",
      },
    ],
    image_list: [{ image_url: images.character }],
    mode: textParam(params, "resolution") === "720p" ? "std" : "pro",
  }),
  readOutputs: readVideo,
};

/** Wan-family video edit body shared by Wan 2.7 and HappyHorse. */
function wanEditBody(
  params: RouterParams,
  images: { video?: string; character?: string },
  fallbackPrompt: string,
  audioSetting: boolean,
): Record<string, unknown> {
  return {
    input: {
      prompt: prompt(params, fallbackPrompt),
      media: [
        { type: "video", url: images.video },
        { type: "reference_image", url: images.character },
      ],
    },
    parameters: {
      resolution: textParam(params, "resolution") || "720P",
      watermark: false,
      ...(audioSetting ? { audio_setting: "origin" } : {}),
      ...(intParam(params, "seed") !== undefined
        ? { seed: intParam(params, "seed") }
        : {}),
    },
  };
}

export const kawarimiWan27Adapter: RouterAdapter = {
  presetId: "kawarimi-wan27",
  model: "wan/wan2.7-videoedit",
  mediaAsUrl: true,
  buildInput: ({ params, images }) =>
    wanEditBody(
      params,
      images,
      "Replace the person with the character from image1. Keep the motion, camera and background unchanged.",
      true,
    ),
  readOutputs: readVideo,
};

export const kawarimiHappyHorseAdapter: RouterAdapter = {
  presetId: "kawarimi-happyhorse",
  model: "wan/happyhorse-1.0-video-edit",
  mediaAsUrl: true,
  buildInput: ({ params, images }) =>
    wanEditBody(
      params,
      images,
      "Replace the person in the video with the character in the image. Keep the motion, camera and background.",
      false,
    ),
  readOutputs: readVideo,
};

/** Runway Aleph 2 video-to-video edit with the character as prompt image. */
export const kawarimiAlephAdapter: RouterAdapter = {
  presetId: "kawarimi-aleph",
  model: "runway/aleph2",
  mediaAsUrl: true,
  buildInput: ({ params, images }) => ({
    promptText: prompt(
      params,
      "Replace the person with the character from the reference image, keeping their motion, the camera and the background.",
    ),
    videoUri: images.video,
    promptImage: [{ uri: images.character, position: "first" }],
    ...(intParam(params, "seed") !== undefined
      ? { seed: intParam(params, "seed") }
      : {}),
  }),
  readOutputs: readVideo,
};

/**
 * Every registered Kawarimi partner adapter. Kling O1 is kept out: the model
 * refused our own generated source footage with content_policy_violation.
 */
export const KAWARIMI_ADAPTERS: readonly RouterAdapter[] = [
  kawarimiH3Adapter,
  kawarimiGenjutsuAdapter,
  kawarimiSeedanceAdapter,
  kawarimiWan27Adapter,
  kawarimiHappyHorseAdapter,
  kawarimiAlephAdapter,
];
