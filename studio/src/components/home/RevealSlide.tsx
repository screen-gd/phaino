"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Button } from "@/components/ui/button";
import type { GraphModel } from "@/components/workflow/graphModel";
import { GraphPreview } from "./GraphPreview";

const clampPct = (v: number) => Math.min(100, Math.max(0, v));

type SplitStyle = CSSProperties & { "--split": string };

/** First ExploreCarousel slide: the clip under, its workflow behind a wiper. */
export function RevealSlide({ graph }: { graph: GraphModel }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const grabbed = useRef(false);
  const [split, setSplit] = useState(50);

  // One reveal sweep on load; a grabbed handle or reduced motion skips it.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      videoRef.current?.pause();
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      if (grabbed.current) return;
      const p = Math.min(1, (t - t0) / 1600);
      setSplit(50 + 32 * Math.sin(Math.PI * p) ** 2);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const splitFromClientX = (clientX: number) => {
    const r = panelRef.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setSplit(clampPct(((clientX - r.left) / r.width) * 100));
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    grabbed.current = true;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    splitFromClientX(e.clientX);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      splitFromClientX(e.clientX);
    }
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    grabbed.current = true;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setSplit((s) => clampPct(s - 5));
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setSplit((s) => clampPct(s + 5));
    } else if (e.key === "Home") {
      e.preventDefault();
      setSplit(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setSplit(100);
    }
  };

  const panelStyle: SplitStyle = { "--split": `${split}%` };

  return (
    <>
      <div
        ref={panelRef}
        className="relative aspect-video overflow-hidden rounded-md border border-line bg-black select-none"
        style={panelStyle}
      >
        <video
          ref={videoRef}
          src="/explore/examples/ltx25-i2v.mp4"
          poster="/explore/examples/ltx25-i2v.webp"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 bg-black"
          style={{ clipPath: "inset(0 0 0 var(--split))" }}
        >
          <GraphPreview
            model={graph}
            label="Orbit workflow graph"
            className="h-full w-full"
          />
        </div>
        <div
          role="slider"
          tabIndex={0}
          aria-label="Reveal the workflow"
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(split)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={onKeyDown}
          className="absolute inset-y-0 left-(--split) z-10 w-8 -translate-x-1/2 cursor-ew-resize touch-none"
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ac" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-line bg-black px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-t2">
            Bring it to light
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button render={<Link href="/camera?preset=orbit" />}>
          Try Orbit
        </Button>
        <Button
          variant="outline"
          render={<Link href="/workflows/orbit" />}
        >
          Open the workflow
        </Button>
      </div>
      <p className="mt-2 font-mono text-caption text-t3">
        Clip: LTX 2.5 image-to-video example, Comfy (MIT). Graph: the Orbit
        preset.
      </p>
    </>
  );
}
