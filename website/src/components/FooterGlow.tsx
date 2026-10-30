"use client";

import type { CSSProperties } from "react";
import { LinearFlow } from "@/components/linear-flow";
import { DitherShader } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * Dark-red base at the bottom, a bright wavy band of dither crossing behind
 * the wordmark, sparse dots dissolving upward. uv.y is 0 at the bottom:
 * tone 0.5 paints the dark mid palette colour, the band pushes to full ink,
 * and above footerTop the field is 0 so the glow shows through.
 */
const FIELD = `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float n = fbm(p * vec2(1.6, 2.4) + vec2(t * 0.05, -t * 0.03));
  float crest = footerCrest + (n - 0.5) * 0.3;
  float band = exp(-pow((uv.y - crest) / footerWidth, 2.0));
  float rise = smoothstep(footerTop, 0.2, uv.y);
  float grain = (fbm(p * 8.0 + vec2(-t * 0.08, t * 0.12)) - 0.5) * 0.3;
  return clamp(rise * (0.5 + 0.5 * band + grain), 0.0, 1.0);
}
`;

/** The footer's glowing gradient with an animated dithered band on top. */
export function FooterGlow({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none relative overflow-hidden",
        className,
      )}
      style={{
        maskImage: "linear-gradient(to bottom, transparent 0%, #000 38%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, #000 38%)",
        ...style,
      }}
    >
      <LinearFlow
        className="absolute inset-0"
        colors={["#5c1906", "#2a0b03", "#7a2408", "#1a0702"]}
        background="#000"
        speed={0.4}
        blur={0.8}
        grain={0.06}
        warp={0.3}
        interaction={{ pointer: 0, scroll: 0 }}
      />
      <DitherShader
        className="absolute inset-0"
        field={FIELD}
        palette={["transparent", "#7a2408", "#FF5B22"]}
        cell={3}
        matrix="bayer4"
        stillTime={6}
        uniforms={{
          footerCrest: 0.42,
          footerWidth: 0.13,
          footerTop: 0.82,
        }}
      />
    </div>
  );
}
