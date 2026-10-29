/**
 * Partner models served through Comfy Router, registered as presets.
 * Field names and payload shapes are best-effort per provider family; the
 * preset's advanced "Options (JSON)" param is merged into the request body
 * for anything the mapping does not cover.
 */
import { specSupport } from "./generic";

export type RouterShape =
  | "generic"
  | "gemini-image"
  | "seedance"
  | "kling"
  | "veo"
  | "openai-image"
  | "runway"
  | "bfl"
  | "minimax";

export type RouterModelSpec = {
  /** Preset id, also the slug shown in pickers. */
  presetId: string;
  /** Canonical "{provider}/{model}" Router id. */
  model: string;
  name: string;
  description: string;
  category: "image" | "video";
  order: number;
  /** Payload family the generic adapter builds for this model. */
  shape: RouterShape;
  /** Optional upload slot; the value is injected as a data URL. */
  input?: { key: string; type: "image" | "video"; label: string; required: boolean };
};

const image = (required = false, label = "Reference image") =>
  ({ key: "image", type: "image", label, required }) as const;
const video = (required = true, label = "Source video") =>
  ({ key: "video", type: "video", label, required }) as const;

/** Every partner model, before checking Router's published schemas. */
export const ROUTER_MODELS: RouterModelSpec[] = [
  // ----- Video generation -----
  { presetId: "veo-3-1", model: "veo/veo-3.1-generate-001", name: "Veo 3.1", description: "Text or image to video on Veo 3.1.", category: "video", order: 10, shape: "veo", input: image() },
  { presetId: "veo-3-1-fast", model: "veo/veo-3.1-fast-generate-001", name: "Veo 3.1 Fast", description: "Faster text or image to video on Veo 3.1.", category: "video", order: 11, shape: "veo", input: image() },
  { presetId: "veo-3-1-lite", model: "veo/veo-3.1-lite-generate-001", name: "Veo 3.1 Lite", description: "Lightweight text or image to video on Veo 3.1.", category: "video", order: 12, shape: "veo", input: image() },
  { presetId: "ltx-2-5-fast", model: "ltx/ltx-2-5-fast", name: "LTX 2.5 Fast", description: "Text or image to video on hosted LTX 2.5 Fast.", category: "video", order: 13, shape: "generic", input: image() },
  { presetId: "ltx-2-5-pro", model: "ltx/ltx-2-5-pro", name: "LTX 2.5 Pro", description: "Text or image to video on hosted LTX 2.5 Pro.", category: "video", order: 14, shape: "generic", input: image() },
  { presetId: "kling-v3", model: "kling/kling-v3", name: "Kling 3.0 Video", description: "Text or image to video on Kling 3.0.", category: "video", order: 15, shape: "kling", input: image() },
  { presetId: "kling-3-0-turbo", model: "kling/kling-3.0-turbo", name: "Kling 3.0 Turbo", description: "Faster text or image to video on Kling 3.0 Turbo.", category: "video", order: 16, shape: "kling", input: image() },
  { presetId: "kling-v2-6", model: "kling/kling-v2-6", name: "Kling 2.6", description: "Text or image to video on Kling 2.6.", category: "video", order: 17, shape: "kling", input: image() },
  { presetId: "kling-v2-5-turbo", model: "kling/kling-v2-5-turbo", name: "Kling 2.5 Turbo", description: "Text or image to video on Kling 2.5 Turbo.", category: "video", order: 18, shape: "kling", input: image() },
  { presetId: "kling-video-o1", model: "kling/kling-video-o1", name: "Kling Video O1", description: "Text or image to video on Kling Video O1.", category: "video", order: 19, shape: "kling", input: image() },
  { presetId: "seedance-1-5-pro", model: "byteplus/seedance-1-5-pro-251215", name: "Seedance 1.5 Pro", description: "Text or image to video on Seedance 1.5 Pro.", category: "video", order: 20, shape: "seedance", input: image() },
  { presetId: "seedance-2-0", model: "byteplus/dreamina-seedance-2-0-260128", name: "Seedance 2.0", description: "Text or image to video on Seedance 2.0.", category: "video", order: 21, shape: "seedance", input: image() },
  { presetId: "seedance-2-0-fast", model: "byteplus/dreamina-seedance-2-0-fast-260128", name: "Seedance 2.0 Fast", description: "Faster text or image to video on Seedance 2.0.", category: "video", order: 22, shape: "seedance", input: image() },
  { presetId: "seedance-2-0-mini", model: "byteplus/dreamina-seedance-2-0-mini", name: "Seedance 2.0 Mini", description: "Lightweight text or image to video on Seedance 2.0.", category: "video", order: 23, shape: "seedance", input: image() },
  { presetId: "seedance-1-0-pro", model: "byteplus/seedance-1-0-pro-250528", name: "Seedance 1.0 Pro", description: "Text or image to video on Seedance 1.0 Pro.", category: "video", order: 24, shape: "seedance", input: image() },
  { presetId: "seedance-1-0-pro-fast", model: "byteplus/seedance-1-0-pro-fast-251015", name: "Seedance 1.0 Pro Fast", description: "Faster text or image to video on Seedance 1.0 Pro.", category: "video", order: 25, shape: "seedance", input: image() },
  { presetId: "fal-seedance-2-5", model: "fal/fal-seedance-2.5", name: "Seedance 2.5 (fal)", description: "Text or image to video on Seedance 2.5 via fal.", category: "video", order: 26, shape: "generic", input: image() },
  { presetId: "fal-seedance-2-0", model: "fal/fal-seedance-2.0", name: "Seedance 2.0 (fal)", description: "Text or image to video on Seedance 2.0 via fal.", category: "video", order: 27, shape: "generic", input: image() },
  { presetId: "runware-seedance-2-5", model: "runware/runware-seedance-2.5", name: "Seedance 2.5 (Runware)", description: "Text or image to video on Seedance 2.5 via Runware.", category: "video", order: 28, shape: "generic", input: image() },
  { presetId: "runware-seedance-2-0", model: "runware/runware-seedance-2.0", name: "Seedance 2.0 (Runware)", description: "Text or image to video on Seedance 2.0 via Runware.", category: "video", order: 29, shape: "generic", input: image() },
  { presetId: "wavespeed-seedance-2-5", model: "wavespeed/wavespeed-seedance-2.5", name: "Seedance 2.5 (Wavespeed)", description: "Text or image to video on Seedance 2.5 via Wavespeed.", category: "video", order: 30, shape: "generic", input: image() },
  { presetId: "wavespeed-seedance-2-0", model: "wavespeed/wavespeed-seedance-2.0", name: "Seedance 2.0 (Wavespeed)", description: "Text or image to video on Seedance 2.0 via Wavespeed.", category: "video", order: 31, shape: "generic", input: image() },
  { presetId: "pika-seedance-2-0", model: "pika/pika-seedance-2.0", name: "Seedance 2.0 (Pika)", description: "Text or image to video on Seedance 2.0 via Pika.", category: "video", order: 32, shape: "generic", input: image() },
  { presetId: "higgsfield-seedance-2-5", model: "higgsfield/higgsfield-seedance-2.5", name: "Seedance 2.5 (Higgsfield)", description: "Text or image to video on Seedance 2.5 via Higgsfield.", category: "video", order: 33, shape: "generic", input: image() },
  { presetId: "higgsfield-seedance-2-0", model: "higgsfield/higgsfield-seedance-2.0", name: "Seedance 2.0 (Higgsfield)", description: "Text or image to video on Seedance 2.0 via Higgsfield.", category: "video", order: 34, shape: "generic", input: image() },
  { presetId: "higgsfield-kling-3-4k", model: "higgsfield/higgsfield-kling-3-4k", name: "Kling 3.0 4K (Higgsfield)", description: "Text or image to video on Kling 3.0 4K via Higgsfield.", category: "video", order: 35, shape: "generic", input: image() },
  { presetId: "higgsfield-kling-3-pro", model: "higgsfield/higgsfield-kling-3-pro", name: "Kling 3.0 Pro (Higgsfield)", description: "Text or image to video on Kling 3.0 Pro via Higgsfield.", category: "video", order: 36, shape: "generic", input: image() },
  { presetId: "higgsfield-kling-3-std", model: "higgsfield/higgsfield-kling-3-std", name: "Kling 3.0 Std (Higgsfield)", description: "Text or image to video on Kling 3.0 Std via Higgsfield.", category: "video", order: 37, shape: "generic", input: image() },
  { presetId: "higgsfield-kling-3-turbo", model: "higgsfield/higgsfield-kling-3-turbo", name: "Kling 3.0 Turbo (Higgsfield)", description: "Text or image to video on Kling 3.0 Turbo via Higgsfield.", category: "video", order: 38, shape: "generic", input: image() },
  { presetId: "higgsfield-wan-3", model: "higgsfield/higgsfield-wan-3", name: "Wan 3 (Higgsfield)", description: "Text or image to video on Wan 3 via Higgsfield.", category: "video", order: 39, shape: "generic", input: image() },
  { presetId: "wan-3-0-video", model: "wan/wan3.0-video", name: "Wan 3.0", description: "Text or image to video on Wan 3.0.", category: "video", order: 40, shape: "generic", input: image() },
  { presetId: "wan-3-0-video-prime", model: "wan/wan3.0-video-prime", name: "Wan 3.0 Prime", description: "Text or image to video on Wan 3.0 Prime.", category: "video", order: 41, shape: "generic", input: image() },
  { presetId: "wan-2-7-t2v", model: "wan/wan2.7-t2v", name: "Wan 2.7 T2V", description: "Text to video on Wan 2.7.", category: "video", order: 42, shape: "generic" },
  { presetId: "wan-2-7-i2v", model: "wan/wan2.7-i2v", name: "Wan 2.7 I2V", description: "First frame to video on Wan 2.7.", category: "video", order: 43, shape: "generic", input: image(true, "First frame") },
  { presetId: "wan-2-7-r2v", model: "wan/wan2.7-r2v", name: "Wan 2.7 R2V", description: "Reference image to video on Wan 2.7.", category: "video", order: 44, shape: "generic", input: image(true) },
  { presetId: "wan-2-6-t2v", model: "wan/wan2.6-t2v", name: "Wan 2.6 T2V", description: "Text to video on Wan 2.6.", category: "video", order: 45, shape: "generic" },
  { presetId: "wan-2-6-i2v", model: "wan/wan2.6-i2v", name: "Wan 2.6 I2V", description: "First frame to video on Wan 2.6.", category: "video", order: 46, shape: "generic", input: image(true, "First frame") },
  { presetId: "wan-2-6-r2v", model: "wan/wan2.6-r2v", name: "Wan 2.6 R2V", description: "Reference image to video on Wan 2.6.", category: "video", order: 47, shape: "generic", input: image(true) },
  { presetId: "wan-2-5-t2v", model: "wan/wan2.5-t2v-preview", name: "Wan 2.5 T2V", description: "Text to video on Wan 2.5.", category: "video", order: 48, shape: "generic" },
  { presetId: "wan-2-5-i2v", model: "wan/wan2.5-i2v-preview", name: "Wan 2.5 I2V", description: "First frame to video on Wan 2.5.", category: "video", order: 49, shape: "generic", input: image(true, "First frame") },
  { presetId: "happyhorse-1-1-t2v", model: "wan/happyhorse-1.1-t2v", name: "HappyHorse 1.1 T2V", description: "Text to video on HappyHorse 1.1.", category: "video", order: 50, shape: "generic" },
  { presetId: "happyhorse-1-1-i2v", model: "wan/happyhorse-1.1-i2v", name: "HappyHorse 1.1 I2V", description: "First frame to video on HappyHorse 1.1.", category: "video", order: 51, shape: "generic", input: image(true, "First frame") },
  { presetId: "happyhorse-1-1-r2v", model: "wan/happyhorse-1.1-r2v", name: "HappyHorse 1.1 R2V", description: "Reference image to video on HappyHorse 1.1.", category: "video", order: 52, shape: "generic", input: image(true) },
  { presetId: "happyhorse-1-0-t2v", model: "wan/happyhorse-1.0-t2v", name: "HappyHorse 1.0 T2V", description: "Text to video on HappyHorse 1.0.", category: "video", order: 53, shape: "generic" },
  { presetId: "happyhorse-1-0-i2v", model: "wan/happyhorse-1.0-i2v", name: "HappyHorse 1.0 I2V", description: "First frame to video on HappyHorse 1.0.", category: "video", order: 54, shape: "generic", input: image(true, "First frame") },
  { presetId: "happyhorse-1-0-r2v", model: "wan/happyhorse-1.0-r2v", name: "HappyHorse 1.0 R2V", description: "Reference image to video on HappyHorse 1.0.", category: "video", order: 55, shape: "generic", input: image(true) },
  { presetId: "minimax-h3", model: "minimax/minimax-h3", name: "MiniMax H3", description: "Text or image to video on MiniMax H3.", category: "video", order: 56, shape: "minimax", input: image() },
  { presetId: "fal-h3-max", model: "fal/h3-max", name: "MiniMax H3 Max (fal)", description: "Text or image to video on MiniMax H3 Max via fal.", category: "video", order: 57, shape: "generic", input: image() },
  { presetId: "fal-h3-max-turbo", model: "fal/h3-max-turbo", name: "MiniMax H3 Max Turbo (fal)", description: "Text or image to video on MiniMax H3 Max Turbo via fal.", category: "video", order: 58, shape: "generic", input: image() },
  { presetId: "luma-ray-3-2", model: "luma_2/ray-3.2", name: "Ray 3.2", description: "Text or image to video on Luma Ray 3.2.", category: "video", order: 59, shape: "generic", input: image() },
  { presetId: "moonvalley-t2v", model: "moonvalley/text-to-video", name: "Moonvalley T2V", description: "Text to video on Moonvalley.", category: "video", order: 60, shape: "generic" },
  { presetId: "moonvalley-i2v", model: "moonvalley/image-to-video", name: "Moonvalley I2V", description: "First frame to video on Moonvalley.", category: "video", order: 61, shape: "generic", input: image(true, "First frame") },
  { presetId: "moonvalley-v2v", model: "moonvalley/video-to-video", name: "Moonvalley V2V", description: "Restyle a video on Moonvalley.", category: "video", order: 62, shape: "generic", input: video() },
  { presetId: "pika-2-5-t2v", model: "pika/pika-2.5-text-to-video", name: "Pika 2.5 T2V", description: "Text to video on Pika 2.5.", category: "video", order: 63, shape: "generic" },
  { presetId: "pika-2-5-i2v", model: "pika/pika-2.5-image-to-video", name: "Pika 2.5 I2V", description: "First frame to video on Pika 2.5.", category: "video", order: 64, shape: "generic", input: image(true, "First frame") },
  { presetId: "pruna-p-video-2", model: "pruna/p-video-2", name: "P-Video 2", description: "Text or image to video on Pruna P-Video 2.", category: "video", order: 65, shape: "generic", input: image() },
  { presetId: "runway-gen4-turbo", model: "runway/gen4_turbo", name: "Runway Gen-4 Turbo", description: "Image to video on Runway Gen-4 Turbo.", category: "video", order: 66, shape: "runway", input: image(true, "First frame") },
  { presetId: "flux-3-video", model: "bfl/flux-3-video", name: "FLUX.3 Video", description: "Text or image to video on FLUX.3 Video.", category: "video", order: 67, shape: "bfl", input: image() },
  { presetId: "grok-imagine-video", model: "xai/grok-imagine-video", name: "Grok Imagine Video", description: "Text or image to video on Grok Imagine.", category: "video", order: 68, shape: "generic", input: image() },
  { presetId: "grok-imagine-video-1-5", model: "xai/grok-imagine-video-1.5", name: "Grok Imagine Video 1.5", description: "Text or image to video on Grok Imagine 1.5.", category: "video", order: 69, shape: "generic", input: image() },
  { presetId: "grok-imagine-video-1-5-lite", model: "xai/grok-imagine-video-1.5-lite", name: "Grok Imagine Video 1.5 Lite", description: "Lighter text or image to video on Grok Imagine 1.5.", category: "video", order: 70, shape: "generic", input: image() },
  { presetId: "grok-imagine-video-1-5-preview", model: "xai/grok-imagine-video-1.5-preview", name: "Grok Imagine Video 1.5 Preview", description: "Text or image to video on Grok Imagine 1.5 Preview.", category: "video", order: 71, shape: "generic", input: image() },
  { presetId: "kling-avatar-i2v", model: "kling/videos-avatar-image2video", name: "Kling Avatar I2V", description: "Portrait image to talking video on Kling.", category: "video", order: 72, shape: "kling", input: image(true, "Portrait") },

  // ----- Video edit / upscale -----
  { presetId: "runway-aleph2", model: "runway/aleph2", name: "Runway Aleph 2", description: "Video editing on Runway Aleph 2.", category: "video", order: 80, shape: "runway", input: video() },
  { presetId: "wan-2-7-videoedit", model: "wan/wan2.7-videoedit", name: "Wan 2.7 Video Edit", description: "Edit a video on Wan 2.7.", category: "video", order: 81, shape: "generic", input: video() },
  { presetId: "happyhorse-1-0-video-edit", model: "wan/happyhorse-1.0-video-edit", name: "HappyHorse 1.0 Video Edit", description: "Edit a video on HappyHorse 1.0.", category: "video", order: 82, shape: "generic", input: video() },
  { presetId: "higgsfield-motion-transfer", model: "higgsfield/higgsfield-genjutsu-motion-transfer-v1.0", name: "Genjutsu Motion Transfer", description: "Transfer motion onto a video on Higgsfield.", category: "video", order: 83, shape: "generic", input: video() },
  { presetId: "kling-video-extend", model: "kling/videos-video-extend", name: "Kling Video Extend", description: "Extend a video on Kling.", category: "video", order: 84, shape: "generic", input: video() },
  { presetId: "bfl-video-edit", model: "bfl/video-edit-v1", name: "FLUX Video Edit", description: "Edit a video on FLUX.", category: "video", order: 85, shape: "bfl", input: video() },
  { presetId: "bfl-video-upscale", model: "bfl/video-upscale-v1", name: "FLUX Video Upscale", description: "Upscale a video on FLUX.", category: "video", order: 86, shape: "bfl", input: video() },
  { presetId: "fal-crystal-video-upscaler", model: "fal/crystal-video-upscaler", name: "Crystal Video Upscaler", description: "Upscale a video on Crystal via fal.", category: "video", order: 87, shape: "generic", input: video() },
  { presetId: "wavespeed-flashvsr", model: "wavespeed/flashvsr", name: "FlashVSR", description: "Restore and upscale a video on FlashVSR.", category: "video", order: 88, shape: "generic", input: video() },
  { presetId: "bria-video-erase", model: "bria/video-edit-erase", name: "Bria Video Erase", description: "Remove objects from a video on Bria.", category: "video", order: 89, shape: "generic", input: video() },
  { presetId: "bria-video-green-screen", model: "bria/video-edit-green-screen", name: "Bria Green Screen", description: "Green-screen key a video on Bria.", category: "video", order: 90, shape: "generic", input: video() },
  { presetId: "bria-video-remove-bg", model: "bria/video-edit-remove-background", name: "Bria Video Remove BG", description: "Remove a video background on Bria.", category: "video", order: 91, shape: "generic", input: video() },
  { presetId: "bria-video-replace-bg", model: "bria/video-edit-replace-background", name: "Bria Video Replace BG", description: "Replace a video background on Bria.", category: "video", order: 92, shape: "generic", input: video() },
  { presetId: "veed-bg-removal", model: "veed/video-background-removal", name: "VEED BG Removal", description: "Remove a video background on VEED.", category: "video", order: 93, shape: "generic", input: video() },
  { presetId: "veed-bg-removal-fast", model: "veed/video-background-removal-fast", name: "VEED BG Removal Fast", description: "Faster video background removal on VEED.", category: "video", order: 94, shape: "generic", input: video() },
  { presetId: "veed-green-screen", model: "veed/video-background-removal-green-screen", name: "VEED Green Screen", description: "Green-screen key a video on VEED.", category: "video", order: 95, shape: "generic", input: video() },
  { presetId: "veed-clean-audio-video", model: "veed/clean-audio-video", name: "VEED Clean Audio", description: "Clean a video's audio on VEED.", category: "video", order: 96, shape: "generic", input: video() },

  // ----- Image generation -----
  { presetId: "nano-banana-2-1", model: "vertexai/gemini-nano-banana-2.1", name: "Nano Banana 2.1", description: "Text or image to image on Nano Banana 2.1.", category: "image", order: 10, shape: "gemini-image", input: image() },
  { presetId: "gemini-3-pro-image", model: "vertexai/gemini-3-pro-image", name: "Gemini 3 Pro Image", description: "Text or image to image on Gemini 3 Pro Image.", category: "image", order: 11, shape: "gemini-image", input: image() },
  { presetId: "gemini-2-5-flash-image", model: "vertexai/gemini-2.5-flash-image", name: "Gemini 2.5 Flash Image", description: "Text or image to image on Gemini 2.5 Flash Image.", category: "image", order: 12, shape: "gemini-image", input: image() },
  { presetId: "gemini-3-1-flash-lite-image", model: "vertexai/gemini-3.1-flash-lite-image", name: "Gemini 3.1 Flash Lite Image", description: "Text or image to image on Gemini 3.1 Flash Lite.", category: "image", order: 13, shape: "gemini-image", input: image() },
  { presetId: "gpt-image-2", model: "openai/gpt-image-2", name: "GPT Image 2", description: "Text to image on GPT Image 2.", category: "image", order: 14, shape: "openai-image" },
  { presetId: "gpt-image-2-5-flare", model: "openai/gpt-image-2.5-flare", name: "GPT Image 2.5 Flare", description: "Text to image on GPT Image 2.5 Flare.", category: "image", order: 15, shape: "openai-image" },
  { presetId: "gpt-image-2-5-sunburst", model: "openai/gpt-image-2.5-sunburst", name: "GPT Image 2.5 Sunburst", description: "Text to image on GPT Image 2.5 Sunburst.", category: "image", order: 16, shape: "openai-image" },
  { presetId: "gpt-image-1-5", model: "openai/gpt-image-1.5", name: "GPT Image 1.5", description: "Text to image on GPT Image 1.5.", category: "image", order: 17, shape: "openai-image" },
  { presetId: "fal-gpt-image-2", model: "fal/fal-gpt-image-2", name: "GPT Image 2 (fal)", description: "Text to image on GPT Image 2 via fal.", category: "image", order: 18, shape: "generic" },
  { presetId: "fal-gpt-image-2-5-flare", model: "fal/fal-gpt-image-2.5-flare", name: "GPT Image 2.5 Flare (fal)", description: "Text to image on GPT Image 2.5 Flare via fal.", category: "image", order: 19, shape: "generic" },
  { presetId: "fal-gpt-image-2-5-sunburst", model: "fal/fal-gpt-image-2.5-sunburst", name: "GPT Image 2.5 Sunburst (fal)", description: "Text to image on GPT Image 2.5 Sunburst via fal.", category: "image", order: 20, shape: "generic" },
  { presetId: "runware-gpt-image-2", model: "runware/runware-gpt-image-2", name: "GPT Image 2 (Runware)", description: "Text to image on GPT Image 2 via Runware.", category: "image", order: 21, shape: "generic" },
  { presetId: "runware-gpt-image-2-5-flare", model: "runware/runware-gpt-image-2.5-flare", name: "GPT Image 2.5 Flare (Runware)", description: "Text to image on GPT Image 2.5 Flare via Runware.", category: "image", order: 22, shape: "generic" },
  { presetId: "runware-gpt-image-2-5-sunburst", model: "runware/runware-gpt-image-2.5-sunburst", name: "GPT Image 2.5 Sunburst (Runware)", description: "Text to image on GPT Image 2.5 Sunburst via Runware.", category: "image", order: 23, shape: "generic" },
  { presetId: "wavespeed-gpt-image-2", model: "wavespeed/wavespeed-gpt-image-2", name: "GPT Image 2 (Wavespeed)", description: "Text to image on GPT Image 2 via Wavespeed.", category: "image", order: 24, shape: "generic" },
  { presetId: "wavespeed-gpt-image-2-5-flare", model: "wavespeed/wavespeed-gpt-image-2.5-flare", name: "GPT Image 2.5 Flare (Wavespeed)", description: "Text to image on GPT Image 2.5 Flare via Wavespeed.", category: "image", order: 25, shape: "generic" },
  { presetId: "wavespeed-gpt-image-2-5-sunburst", model: "wavespeed/wavespeed-gpt-image-2.5-sunburst", name: "GPT Image 2.5 Sunburst (Wavespeed)", description: "Text to image on GPT Image 2.5 Sunburst via Wavespeed.", category: "image", order: 26, shape: "generic" },
  { presetId: "fal-nano-banana-2", model: "fal/fal-nano-banana-2", name: "Nano Banana 2 (fal)", description: "Text to image on Nano Banana 2 via fal.", category: "image", order: 27, shape: "generic" },
  { presetId: "fal-nano-banana-pro", model: "fal/fal-nano-banana-pro", name: "Nano Banana Pro (fal)", description: "Text to image on Nano Banana Pro via fal.", category: "image", order: 28, shape: "generic" },
  { presetId: "runware-nano-banana-2", model: "runware/runware-nano-banana-2", name: "Nano Banana 2 (Runware)", description: "Text to image on Nano Banana 2 via Runware.", category: "image", order: 29, shape: "generic" },
  { presetId: "runware-nano-banana-pro", model: "runware/runware-nano-banana-pro", name: "Nano Banana Pro (Runware)", description: "Text to image on Nano Banana Pro via Runware.", category: "image", order: 30, shape: "generic" },
  { presetId: "wavespeed-nano-banana-2", model: "wavespeed/wavespeed-nano-banana-2", name: "Nano Banana 2 (Wavespeed)", description: "Text to image on Nano Banana 2 via Wavespeed.", category: "image", order: 31, shape: "generic" },
  { presetId: "wavespeed-nano-banana-pro", model: "wavespeed/wavespeed-nano-banana-pro", name: "Nano Banana Pro (Wavespeed)", description: "Text to image on Nano Banana Pro via Wavespeed.", category: "image", order: 32, shape: "generic" },
  { presetId: "pika-gpt-image-2", model: "pika/pika-gpt-image-2", name: "GPT Image 2 (Pika)", description: "Text to image on GPT Image 2 via Pika.", category: "image", order: 33, shape: "generic" },
  { presetId: "pika-nano-banana-2", model: "pika/pika-nano-banana-2", name: "Nano Banana 2 (Pika)", description: "Text to image on Nano Banana 2 via Pika.", category: "image", order: 34, shape: "generic" },
  { presetId: "pika-nano-banana-pro", model: "pika/pika-nano-banana-pro", name: "Nano Banana Pro (Pika)", description: "Text to image on Nano Banana Pro via Pika.", category: "image", order: 35, shape: "generic" },
  { presetId: "flux-2-pro", model: "bfl/flux-2-pro", name: "FLUX.2 Pro", description: "Text to image on FLUX.2 Pro.", category: "image", order: 36, shape: "bfl" },
  { presetId: "flux-2-max", model: "bfl/flux-2-max", name: "FLUX.2 Max", description: "Text to image on FLUX.2 Max.", category: "image", order: 37, shape: "bfl" },
  { presetId: "flux-3-image", model: "bfl/flux-3-image", name: "FLUX.3 Image", description: "Text to image on FLUX.3 Image.", category: "image", order: 38, shape: "bfl" },
  { presetId: "fal-flux-3-max", model: "fal/flux-3-max", name: "FLUX.3 Max (fal)", description: "Text to image on FLUX.3 Max via fal.", category: "image", order: 39, shape: "generic" },
  { presetId: "flux-pro-1-1", model: "bfl/flux-pro-1.1", name: "FLUX Pro 1.1", description: "Text to image on FLUX Pro 1.1.", category: "image", order: 40, shape: "bfl" },
  { presetId: "flux-pro-1-1-ultra", model: "bfl/flux-pro-1.1-ultra", name: "FLUX Pro 1.1 Ultra", description: "Text to image on FLUX Pro 1.1 Ultra.", category: "image", order: 41, shape: "bfl" },
  { presetId: "seedream-5-0", model: "byteplus/seedream-5-0-260128", name: "Seedream 5.0", description: "Text to image on Seedream 5.0.", category: "image", order: 42, shape: "generic" },
  { presetId: "seedream-5-0-pro", model: "byteplus/seedream-5-0-pro-260628", name: "Seedream 5.0 Pro", description: "Text to image on Seedream 5.0 Pro.", category: "image", order: 43, shape: "generic" },
  { presetId: "seedream-5-0-flash", model: "byteplus/seedream-5-0-flash-260915", name: "Seedream 5.0 Flash", description: "Faster text to image on Seedream 5.0.", category: "image", order: 44, shape: "generic" },
  { presetId: "seedream-4-5", model: "byteplus/seedream-4-5-251128", name: "Seedream 4.5", description: "Text to image on Seedream 4.5.", category: "image", order: 45, shape: "generic" },
  { presetId: "seedream-4-0", model: "byteplus/seedream-4-0-250828", name: "Seedream 4.0", description: "Text to image on Seedream 4.0.", category: "image", order: 46, shape: "generic" },
  { presetId: "qwen-image-3-0", model: "qwen/qwen-image-3.0", name: "Qwen Image 3.0", description: "Text to image on Qwen Image 3.0.", category: "image", order: 47, shape: "generic" },
  { presetId: "qwen-image-3-0-pro", model: "qwen/qwen-image-3.0-pro", name: "Qwen Image 3.0 Pro", description: "Text to image on Qwen Image 3.0 Pro.", category: "image", order: 48, shape: "generic" },
  { presetId: "ideogram-4-5", model: "ideogram/ideogram-4-5", name: "Ideogram 4.5", description: "Text to image on Ideogram 4.5.", category: "image", order: 49, shape: "generic" },
  { presetId: "ideogram-v4", model: "ideogram/ideogram-v4", name: "Ideogram 4", description: "Text to image on Ideogram 4.", category: "image", order: 50, shape: "generic" },
  { presetId: "ideogram-v3", model: "ideogram/ideogram-v3", name: "Ideogram 3", description: "Text to image on Ideogram 3.", category: "image", order: 51, shape: "generic" },
  { presetId: "p-image-ideogram", model: "ideogram/p-image-ideogram", name: "P-Ideogram", description: "Text to image on P-Ideogram.", category: "image", order: 52, shape: "generic" },
  { presetId: "krea-3", model: "krea/krea-3", name: "Krea 3", description: "Text to image on Krea 3.", category: "image", order: 53, shape: "generic" },
  { presetId: "krea-2", model: "krea/krea-2", name: "Krea 2", description: "Text to image on Krea 2.", category: "image", order: 54, shape: "generic" },
  { presetId: "krea-2-large", model: "krea/krea-2-large", name: "Krea 2 Large", description: "Text to image on Krea 2 Large.", category: "image", order: 55, shape: "generic" },
  { presetId: "krea-2-medium", model: "krea/krea-2-medium", name: "Krea 2 Medium", description: "Text to image on Krea 2 Medium.", category: "image", order: 56, shape: "generic" },
  { presetId: "krea-2-medium-turbo", model: "krea/krea-2-medium-turbo", name: "Krea 2 Medium Turbo", description: "Text to image on Krea 2 Medium Turbo.", category: "image", order: 57, shape: "generic" },
  { presetId: "photon-1", model: "luma/photon-1", name: "Photon", description: "Text to image on Luma Photon.", category: "image", order: 58, shape: "generic" },
  { presetId: "photon-flash-1", model: "luma/photon-flash-1", name: "Photon Flash", description: "Faster text to image on Luma Photon.", category: "image", order: 59, shape: "generic" },
  { presetId: "luma-uni-1", model: "luma_2/uni-1", name: "Luma Uni-1", description: "Text or image to image on Luma Uni-1.", category: "image", order: 60, shape: "generic", input: image() },
  { presetId: "luma-uni-1-max", model: "luma_2/uni-1-max", name: "Luma Uni-1 Max", description: "Text or image to image on Luma Uni-1 Max.", category: "image", order: 61, shape: "generic", input: image() },
  { presetId: "recraft-v4-1-pro", model: "recraft/recraftv4_1_pro", name: "Recraft 4.1 Pro", description: "Text to image on Recraft 4.1 Pro.", category: "image", order: 62, shape: "generic" },
  { presetId: "recraft-v4-1", model: "recraft/recraftv4_1", name: "Recraft 4.1", description: "Text to image on Recraft 4.1.", category: "image", order: 63, shape: "generic" },
  { presetId: "recraft-v4-pro", model: "recraft/recraftv4_pro", name: "Recraft 4 Pro", description: "Text to image on Recraft 4 Pro.", category: "image", order: 64, shape: "generic" },
  { presetId: "recraft-v4", model: "recraft/recraftv4", name: "Recraft 4", description: "Text to image on Recraft 4.", category: "image", order: 65, shape: "generic" },
  { presetId: "recraft-v3", model: "recraft/recraftv3", name: "Recraft 3", description: "Text to image on Recraft 3.", category: "image", order: 66, shape: "generic" },
  { presetId: "recraft-v2", model: "recraft/recraftv2", name: "Recraft 2", description: "Text to image on Recraft 2.", category: "image", order: 67, shape: "generic" },
  { presetId: "recraft-v4-1-styles", model: "recraft/recraftv4_1_styles", name: "Recraft 4.1 Styles", description: "Styled text to image on Recraft 4.1.", category: "image", order: 68, shape: "generic" },
  { presetId: "recraft-v4-1-styles-pro", model: "recraft/recraftv4_1_styles_pro", name: "Recraft 4.1 Styles Pro", description: "Styled text to image on Recraft 4.1 Pro.", category: "image", order: 69, shape: "generic" },
  { presetId: "recraft-v4-1-utility", model: "recraft/recraftv4_1_utility", name: "Recraft 4.1 Utility", description: "Text to image on Recraft 4.1 Utility.", category: "image", order: 70, shape: "generic" },
  { presetId: "recraft-v4-1-utility-pro", model: "recraft/recraftv4_1_utility_pro", name: "Recraft 4.1 Utility Pro", description: "Text to image on Recraft 4.1 Utility Pro.", category: "image", order: 71, shape: "generic" },
  { presetId: "recraft-v4-styles", model: "recraft/recraftv4_styles", name: "Recraft 4 Styles", description: "Styled text to image on Recraft 4.", category: "image", order: 72, shape: "generic" },
  { presetId: "kling-image-o1", model: "kling/kling-image-o1", name: "Kling Image O1", description: "Text or image to image on Kling Image O1.", category: "image", order: 73, shape: "kling", input: image() },
  { presetId: "runway-gen4-image", model: "runway/gen4_image", name: "Runway Gen-4 Image", description: "Text or image to image on Runway Gen-4 Image.", category: "image", order: 74, shape: "runway", input: image() },
  { presetId: "wan-2-5-t2i", model: "wan/wan2.5-t2i-preview", name: "Wan 2.5 T2I", description: "Text to image on Wan 2.5.", category: "image", order: 75, shape: "generic" },
  { presetId: "grok-imagine-image", model: "xai/grok-imagine-image", name: "Grok Imagine Image", description: "Text to image on Grok Imagine.", category: "image", order: 76, shape: "generic" },
  { presetId: "grok-imagine-image-2-0", model: "xai/grok-imagine-image-2.0", name: "Grok Imagine Image 2.0", description: "Text to image on Grok Imagine Image 2.0.", category: "image", order: 77, shape: "generic" },
  { presetId: "grok-imagine-image-pro", model: "xai/grok-imagine-image-pro", name: "Grok Imagine Image Pro", description: "Text to image on Grok Imagine Image Pro.", category: "image", order: 78, shape: "generic" },
  { presetId: "grok-imagine-image-quality", model: "xai/grok-imagine-image-quality", name: "Grok Imagine Image Quality", description: "Text to image on Grok Imagine Image Quality.", category: "image", order: 79, shape: "generic" },
  { presetId: "bria-image", model: "bria/image", name: "Bria Image", description: "Text to image on Bria.", category: "image", order: 80, shape: "generic" },
  { presetId: "bria-fibo", model: "bria/fibo", name: "Bria FIBO", description: "Structured JSON-prompt image on Bria FIBO.", category: "image", order: 81, shape: "generic" },

  // ----- Image edit / upscale -----
  { presetId: "flux-kontext-pro", model: "bfl/flux-kontext-pro", name: "FLUX Kontext Pro", description: "Edit an image on FLUX Kontext Pro.", category: "image", order: 90, shape: "bfl", input: image(true) },
  { presetId: "flux-kontext-max", model: "bfl/flux-kontext-max", name: "FLUX Kontext Max", description: "Edit an image on FLUX Kontext Max.", category: "image", order: 91, shape: "bfl", input: image(true) },
  { presetId: "bfl-erase", model: "bfl/erase-v1", name: "FLUX Erase", description: "Erase objects from an image on FLUX.", category: "image", order: 92, shape: "bfl", input: image(true) },
  { presetId: "bfl-fill", model: "bfl/flux-pro-1.0-fill", name: "FLUX Fill", description: "Inpaint an image on FLUX Pro 1.0.", category: "image", order: 93, shape: "bfl", input: image(true) },
  { presetId: "bfl-expand", model: "bfl/flux-pro-1.0-expand", name: "FLUX Expand", description: "Outpaint an image on FLUX Pro 1.0.", category: "image", order: 94, shape: "bfl", input: image(true) },
  { presetId: "bfl-vto", model: "bfl/vto-v1", name: "FLUX Virtual Try-On", description: "Virtual try-on on FLUX.", category: "image", order: 95, shape: "bfl", input: image(true) },
  { presetId: "wan-2-5-i2i", model: "wan/wan2.5-i2i-preview", name: "Wan 2.5 I2I", description: "Edit an image on Wan 2.5.", category: "image", order: 96, shape: "generic", input: image(true) },
  { presetId: "bria-add-object", model: "bria/image-edit-add-object-by-text", name: "Bria Add Object", description: "Add an object to an image on Bria.", category: "image", order: 97, shape: "generic", input: image(true) },
  { presetId: "bria-erase", model: "bria/image-edit-erase", name: "Bria Erase", description: "Erase part of an image on Bria.", category: "image", order: 98, shape: "generic", input: image(true) },
  { presetId: "bria-erase-text", model: "bria/image-edit-erase-by-text", name: "Bria Erase by Text", description: "Erase a described object on Bria.", category: "image", order: 99, shape: "generic", input: image(true) },
  { presetId: "bria-erase-fg", model: "bria/image-edit-erase-foreground", name: "Bria Erase Foreground", description: "Remove the foreground on Bria.", category: "image", order: 100, shape: "generic", input: image(true) },
  { presetId: "bria-expand", model: "bria/image-edit-expand", name: "Bria Expand", description: "Outpaint an image on Bria.", category: "image", order: 101, shape: "generic", input: image(true) },
  { presetId: "bria-gen-fill", model: "bria/image-edit-gen-fill", name: "Bria Gen Fill", description: "Generative fill on Bria.", category: "image", order: 102, shape: "generic", input: image(true) },
  { presetId: "bria-relight", model: "bria/image-edit-relight", name: "Bria Relight", description: "Relight an image on Bria.", category: "image", order: 103, shape: "generic", input: image(true) },
  { presetId: "bria-remove-bg", model: "bria/image-edit-remove-background", name: "Bria Remove BG", description: "Remove an image background on Bria.", category: "image", order: 104, shape: "generic", input: image(true) },
  { presetId: "bria-remove-bg-guided", model: "bria/image-edit-remove-background-guided", name: "Bria Remove BG Guided", description: "Guided background removal on Bria.", category: "image", order: 105, shape: "generic", input: image(true) },
  { presetId: "bria-replace-bg", model: "bria/image-edit-replace-background", name: "Bria Replace BG", description: "Replace an image background on Bria.", category: "image", order: 106, shape: "generic", input: image(true) },
  { presetId: "bria-replace-object", model: "bria/image-edit-replace-object-by-text", name: "Bria Replace Object", description: "Replace a described object on Bria.", category: "image", order: 107, shape: "generic", input: image(true) },
  { presetId: "bria-reseason", model: "bria/image-edit-reseason", name: "Bria Reseason", description: "Change an image's season on Bria.", category: "image", order: 108, shape: "generic", input: image(true) },
  { presetId: "bria-restore", model: "bria/image-edit-restore", name: "Bria Restore", description: "Restore an image on Bria.", category: "image", order: 109, shape: "generic", input: image(true) },
  { presetId: "bria-product-holding", model: "bria/image-edit-product-holding", name: "Bria Product Holding", description: "Put a product in hand on Bria.", category: "image", order: 110, shape: "generic", input: image(true) },
  { presetId: "bria-virtual-tryon", model: "bria/image-edit-product-virtual-tryon", name: "Bria Virtual Try-On", description: "Virtual try-on on Bria.", category: "image", order: 111, shape: "generic", input: image(true) },
  { presetId: "bria-increase-resolution", model: "bria/image-edit-increase-resolution", name: "Bria Upscale", description: "Increase image resolution on Bria.", category: "image", order: 112, shape: "generic", input: image(true) },
  { presetId: "fal-crystal-upscaler", model: "fal/crystal-upscaler", name: "Crystal Upscaler", description: "Upscale an image on Crystal via fal.", category: "image", order: 113, shape: "generic", input: image(true) },
  { presetId: "wavespeed-seedvr2", model: "wavespeed/seedvr2", name: "SeedVR2", description: "Restore and upscale an image on SeedVR2.", category: "image", order: 114, shape: "generic", input: image(true) },
  { presetId: "wavespeed-image-upscaler", model: "wavespeed/ultimate-image-upscaler", name: "Ultimate Image Upscaler", description: "Upscale an image on Wavespeed.", category: "image", order: 115, shape: "generic", input: image(true) },
  { presetId: "freepik-image-upscaler", model: "freepik/ai-image-upscaler-precision-v2", name: "Freepik Image Upscaler", description: "Upscale an image on Freepik.", category: "image", order: 116, shape: "generic", input: image(true) },
  { presetId: "freepik-skin-creative", model: "freepik/ai-skin-enhancer-creative", name: "Freepik Skin Creative", description: "Enhance skin creatively on Freepik.", category: "image", order: 117, shape: "generic", input: image(true) },
  { presetId: "freepik-skin-faithful", model: "freepik/ai-skin-enhancer-faithful", name: "Freepik Skin Faithful", description: "Enhance skin faithfully on Freepik.", category: "image", order: 118, shape: "generic", input: image(true) },
  { presetId: "freepik-skin-flexible", model: "freepik/ai-skin-enhancer-flexible", name: "Freepik Skin Flexible", description: "Enhance skin flexibly on Freepik.", category: "image", order: 119, shape: "generic", input: image(true) },
  { presetId: "fal-patina", model: "fal/patina", name: "Patina", description: "Restore an image on Patina via fal.", category: "image", order: 120, shape: "generic", input: image(true) },
  { presetId: "beeble-switchx", model: "beeble/switchx", name: "SwitchX", description: "Relight an image on Beeble SwitchX.", category: "image", order: 121, shape: "generic", input: image(true) },
  { presetId: "heygen-starfish", model: "heygen/starfish", name: "HeyGen Starfish", description: "Avatar video on HeyGen Starfish.", category: "video", order: 97, shape: "generic", input: image(true, "Avatar image") },
];

const seen = new Set<string>();
for (const spec of ROUTER_MODELS) {
  if (seen.has(spec.presetId)) {
    throw new Error(`Duplicate router preset id "${spec.presetId}"`);
  }
  seen.add(spec.presetId);
}

/**
 * The models Phaino offers: those Router still serves whose required fields
 * the request fitting can fill. Upload slots a model's schema cannot take are
 * dropped.
 */
export const ROUTER_CATALOG: RouterModelSpec[] = ROUTER_MODELS.flatMap((spec) => {
  const support = specSupport(spec);
  if (!support.runs) return [];
  return [spec.input && !support.takesInput ? { ...spec, input: undefined } : spec];
});

export function routerSpecFor(presetId: string): RouterModelSpec | null {
  return ROUTER_CATALOG.find((s) => s.presetId === presetId) ?? null;
}
