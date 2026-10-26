import type { StudioParam, StudioPreset } from "@/components/toolStudioData";
import { modelFamily } from "@/lib/model-families";

/** Case-insensitive match on name, model label and description. */
export function filterPresets<
  T extends { name: string; description: string; model?: { label?: string } },
>(presets: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return presets;
  return presets.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.model?.label ?? "").toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q),
  );
}

/** Job progress (0..1) as a whole-percent clamped to 0..100. */
export function progressPct(progress: number): number {
  return Math.round(Math.min(1, Math.max(0, progress)) * 100);
}

/**
 * The preset's main prompt param: the first text param whose key mentions
 * "prompt" but not "negative". undefined when there is none.
 */
export function mainPromptKey(
  params: readonly StudioParam[],
): string | undefined {
  return params.find(
    (p) =>
      p.type === "text" &&
      p.key.toLowerCase().includes("prompt") &&
      !p.key.toLowerCase().includes("negative"),
  )?.key;
}

/**
 * "now" / "Nm ago" / "Nh ago" / "Nd ago" for a timestamp given as an ISO
 * string, a millisecond epoch or a seconds epoch. "" for unparsable input.
 */
export function relativeTime(value: string | number): string {
  const ms =
    typeof value === "number"
      ? // Epochs: >= 1e12 is milliseconds, below is seconds.
        value >= 1e12
        ? value
        : value * 1000
      : new Date(value).getTime();
  if (!Number.isFinite(ms)) return "";
  const seconds = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Empty-stage pile: one thumb per model family first, then fill with
 * presets whose model isn't a "-fast" twin and isn't already shown.
 * Keeps visually identical fast-variant thumbs out of the pile.
 */
export function stackThumbs(
  presets: readonly Pick<StudioPreset, "id" | "thumbUrl" | "model">[],
  max = 5,
): string[] {
  const out: string[] = [];
  const seenFamilies = new Set<string>();
  const seenIds = new Set<string>();
  for (const p of presets) {
    if (out.length >= max) return out;
    const key = p.model?.id ? modelFamily(p.model.id) : `url:${p.thumbUrl}`;
    if (seenFamilies.has(key)) continue;
    seenFamilies.add(key);
    seenIds.add(p.id);
    out.push(p.thumbUrl);
  }
  for (const p of presets) {
    if (out.length >= max) break;
    if (seenIds.has(p.id) || p.model?.id.endsWith("-fast")) continue;
    seenIds.add(p.id);
    out.push(p.thumbUrl);
  }
  return out;
}

export type ParamKind = "duration" | "aspect" | "resolution" | "seed" | "other";

/** Bucket a param for its chip icon and popover. */
export function paramKind(param: StudioParam): ParamKind {
  if (param.type === "seed") return "seed";
  const s = `${param.key} ${param.label}`;
  if (/duration|length|seconds/i.test(s)) return "duration";
  if (/aspect|ratio|size/i.test(s)) return "aspect";
  if (/resolution|quality/i.test(s)) return "resolution";
  return "other";
}

/** Chip-facing value text: "5s" for durations, option labels for choices. */
export function formatParamValue(
  param: StudioParam,
  value: unknown,
): string {
  const v = value ?? (param.type === "seed" ? "random" : param.default);
  if (param.type === "seed") {
    return v === "random" ? "Random" : String(v);
  }
  if (param.type === "choice") {
    const opt = param.options.find((o) => o.value === v);
    return opt?.label ?? String(v);
  }
  if (paramKind(param) === "duration" && typeof v === "number") {
    return `${v}s`;
  }
  return String(v);
}
