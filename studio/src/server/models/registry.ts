/**
 * The model registry: what the user picks in the studio. Each mode is backed
 * by a hand-tuned preset folder or an official Comfy template synced by
 * `pnpm models:sync` into models/cache at the pinned workflow_templates ref.
 */

export const TEMPLATES_REF = "46e060ea88eb07adecf07197ec384c54a70e030c";

export type ModelMode = "t2i" | "edit" | "t2v" | "i2v" | "flf2v" | "swap";

export type ModeSource =
  | { preset: string }
  | {
      template: string;
      /** Overrides the synthetic preset id (default "<modelId>-<mode>"). */
      id?: string;
      /** Overrides the detected default prompt. */
      prompt?: string;
      /** Swap: source clips longer than this are trimmed to the first N seconds. */
      maxSeconds?: number;
    };

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
    modes: {
      t2i: { preset: "flux2-klein" },
      edit: { template: "image_flux2_klein_image_edit_4b_base" },
    },
  },
  {
    id: "flux2-klein-fast",
    label: "FLUX.2 Klein Fast",
    kind: "image",
    modes: {
      t2i: { preset: "flux2-klein-fast" },
      edit: { template: "image_flux2_klein_image_edit_4b_distilled" },
    },
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
  {
    id: "z-image",
    label: "Z-Image",
    kind: "image",
    modes: { t2i: { template: "image_z_image" } },
  },
  {
    id: "qwen-image-21-turbo",
    label: "Qwen Image 2.1 Turbo",
    kind: "image",
    modes: {
      t2i: { template: "image_qwen_image_2_1_turbo_t2i" },
      edit: { template: "image_qwen_image_2_1_turbo_image_edit" },
    },
  },
  {
    id: "qwen-image-2512",
    label: "Qwen Image 2512",
    kind: "image",
    modes: { t2i: { template: "image_qwen_Image_2512" } },
  },
  {
    id: "qwen-image-2512-turbo",
    label: "Qwen Image 2512 Turbo",
    kind: "image",
    modes: { t2i: { template: "image_qwen_image_2512_with_2steps_lora" } },
  },
  {
    id: "qwen-image-edit-2511",
    label: "Qwen Image Edit 2511",
    kind: "image",
    modes: { edit: { template: "image_qwen_image_edit_2511_int8" } },
  },
  {
    id: "krea2-turbo",
    label: "Krea 2 Turbo",
    kind: "image",
    modes: { t2i: { template: "image_krea2_turbo_t2i" } },
  },
  {
    id: "moss-image",
    label: "MOSS-Image",
    kind: "image",
    modes: { t2i: { template: "image_moss_image_t2i" } },
  },
  {
    id: "flux2-dev",
    label: "FLUX.2 Dev",
    kind: "image",
    modes: { t2i: { template: "image_flux2_text_to_image" } },
  },
  {
    id: "flux2-klein-9b",
    label: "FLUX.2 Klein 9B",
    kind: "image",
    modes: {
      t2i: { template: "image_flux2_text_to_image_9b" },
      edit: { template: "image_flux2_klein_image_edit_9b_base" },
    },
  },
  {
    id: "flux1-dev",
    label: "FLUX.1 Dev",
    kind: "image",
    modes: { t2i: { template: "flux_dev_full_text_to_image" } },
  },
  {
    id: "flux1-schnell",
    label: "FLUX.1 Schnell",
    kind: "image",
    modes: { t2i: { template: "flux_schnell_full_text_to_image" } },
  },
  {
    id: "flux1-krea-dev",
    label: "FLUX.1 Krea Dev",
    kind: "image",
    modes: { t2i: { template: "flux1_krea_dev" } },
  },
  {
    id: "flux1-kontext-dev",
    label: "FLUX.1 Kontext Dev",
    kind: "image",
    modes: { edit: { template: "flux_kontext_dev_basic" } },
  },
  {
    id: "chroma",
    label: "Chroma",
    kind: "image",
    modes: { t2i: { template: "image_chroma_text_to_image" } },
  },
  {
    id: "chroma1-radiance",
    label: "Chroma1 Radiance",
    kind: "image",
    modes: { t2i: { template: "image_chroma1_radiance_text_to_image" } },
  },
  {
    id: "hidream-i1-dev",
    label: "HiDream I1 Dev",
    kind: "image",
    modes: { t2i: { template: "hidream_i1_dev" } },
  },
  {
    id: "hidream-i1-full",
    label: "HiDream I1 Full",
    kind: "image",
    modes: { t2i: { template: "hidream_i1_full" } },
  },
  {
    id: "hidream-o1",
    label: "HiDream O1",
    kind: "image",
    modes: { t2i: { template: "image_hidream_o1" } },
  },
  {
    id: "hidream-e1",
    label: "HiDream E1.1",
    kind: "image",
    modes: { edit: { template: "hidream_e1_1" } },
  },
  {
    id: "sdxl",
    label: "SDXL",
    kind: "image",
    modes: { t2i: { template: "image_sdxl_simple" } },
  },
  {
    id: "sd35",
    label: "SD 3.5",
    kind: "image",
    modes: { t2i: { template: "sd3.5_simple_example" } },
  },
  {
    id: "anima",
    label: "Anima",
    kind: "image",
    modes: { t2i: { template: "image_anima_base_v1" } },
  },
  {
    id: "netayume-lumina",
    label: "NetaYume Lumina",
    kind: "image",
    modes: { t2i: { template: "image_netayume_lumina_t2i" } },
  },
  {
    id: "newbie-image",
    label: "NewBie Image",
    kind: "image",
    modes: { t2i: { template: "image_newbieimage_exp0_1-t2i" } },
  },
  {
    id: "mage-flow",
    label: "Mage-Flow",
    kind: "image",
    modes: {
      t2i: { template: "image_mage_flow_t2i_int8" },
      edit: { template: "image_mage_flow_edit_int8" },
    },
  },
  {
    id: "mage-flow-turbo",
    label: "Mage-Flow Turbo",
    kind: "image",
    modes: {
      t2i: { template: "image_mage_flow_turbo_t2i_int8" },
      edit: { template: "image_mage_flow_edit_turbo_int8" },
    },
  },
  {
    id: "ideogram4",
    label: "Ideogram 4",
    kind: "image",
    modes: { t2i: { template: "image_ideogram4_t2i" } },
  },
  {
    id: "firered-edit",
    label: "FireRed Image Edit 1.1",
    kind: "image",
    modes: { edit: { template: "image_firered_image_edit1_1" } },
  },
  {
    id: "boogu",
    label: "Boogu",
    kind: "image",
    modes: {
      t2i: { template: "image_boogu_image_0_1_turbo_t2i" },
      edit: { template: "image_boogu_image_0_1_edit" },
    },
  },
  {
    id: "bernini-r",
    label: "Bernini-R",
    kind: "image",
    modes: { edit: { template: "video_bernini_r_image_editing" } },
  },
  {
    id: "chronoedit",
    label: "ChronoEdit",
    kind: "image",
    modes: { edit: { template: "image_chrono_edit_14B" } },
  },
  {
    id: "lens",
    label: "Lens",
    kind: "image",
    modes: { t2i: { template: "image_lens_t2i" } },
  },
  {
    id: "lens-turbo",
    label: "Lens Turbo",
    kind: "image",
    modes: { t2i: { template: "image_lens_turbo_t2i" } },
  },
  {
    id: "longcat-image",
    label: "LongCat Image",
    kind: "image",
    modes: {
      t2i: { template: "image_longcat_text_to_image" },
      edit: { template: "image_longcat_image_edit" },
    },
  },
  {
    id: "kandinsky5-image",
    label: "Kandinsky 5 Image",
    kind: "image",
    modes: { t2i: { template: "image_kandinsky5_t2i" } },
  },
  {
    id: "omnigen2",
    label: "OmniGen2",
    kind: "image",
    modes: {
      t2i: { template: "image_omnigen2_t2i" },
      edit: { template: "image_omnigen2_image_edit" },
    },
  },
  {
    id: "capybara-image",
    label: "Capybara Image",
    kind: "image",
    modes: {
      t2i: { template: "Image_capybara_v0_1_text_to_image" },
      edit: { template: "Image_capybara_v0_1_image_edit" },
    },
  },
  {
    id: "ernie-image",
    label: "ERNIE Image",
    kind: "image",
    modes: { t2i: { template: "image_ernie_image" } },
  },
  {
    id: "ernie-image-turbo",
    label: "ERNIE Image Turbo",
    kind: "image",
    modes: { t2i: { template: "image_ernie_image_turbo" } },
  },
  {
    id: "pixeldit",
    label: "PixelDiT",
    kind: "image",
    modes: { t2i: { template: "image_pixeldit_t2i" } },
  },
  {
    id: "ovis-image",
    label: "Ovis-Image",
    kind: "image",
    modes: { t2i: { template: "image_ovis_text_to_image" } },
  },
  {
    id: "ming-image",
    label: "Ming Image",
    kind: "image",
    modes: {
      t2i: { template: "image_ming_image_01_design_t2i" },
      edit: { template: "image_ming_image_01_design_image_edit" },
    },
  },
  {
    id: "joyai-edit",
    label: "JoyAI Image Edit",
    kind: "image",
    modes: { edit: { template: "image_joyai_image_edit" } },
  },
  {
    id: "ltx23",
    label: "LTX 2.3",
    kind: "video",
    modes: {
      t2v: { template: "video_ltx2_3_t2v" },
      i2v: { template: "video_ltx2_3_i2v" },
      flf2v: { template: "video_ltx2_3_flf2v" },
    },
  },
  {
    id: "ltx2",
    label: "LTX 2",
    kind: "video",
    modes: {
      t2v: { template: "video_ltx2_t2v" },
      i2v: { template: "video_ltx2_i2v" },
    },
  },
  {
    id: "ltx2-distilled",
    label: "LTX 2 Fast",
    kind: "video",
    modes: {
      t2v: { template: "video_ltx2_t2v_distilled" },
      i2v: { template: "video_ltx2_i2v_distilled" },
    },
  },
  {
    id: "ltxv",
    label: "LTXV 0.9.5",
    kind: "video",
    modes: {
      t2v: { template: "ltxv_text_to_video" },
      i2v: { template: "ltxv_image_to_video" },
    },
  },
  {
    id: "wan22-5b",
    label: "Wan 2.2 5B",
    kind: "video",
    modes: { t2v: { template: "video_wan2_2_5B_ti2v" } },
  },
  {
    id: "wan21",
    label: "Wan 2.1",
    kind: "video",
    modes: {
      t2v: { template: "text_to_video_wan" },
      i2v: { template: "image_to_video_wan" },
      flf2v: { template: "wan2.1_flf2v_720_f16" },
    },
  },
  {
    id: "wan21-vace",
    label: "Wan 2.1 VACE",
    kind: "video",
    modes: {
      t2v: { template: "video_wan_vace_14B_t2v" },
      flf2v: { template: "video_wan_vace_flf2v" },
    },
  },
  {
    id: "wan21-alpha",
    label: "Wan 2.1 Alpha",
    kind: "video",
    modes: { t2v: { template: "video_wan2.1_alpha_t2v_14B" } },
  },
  {
    id: "scail2",
    label: "SCAIL-2",
    kind: "video",
    modes: {
      swap: {
        template: "video_wan21_scail2_character_replacement",
        id: "kawarimi",
        prompt: "Replace the person with the character from the reference image",
        maxSeconds: 5,
      },
    },
  },
  {
    id: "wan22-animate",
    label: "Wan 2.2 Animate",
    kind: "video",
    modes: {
      swap: {
        template: "video_wan2_2_14B_animate",
        id: "kawarimi-animate",
        prompt: "Replace the person with the character from the reference image",
        maxSeconds: 5,
      },
    },
  },
  {
    id: "fasth3",
    label: "FastH3",
    kind: "video",
    modes: {
      t2v: { template: "video_fastvideo_fasth3_t2v" },
      i2v: { template: "video_fastvideo_fasth3_i2v" },
    },
  },
  {
    id: "hunyuan-video",
    label: "HunyuanVideo",
    kind: "video",
    modes: { t2v: { template: "hunyuan_video_text_to_video" } },
  },
  {
    id: "capybara",
    label: "Capybara",
    kind: "video",
    modes: { i2v: { template: "video_capybara_v0_1_image_to_video" } },
  },
  {
    id: "causal-forcing",
    label: "Causal Forcing",
    kind: "video",
    modes: { i2v: { template: "video_causal_forcing_i2v" } },
  },
  {
    id: "humo",
    label: "HuMo",
    kind: "video",
    modes: { t2v: { template: "video_humo" } },
  },
] satisfies ModelEntry[];

export const MODE_LABELS: Record<ModelMode, string> = {
  t2i: "Text to image",
  edit: "Edit",
  t2v: "Text to video",
  i2v: "Image to video",
  flf2v: "First and last frame",
  swap: "Character swap",
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
  if ("preset" in src) return src.preset;
  return "id" in src && src.id ? src.id : `${model.id}-${mode}`;
}

/** Find the model/mode a synthetic preset id belongs to. */
export function modeForPresetId(
  id: string,
): { model: ModelEntry; mode: ModelMode } | null {
  for (const model of MODEL_REGISTRY) {
    for (const mode of Object.keys(model.modes) as ModelMode[]) {
      const src = model.modes[mode];
      if (src && "template" in src && modePresetId(model, mode) === id) {
        return { model, mode };
      }
    }
  }
  return null;
}
