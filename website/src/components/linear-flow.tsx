"use client";
import { kindDefaults } from "@/lib/gradient-engine";
import type { GradientParams } from "@/lib/gradient-engine";

import { GradientBackground } from "./gradient-surface";
import type { GradientBackgroundProps } from "./gradient-surface";

/** A linear blend whose angle and colour stops drift slowly. */
export const linearFlowDefaults: GradientParams = kindDefaults("linear-flow");

export type LinearFlowProps = GradientBackgroundProps;

export function LinearFlow(props: LinearFlowProps) {
  return <GradientBackground defaults={linearFlowDefaults} {...props} />;
}
