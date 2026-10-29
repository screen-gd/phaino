import type { CSSProperties } from "react";
import { ratioOf } from "../studio/studioUtils";
import type { VideoEffect } from "./effects";

const STILLS = {
  reframe: "/explore/examples/ltx25-t2v.webp",
  upscale: "/explore/examples/hunyuan15-t2v.webp",
  motion: "/explore/examples/fasth3-t2v.webp",
  depth: "/explore/examples/ltx23-i2v.webp",
} as const;

const FULL = "absolute inset-0 h-full w-full object-cover";
const TAG =
  "absolute top-1 right-1 rounded bg-black/70 px-1 py-px text-caption font-semibold text-t1";

function Still({
  src,
  className,
  style,
}: {
  src: string;
  className?: string;
  style?: CSSProperties;
}) {
  return <img src={src} alt="" className={className} style={style} />;
}

/** One landscape sample still treated per effect: a static hint of the result. */
export function EffectPreview({ effect }: { effect: VideoEffect }) {
  if (effect.presetId === "edit-reframe") {
    const ratio = ratioOf(String(effect.choices.aspect ?? ""));
    return (
      <div className="relative aspect-video w-full overflow-hidden bg-s1">
        <div
          className="absolute top-1/2 left-1/2 h-[78%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[3px] border border-white/80"
          style={{ aspectRatio: `${ratio?.w ?? 16} / ${ratio?.h ?? 9}` }}
        >
          <Still src={STILLS.reframe} className="h-full w-full object-cover" />
        </div>
      </div>
    );
  }
  if (effect.id === "upscale" || effect.id === "quick-upscale") {
    const quick = effect.id === "quick-upscale";
    return (
      <div className="relative aspect-video w-full overflow-hidden">
        <Still src={STILLS.upscale} className={FULL} />
        <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
          <Still
            src={STILLS.upscale}
            className="h-full w-[200%] max-w-none object-cover"
            style={{ filter: "blur(3px) brightness(0.85)" }}
          />
        </div>
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/70" />
        <span className={TAG}>{quick ? "Fast" : "Best"}</span>
      </div>
    );
  }
  if (effect.id === "smooth-motion" || effect.id === "extra-smooth-motion") {
    const extra = effect.id === "extra-smooth-motion";
    const trails = extra ? 3 : 2;
    const trailOpacity = [0.5, 0.3, 0.15];
    return (
      <div className="relative aspect-video w-full overflow-hidden bg-s1">
        {Array.from({ length: trails }).map((_, i) => (
          <div
            key={i}
            className="absolute inset-y-0 w-[72%]"
            style={{
              right: `calc(6% + ${(i + 1) * 9}px)`,
              opacity: trailOpacity[i],
            }}
          >
            <Still src={STILLS.motion} className="h-full w-full object-cover" />
          </div>
        ))}
        <div className="absolute inset-y-0 right-[6%] w-[72%]">
          <Still src={STILLS.motion} className="h-full w-full object-cover" />
        </div>
        <span className={TAG}>{extra ? "4x" : "2x"}</span>
      </div>
    );
  }
  if (effect.id === "depth-map") {
    return (
      <div className="relative aspect-video w-full overflow-hidden">
        <Still
          src={STILLS.depth}
          className={FULL}
          style={{ filter: "grayscale(1) contrast(1.25) brightness(0.95)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255,255,255,0.85) 0%, rgba(0,0,0,0.95) 80%)",
            mixBlendMode: "multiply",
          }}
        />
      </div>
    );
  }
  return (
    <div className="relative aspect-video w-full overflow-hidden">
      <Still src={STILLS.reframe} className={FULL} />
    </div>
  );
}
