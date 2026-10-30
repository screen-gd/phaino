"use client";

import { useEffect, useRef } from "react";

/** The marketing footer's scrubbed rise, driven by the studio's scroll container. */
export function FooterWordmark({
  wordClassName = "text-[#f2f2f2]",
}: {
  wordClassName?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const scroller = element.closest("main");
    const scrollTarget = scroller ?? window;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number | null = null;
    const clamp = (value: number) => Math.max(0, Math.min(1, value));

    const draw = () => {
      frame = null;
      const bounds = element.getBoundingClientRect();
      const bottom = scroller?.getBoundingClientRect().bottom ?? window.innerHeight;
      const progress = motion.matches ? 1 : clamp((bottom - bounds.top) / Math.max(1, bounds.height));
      if (word.current) word.current.style.transform = `translateY(${70 * (1 - progress)}%)`;
    };
    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(draw);
    };
    draw();
    scrollTarget.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motion.addEventListener("change", schedule);
    const resize = new ResizeObserver(schedule);
    resize.observe(element);
    if (scroller) resize.observe(scroller);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      scrollTarget.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motion.removeEventListener("change", schedule);
      resize.disconnect();
    };
  }, []);

  return (
    <div
      ref={container}
      aria-hidden="true"
      className="flex w-full items-baseline justify-center gap-4 overflow-hidden pt-[72px] pb-[6px] font-wordmark font-[650] text-[clamp(100px,28vw,460px)] leading-[0.9] tracking-[-0.087em] max-[800px]:pt-14 max-[480px]:pt-9"
    >
      <span
        ref={word}
        className={`inline-block font-extrabold tracking-[-0.024em] ${wordClassName}`}
      >
        phaino
      </span>
    </div>
  );
}
