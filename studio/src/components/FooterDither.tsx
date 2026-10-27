"use client";

import { useEffect, useRef } from "react";
import { initDitherGradient } from "@/lib/dither";

/** The orange halftone wash behind the footer wordmark and bottom bar. */
export function FooterDither() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    return initDitherGradient(canvas, {
      color: [255, 91, 34],
      cell: 4,
      opacity: 0.42,
    });
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 w-full"
      style={{
        height: "calc(clamp(100px,28vw,460px) * 1.2 + 140px)",
        imageRendering: "pixelated",
        background:
          "linear-gradient(0deg, #ff5b2214, transparent 70%)",
      }}
    />
  );
}
