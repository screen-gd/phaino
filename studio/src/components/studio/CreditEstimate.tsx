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
  if (partner && stats?.kind !== "router") {
    return (
      <a
        href="https://comfy.org/pricing"
        target="_blank"
        rel="noreferrer"
        className="text-caption text-t3 underline underline-offset-2 hover:text-t1"
      >
        Partner pricing
      </a>
    );
  }
  return (
    <span className="text-caption text-t3" title={estimateTitle(stats)}>
      {formatEstimate(stats)}
    </span>
  );
}
