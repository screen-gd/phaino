"use client";

import { FooterGlow } from "@/components/FooterGlow";

/** The orange glow and dithered band behind the footer wordmark and bottom bar. */
export function FooterDither() {
  return <FooterGlow className="absolute inset-0 z-0" />;
}
