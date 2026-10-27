import type { StudioPreset } from "@/components/toolStudioData";
import { mainPromptKey } from "@/components/studio/studioUtils";

export type VideoEffect = {
  id: string;
  name: string;
  description: string;
  presetId: string;
  prompt: string;
  choices: Record<string, string | number | boolean>;
};

// Reference-driven templates are deliberately excluded from this video-only flow.
export const VIDEO_EFFECTS: VideoEffect[] = [
  {
    id: "portrait-frame",
    name: "Portrait frame",
    description: "Extend the scene to a vertical frame",
    presetId: "edit-reframe",
    prompt: "Extend the existing scene naturally into a portrait frame. Match the original lighting, textures and motion. Preserve the subject and composition.",
    choices: { aspect: "9:16" },
  },
  {
    id: "square-frame",
    name: "Square frame",
    description: "Extend the scene to a square frame",
    presetId: "edit-reframe",
    prompt: "Extend the existing scene naturally into a square frame. Match the original lighting, textures and motion. Preserve the subject and composition.",
    choices: { aspect: "1:1" },
  },
  {
    id: "wide-frame",
    name: "Wide frame",
    description: "Extend the scene to a widescreen frame",
    presetId: "edit-reframe",
    prompt: "Extend the existing scene naturally into a widescreen frame. Match the original lighting, textures and motion. Preserve the subject and composition.",
    choices: { aspect: "16:9" },
  },
  {
    id: "upscale",
    name: "Upscale",
    description: "Restore detail at a higher resolution",
    presetId: "edit-upscale",
    prompt: "",
    choices: {},
  },
  {
    id: "quick-upscale",
    name: "Quick upscale",
    description: "A fast 4x resolution boost",
    presetId: "edit-upscale-fast",
    prompt: "",
    choices: {},
  },
  {
    id: "smooth-motion",
    name: "Smooth motion",
    description: "Interpolate frames at 2x the frame rate",
    presetId: "edit-fps-boost",
    prompt: "",
    choices: { multiplier: 2 },
  },
  {
    id: "extra-smooth-motion",
    name: "Extra smooth motion",
    description: "Interpolate frames at 4x the frame rate",
    presetId: "edit-fps-boost",
    prompt: "",
    choices: { multiplier: 4 },
  },
  {
    id: "depth-map",
    name: "Depth map",
    description: "Extract a depth pass from your video",
    presetId: "edit-depth",
    prompt: "",
    choices: {},
  },
];

/** Only expose effects the resolved template can run with a video alone. */
export function availableEffects(presets: StudioPreset[]): VideoEffect[] {
  return VIDEO_EFFECTS.filter((effect) => {
    const preset = presets.find((p) => p.id === effect.presetId);
    return preset &&
      preset.inputs.some((input) => input.key === "video" && input.type === "video") &&
      preset.inputs.every((input) => !input.required || input.key === "video") &&
      (!effect.prompt || !!mainPromptKey(preset.params)) &&
      Object.entries(effect.choices).every(([key, value]) =>
        preset.params.some((param) => param.key === key && param.type === "choice" &&
          param.options.some((option) => option.value === value)),
      );
  });
}

/** Keep the real preset id and inputs so the edit runner owns clip preparation. */
export function effectPreset(
  preset: StudioPreset,
  effect: VideoEffect,
  extraPrompt: string,
): StudioPreset {
  const promptKey = mainPromptKey(preset.params);
  return {
    ...preset,
    params: preset.params.map((param) => {
      if (param.type === "text" && param.key === promptKey) {
        return { ...param, default: [effect.prompt.trim(), extraPrompt.trim()].filter(Boolean).join("\n\n") };
      }
      const choice = effect.choices[param.key];
      if (param.type === "choice" && choice !== undefined &&
          param.options.some((option) => option.value === choice)) {
        return { ...param, default: choice };
      }
      return param;
    }),
  };
}
