"use client";

import { DitherGradient } from "@/components/dithercn/dither-gradient";

/** Full-bleed orange halftone wash rising from the bottom of its container. */
export function DitherBackdrop() {
  return (
    <DitherGradient
      angle={0}
      from={0.6}
      to={0}
      noise={0.18}
      cell={4}
      palette={["transparent", "#FF5B22"]}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-75"
    />
  );
}
