/** Model families for Explore sections and the /workflows ?model= filter. */

export type PresetLike = {
  category: string;
  model: { id: string; label: string };
};

export type ModelFamily = {
  id: string;
  label: string;
  viewAll: string;
  /** media.model values that belong to this family in explore-media. */
  mediaModels: readonly string[];
};

export const MODEL_FAMILIES: readonly ModelFamily[] = [
  {
    id: "camera",
    label: "Camera moves",
    viewAll: "/camera",
    mediaModels: ["ltx-2.5"],
  },
  {
    id: "ltx-2.5",
    label: "LTX 2.5",
    viewAll: "/workflows?model=ltx-2.5",
    mediaModels: ["ltx-2.5"],
  },
  {
    id: "wan-2.2",
    label: "Wan 2.2",
    viewAll: "/workflows?model=wan-2.2",
    mediaModels: ["wan-2.2"],
  },
  {
    id: "flux2-klein",
    label: "FLUX.2 Klein",
    viewAll: "/workflows?model=flux2-klein",
    mediaModels: ["flux2-klein-4b", "flux2-klein-4b-distilled"],
  },
  {
    id: "qwen-image-2512",
    label: "Qwen Image",
    viewAll: "/workflows?model=qwen-image-2512",
    mediaModels: ["qwen-image-2512"],
  },
];

/** Does a preset belong to the family? FLUX.2 Klein Fast joins the Klein family. */
export function matchesFamily(preset: PresetLike, familyId: string): boolean {
  if (familyId === "camera") return preset.category === "camera";
  if (familyId === "flux2-klein") {
    return preset.model.id.startsWith("flux2-klein");
  }
  if (familyId === "ltx-2.5") {
    return preset.model.id === "ltx-2.5" && preset.category !== "camera";
  }
  return preset.model.id === familyId;
}
