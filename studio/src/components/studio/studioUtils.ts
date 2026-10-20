import type { StudioParam, StudioPreset } from "@/components/toolStudioData";

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
