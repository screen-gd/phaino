/**
 * The model registry: what the user picks in the studio. Each mode is backed
 * by a hand-tuned preset folder or an official Comfy template synced by
 * `pnpm models:sync` into models/cache at the pinned workflow_templates ref.
 */

export const TEMPLATES_REF = "46e060ea88eb07adecf07197ec384c54a70e030c";

export type ModelMode = "t2i" | "edit" | "t2v" | "i2v" | "flf2v";

export type ModeSource = { preset: string } | { template: string };

export type ModelEntry = {
  id: string;
  label: string;
  kind: "image" | "video";
  modes: Partial<Record<ModelMode, ModeSource>>;
};

export const MODEL_REGISTRY = [
  {
    id: "ltx25",
    label: "LTX 2.5",
    kind: "video",
    modes: {
      i2v: { preset: "ltx25-i2v" },
      t2v: { template: "video_ltx2_5_t2v" },
      flf2v: { template: "video_ltx2_5_flf2v" },
    },
  },
  {
    id: "wan22",
    label: "Wan 2.2",
    kind: "video",
    modes: {
      i2v: { preset: "wan22-i2v" },
      t2v: { template: "video_wan2_2_14B_t2v" },
      flf2v: { template: "video_wan2_2_14B_flf2v" },
    },
  },
  {
    id: "hunyuan15",
    label: "HunyuanVideo 1.5",
    kind: "video",
    modes: {
      t2v: { template: "video_hunyuan_video_1.5_720p_t2v" },
      i2v: { template: "video_hunyuan_video_1.5_720p_i2v" },
    },
  },
  {
    id: "minimax-h3",
    label: "MiniMax H3",
    kind: "video",
    modes: {
      t2v: { template: "video_minimax_h3_t2v" },
      i2v: { template: "video_minimax_h3_i2v" },
    },
  },
  {
    id: "kandinsky5",
    label: "Kandinsky 5",
    kind: "video",
    modes: {
      t2v: { template: "video_kandinsky5_t2v" },
      i2v: { template: "video_kandinsky5_i2v" },
    },
  },
  {
    id: "flux3-klein",
    label: "FLUX 3 Klein",
    kind: "image",
    modes: {
      t2i: { template: "image_flux3_klein_t2i" },
      edit: { template: "image_flux3_klein_image_edit" },
    },
  },
  {
    id: "flux3-klein-fast",
    label: "FLUX 3 Klein Fast",
    kind: "image",
    modes: {
      t2i: { template: "image_flux3_klein_distilled_t2i" },
      edit: { template: "image_flux3_klein_distilled_image_edit" },
    },
  },
  {
    id: "flux2-klein",
    label: "FLUX.2 Klein",
    kind: "image",
    modes: { t2i: { preset: "flux2-klein" } },
  },
  {
    id: "flux2-klein-fast",
    label: "FLUX.2 Klein Fast",
    kind: "image",
    modes: { t2i: { preset: "flux2-klein-fast" } },
  },
  {
    id: "qwen-image",
    label: "Qwen Image",
    kind: "image",
    modes: {
      t2i: { preset: "qwen-image" },
      edit: { template: "image_qwen_image_edit_2509" },
    },
  },
  {
    id: "qwen-image-21",
    label: "Qwen Image 2.1",
    kind: "image",
    modes: {
      t2i: { template: "image_qwen_image_2_1_t2i" },
      edit: { template: "image_qwen_image_2_1_image_edit" },
    },
  },
  {
    id: "z-image-turbo",
    label: "Z-Image Turbo",
    kind: "image",
    modes: { t2i: { template: "image_z_image_turbo" } },
  },
  {
    id: "hidream-i1-fast",
    label: "HiDream I1 Fast",
    kind: "image",
    modes: { t2i: { template: "hidream_i1_fast" } },
  },
] satisfies ModelEntry[];

export const MODE_LABELS: Record<ModelMode, string> = {
  t2i: "Text to image",
  edit: "Edit",
  t2v: "Text to video",
  i2v: "Image to video",
  flf2v: "First and last frame",
};

export function modelById(id: string): ModelEntry | null {
  return MODEL_REGISTRY.find((m) => m.id === id) ?? null;
}

/** Which mode a (model, mode) pair's source resolves to. */
export function modeSource(
  model: ModelEntry,
  mode: ModelMode,
): ModeSource | null {
  return model.modes[mode] ?? null;
}

/**
 * The preset id for a mode: the folder preset's id for preset-backed modes,
 * or "<modelId>-<mode>" for template-backed modes. Always a valid slug.
 */
export function modePresetId(model: ModelEntry, mode: ModelMode): string {
  const src = model.modes[mode];
  if (!src) return `${model.id}-${mode}`;
  return "preset" in src ? src.preset : `${model.id}-${mode}`;
}

/** Find the model/mode a synthetic preset id belongs to. */
export function modeForPresetId(
  id: string,
): { model: ModelEntry; mode: ModelMode } | null {
  for (const model of MODEL_REGISTRY) {
    for (const mode of Object.keys(model.modes) as ModelMode[]) {
      const src = model.modes[mode];
      if (src && "template" in src && `${model.id}-${mode}` === id) {
        return { model, mode };
      }
    }
  }
  return null;
}
