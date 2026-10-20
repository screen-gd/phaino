"use client";

import {
  estimateTitle,
  formatEstimate,
  type RuntimeStats,
} from "@/lib/credits";

/** Small credit estimate next to Generate, from server-computed run stats. */
export function EstimateCaption({
  stats,
  partner,
}: {
  stats?: RuntimeStats;
  partner?: boolean;
}) {
  if (partner) {
    return (
      <a
        href="https://comfy.org/pricing"
        target="_blank"
        rel="noreferrer"
        className="text-xs text-t3 underline underline-offset-2 hover:text-t1"
      >
        Partner pricing
      </a>
    );
  }
  return (
    <span className="text-xs text-t3" title={estimateTitle(stats)}>
      {formatEstimate(stats)}
    </span>
  );
}
