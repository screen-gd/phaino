"use client";

import { DitherGradient } from "@/components/dithercn/dither-gradient";

/** The orange halftone wash behind the footer wordmark and bottom bar. */
export function FooterDither() {
  return (
    <DitherGradient
      angle={0}
      from={0.6}
      to={0}
      noise={0.18}
      cell={4}
      palette={["transparent", "#FF5B22"]}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 w-full opacity-75"
      style={{
        height: "calc(clamp(100px,28vw,460px) * 1.2 + 140px)",
      }}
    />
  );
}
