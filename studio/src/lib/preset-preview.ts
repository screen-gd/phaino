import type { Preset } from "@/server/presets/schema";

const COMFY_IMAGE_PREVIEWS: Record<string, string> = {
  "flux2-klein": "/explore/models/flux2-klein.webp",
  "flux2-klein-fast": "/explore/models/flux2-klein-fast.webp",
  "qwen-image": "/explore/models/qwen-image.webp",
};

/** Official Comfy model examples for image previews; preset thumbnails elsewhere. */
export function presetPreview(preset: Pick<Preset, "id" | "category">) {
  return (preset.category === "image" ? COMFY_IMAGE_PREVIEWS[preset.id] : undefined)
    ?? `/api/presets/${preset.id}/thumb`;
}
