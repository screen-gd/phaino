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
  { id: "edit", label: "Edit", viewAll: "/edit" },
  ...MODEL_REGISTRY.map((m) => ({
    id: m.id,
    label: m.label,
    viewAll: `/workflows?model=${m.id}`,
  })),
];

/**
 * Picker group for a registry model id ("flux2-dev" -> "FLUX").
 * Order matters: featured families first, then the rest. The group order in
 * the picker follows this list, not the alphabet.
 */
const FAMILY_PREFIXES: readonly (readonly [string, string])[] = [
  ["ltx", "LTX"],
  ["wan", "Wan"],
  ["minimax", "MiniMax"],
  ["fasth3", "MiniMax"],
  ["flux", "FLUX"],
  ["qwen", "Qwen"],
  ["hunyuan", "Hunyuan"],
  ["kandinsky", "Kandinsky"],
  ["z-image", "Z-Image"],
  ["hidream", "HiDream"],
  ["ernie", "ERNIE"],
  ["mage", "Mage"],
  ["lens", "Lens"],
  ["capybara", "Capybara"],
  ["sd", "SD"],
  ["krea", "Krea"],
  ["longcat", "LongCat"],
  ["ming", "Ming"],
  ["joyai", "JoyAI"],
  ["firered", "FireRed"],
  ["chronoedit", "ChronoEdit"],
  ["bernini", "Bernini"],
  ["ideogram", "Ideogram"],
  ["boogu", "Boogu"],
  ["anima", "Anima"],
  ["netayume", "NetaYume"],
  ["newbie", "NewBie"],
  ["pixeldit", "PixelDiT"],
  ["ovis", "Ovis"],
  ["omnigen", "OmniGen"],
  ["moss", "MOSS"],
  ["chroma", "Chroma"],
  ["causal", "Causal Forcing"],
  ["humo", "HuMo"],
];

const GROUP_ORDER: readonly string[] = [
  ...new Set(FAMILY_PREFIXES.map(([, family]) => family)),
];

export function modelFamily(modelId: string): string {
  for (const [prefix, family] of FAMILY_PREFIXES) {
    if (modelId.startsWith(prefix)) return family;
  }
  return "Other";
}

// Brand words that need their second word to read as a family.
const PARTNER_BRANDS: Record<string, string> = {
  GPT: "GPT Image",
  Nano: "Nano Banana",
};

/**
 * Picker group for a partner model by its display name: the brand word
 * ("Kling 3.0 Turbo (fal)" -> "Kling"), folded into a registry family when
 * one matches ("FLUX.2 Pro" -> "FLUX").
 */
export function partnerFamily(name: string): string {
  const brand = name.split(/\s/)[0].replace(/[.\d]+$/, "");
  const known = modelFamily(brand.toLowerCase());
  return known !== "Other" ? known : (PARTNER_BRANDS[brand] ?? brand);
}

/**
 * Order grouped picker rows: families in FAMILY_PREFIXES order ("Other" with
 * the rest), registry order inside a family, and single-model families folded
 * into a trailing "More" group so one-row headers don't pile up.
 */
export function groupPickerRows<T extends { group?: string }>(
  items: readonly T[],
): T[] {
  const byFamily = new Map<string, T[]>();
  for (const item of items) {
    const g = item.group ?? "Other";
    const rows = byFamily.get(g) ?? [];
    rows.push(item);
    byFamily.set(g, rows);
  }
  const rank = (name: string) => {
    const i = GROUP_ORDER.indexOf(name);
    return i >= 0 ? i : GROUP_ORDER.length;
  };
  const ordered = [...byFamily.entries()].sort(
    (a, b) => rank(a[0]) - rank(b[0]),
  );
  const out: T[] = [];
  const more: T[] = [];
  for (const [, rows] of ordered) {
    if (rows.length > 1) out.push(...rows);
    else more.push({ ...rows[0], group: "More" });
  }
  return [...out, ...more];
}

/** Does a preset belong to the family? Registry ids match aliases too. */
export function matchesFamily(preset: PresetLike, familyId: string): boolean {
  if (familyId === "camera") return preset.category === "camera";
  if (familyId === "edit") return preset.category === "edit";
  if (preset.category === "camera" || preset.category === "edit") return false;
  return (
    preset.model.id === familyId ||
    (MODEL_ALIASES[familyId] ?? []).includes(preset.model.id)
  );
}
