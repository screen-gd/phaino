/** Model families for the /workflows ?model= filter, driven by the registry. */
import { MODEL_REGISTRY } from "@/server/models/registry";

export type PresetLike = {
  category: string;
  model: { id: string; label: string };
};

export type ModelFamily = {
  id: string;
  label: string;
  viewAll: string;
};

/**
 * Folder presets keep their own model.id ("wan-2.2"); template-backed modes
 * use the registry id ("wan22"). Aliases map the registry id to both.
 */
export const MODEL_ALIASES: Record<string, readonly string[]> = {
  "ltx25": ["ltx-2.5"],
  "wan22": ["wan-2.2"],
  "hunyuan15": ["hunyuan-video-1.5"],
  "minimax-h3": ["minimax-h3-model"],
  "kandinsky5": ["kandinsky-5"],
  "flux3-klein": ["flux-3-klein"],
  "flux3-klein-fast": ["flux-3-klein-fast"],
  "flux2-klein": ["flux2-klein-4b"],
  "flux2-klein-fast": ["flux2-klein-4b-distilled"],
  "qwen-image": ["qwen-image-2512"],
  "qwen-image-21": ["qwen-image-2.1"],
  "z-image-turbo": ["z-image-turbo-model"],
  "hidream-i1-fast": ["hidream-i1"],
};

export const MODEL_FAMILIES: readonly ModelFamily[] = [
  { id: "camera", label: "Camera moves", viewAll: "/camera" },
  ...MODEL_REGISTRY.map((m) => ({
    id: m.id,
    label: m.label,
    viewAll: `/workflows?model=${m.id}`,
  })),
];

/** Does a preset belong to the family? Registry ids match aliases too. */
export function matchesFamily(preset: PresetLike, familyId: string): boolean {
  if (familyId === "camera") return preset.category === "camera";
  if (preset.category === "camera") return false;
  return (
    preset.model.id === familyId ||
    (MODEL_ALIASES[familyId] ?? []).includes(preset.model.id)
  );
}
