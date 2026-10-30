"use client";
import { kindDefaults } from "@/lib/gradient-engine";
import type { GradientParams } from "@/lib/gradient-engine";

import { GradientBackground } from "./gradient-surface";
import type { GradientBackgroundProps } from "./gradient-surface";

/** A warm glow rising from the bottom edge. */
export const radialGlowDefaults: GradientParams = kindDefaults("radial-glow");

export type RadialGlowProps = GradientBackgroundProps;

export function RadialGlow(props: RadialGlowProps) {
  return <GradientBackground defaults={radialGlowDefaults} {...props} />;
}
