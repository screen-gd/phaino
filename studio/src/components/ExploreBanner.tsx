"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type SlideAction = { label: string; href: string; accent?: boolean };
type Slide = {
  chip: string;
  title: string;
  body?: string;
  image: string;
  actions: SlideAction[];
};

const SLIDES: Slide[] = [
  {
    chip: "New: Orbit preset",
    title: "Every frame. Wide open.",
    body: "A slow 90° orbit around any still. LTX 2.5.",
    image: "/explore/hero.webp",
    actions: [
      { label: "Try Orbit", href: "/camera?preset=orbit", accent: true },
      { label: "Open the workflow", href: "/workflows/orbit" },
    ],
  },
  {
    chip: "LTX 2.5 · VFX",
    title: "Effects, one click away.",
    image: "/explore/effects.webp",
    actions: [{ label: "Browse effects", href: "/effects", accent: true }],
  },
  {
    chip: "Community forks",
    title: "Fork what others made.",
    image: "/explore/closer.webp",
    actions: [{ label: "See the feed", href: "/community", accent: true }],
  },
];

/**
 * Rotating hero: crossfading slides, one timeout per slide, paused on
 * hover/focus and under prefers-reduced-motion.
 */
export function ExploreBanner() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), 6000);
    return () => clearTimeout(t);
  }, [index, paused]);

  return (
    <div
      className="relative h-[300px] overflow-hidden rounded-panel border border-line"
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {SLIDES.map((s, i) => (
        <div
          key={s.chip}
          aria-roledescription="slide"
          aria-label={`${i + 1} of ${SLIDES.length}`}
          aria-hidden={i !== index}
          className={`absolute inset-0 transition-[opacity,visibility] duration-700 motion-reduce:transition-none ${
            i === index ? "visible opacity-100" : "invisible opacity-0"
          }`}
        >
          <img src={s.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/60 bg-[radial-gradient(ellipse_at_center,#0000_0%,#000c_85%)]" />
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
            <div className="mx-auto max-w-[760px]">
              <Badge variant="secondary" className="bg-acs font-mono text-ac">
                {s.chip}
              </Badge>
              <h2 className="mt-3 mb-3 font-display font-extrabold uppercase text-h1 md:text-display leading-none tracking-tight font-stretch-[112.5%]">
                {s.title}
              </h2>
              {s.body && <p className="mb-[18px] text-body text-t2">{s.body}</p>}
              <div className="flex justify-center gap-2">
                {s.actions.map((a) => (
                  <Button
                    key={a.label}
                    size="lg"
                    variant={a.accent ? "default" : "outline"}
                    tabIndex={i === index ? 0 : -1}
                    render={<Link href={a.href} />}
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
      <div
        role="tablist"
        aria-label="Choose slide"
        className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2"
      >
        {SLIDES.map((s, i) => (
          <button
            key={s.chip}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Slide ${i + 1}: ${s.title}`}
            onClick={() => setIndex(i)}
            className="grid h-11 w-[30px] place-items-center"
          >
            <span
              className={`h-2 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                i === index ? "w-6 bg-ac" : "w-2 bg-white/40"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
