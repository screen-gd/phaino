"use client";

import { useEffect, useRef } from "react";
import { initDitherGradient } from "@/lib/dither";

/** Full-bleed orange halftone wash rising from the bottom of its container. */
export function DitherBackdrop() {
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
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
