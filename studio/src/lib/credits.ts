// Comfy Cloud bills open workflows by active GPU time at 0.266 credits/s,
// and $1 = 211 credits.
// https://support.comfy.org/articles/5846341390-how-credits-work-in-comfy
export const GPU_CREDITS_PER_SECOND = 0.266;

export type RuntimeStats = { count: number; medianSeconds: number | null };

/**
 * Caption next to Generate: "≈ N credits" with history, or the bare
 * per-second rate before the first run.
 */
export function formatEstimate(stats: RuntimeStats | undefined): string {
  if (!stats || stats.medianSeconds == null) return "0.27 credits/s";
  return `≈ ${Math.round(stats.medianSeconds * GPU_CREDITS_PER_SECOND)} credits`;
}

/** Tooltip text for the estimate caption. */
export function estimateTitle(stats: RuntimeStats | undefined): string {
  const runs = stats?.count ?? 0;
  return `Median GPU time of your last ${runs} run${runs === 1 ? "" : "s"} at ${GPU_CREDITS_PER_SECOND} credits/s`;
}
