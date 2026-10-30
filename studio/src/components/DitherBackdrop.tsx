"use client";

import { FooterGlow } from "@/components/FooterGlow";

/** Full-bleed orange glow and dithered band rising from the bottom. */
export function DitherBackdrop() {
  return (
    <FooterGlow className="absolute inset-0 z-0 h-full w-full" />
  );
}
