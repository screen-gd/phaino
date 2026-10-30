"use client";

import { FooterGlow } from "@/components/FooterGlow";

/** The orange glow and dithered band behind the footer wordmark and bottom bar. */
export function FooterDither() {
  return (
    <FooterGlow
      className="absolute inset-x-0 bottom-0 z-0 w-full"
      style={{
        height: "calc(clamp(100px,28vw,460px) * 1.35 + 160px)",
      }}
    />
  );
}
