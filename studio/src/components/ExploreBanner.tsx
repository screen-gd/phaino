"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
    image: "/explore/reveal.webp",
    actions: [{ label: "See the feed", href: "/community", accent: true }],
  },
];

const PILL =
  "inline-flex h-11 items-center justify-center gap-1.5 rounded-full border px-3.5 whitespace-nowrap";

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
      className="relative h-[360px] overflow-hidden rounded-panel border border-line bg-s1"
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
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#000d_0%,#0008_45%,#0000_75%)]" />
          <div className="absolute bottom-8 left-8 z-10 max-w-[520px]">
            <span className="inline-flex h-[22px] items-center rounded-full bg-acs px-2 font-mono text-xs text-ac">
              {s.chip}
            </span>
            <h1 className="mt-2.5 mb-3.5 text-[52px] leading-none font-bold tracking-[-0.04em]">
              {s.title}
            </h1>
            {s.body && <p className="mb-[18px] text-[15px] text-t2">{s.body}</p>}
            <div className="flex gap-2">
              {s.actions.map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  tabIndex={i === index ? 0 : -1}
                  className={`${PILL} ${
                    a.accent
                      ? "border-ac bg-ac font-semibold text-on"
                      : "border-line bg-s2 hover:border-[#3a3a3a] hover:bg-s3"
                  }`}
                >
                  {a.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ))}
      <div
        role="tablist"
        aria-label="Choose slide"
        className="absolute right-5 bottom-5 z-10 flex"
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
