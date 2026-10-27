// Comfy Cloud bills open workflows by active GPU time at 0.266 credits/s,
// and $1 = 211 credits.
// https://support.comfy.org/articles/5846341390-how-credits-work-in-comfy
export const GPU_CREDITS_PER_SECOND = 0.266;

export type RuntimeStats =
  | { kind: "gpu"; count: number; medianSeconds: number | null }
  | { kind: "router"; count: number; medianCredits: number | null };

export type EstimateUnit = "image" | "clip";

/**
 * Caption next to Generate: "≈ N credits per unit" with history, or the
 * GPU-time note before the first run.
 */
export function formatEstimate(
  stats: RuntimeStats | undefined,
  unit: EstimateUnit,
): string {
  if (!stats) return "Billed by GPU time";
  switch (stats.kind) {
    case "gpu":
      if (stats.medianSeconds == null) return "Billed by GPU time";
      return `≈ ${Math.round(stats.medianSeconds * GPU_CREDITS_PER_SECOND)} credits per ${unit}`;
    case "router":
      if (stats.medianCredits == null) return "Priced per run";
      return `≈ ${Math.round(stats.medianCredits)} credits per ${unit}`;
    default: {
      const _exhaustive: never = stats;
      return _exhaustive;
    }
  }
}

/** Tooltip text for the estimate caption. */
export function estimateTitle(stats: RuntimeStats | undefined): string {
  if (stats) {
    switch (stats.kind) {
      case "gpu":
        break;
      case "router":
        return stats.count > 0
          ? `Router price of your last ${stats.count} run${stats.count === 1 ? "" : "s"}`
          : "Router reports the price after each run";
      default: {
        const _exhaustive: never = stats;
        return _exhaustive;
      }
    }
  }
  const runs = stats?.count ?? 0;
  return `Median GPU time of your last ${runs} run${runs === 1 ? "" : "s"} at ${GPU_CREDITS_PER_SECOND} credits/s`;
}
