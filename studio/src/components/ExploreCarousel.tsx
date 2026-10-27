"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ExploreVideo } from "@/components/ExploreVideo";
import { RevealSlide } from "@/components/home/RevealSlide";
import { Icon, SECTION_ICONS } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { GraphModel } from "@/components/workflow/graphModel";
import { MODEL_DEMOS } from "@/lib/explore-media";

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "instant"
    : "smooth";
}

export function ExploreCarousel({ orbitGraph }: { orbitGraph?: GraphModel }) {
  const id = useId();
  const track = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ index: 0, atStart: true, atEnd: false });
  const slideCount = MODEL_DEMOS.length + (orbitGraph ? 1 : 0);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const cards = Array.from(element.children);
      let closest = 0;
      let distance = Infinity;
      cards.forEach((card, index) => {
        const offset = Math.abs(card.getBoundingClientRect().left - element.getBoundingClientRect().left);
        if (offset < distance) { closest = index; distance = offset; }
      });
      const next = {
        index: closest,
        atStart: element.scrollLeft <= 2,
        atEnd: element.scrollWidth - element.clientWidth - element.scrollLeft <= 2,
      };
      setPosition((prev) =>
        prev.index === next.index && prev.atStart === next.atStart && prev.atEnd === next.atEnd
          ? prev
          : next,
      );
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    element.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", onScroll);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  function move(index: number) {
    const element = track.current;
    const card = element?.children.item(index);
    if (!element || !card) return;
    element.scrollTo({ left: element.scrollLeft + card.getBoundingClientRect().left - element.getBoundingClientRect().left, behavior: scrollBehavior() });
  }

  function page(dir: 1 | -1) {
    const element = track.current;
    element?.scrollBy({ left: dir * element.clientWidth * 0.9, behavior: scrollBehavior() });
  }

  return (
    <section className="relative" aria-label="Explore video models" aria-roledescription="carousel">
      <div id={id} ref={track} tabIndex={0} aria-label="Video demos. Use left and right arrows to browse." onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        const destinations: Record<string, number> = { ArrowLeft: Math.max(0, position.index - 1), ArrowRight: Math.min(slideCount - 1, position.index + 1), Home: 0, End: slideCount - 1 };
        if (event.key in destinations) { event.preventDefault(); move(destinations[event.key]); }
      }} className="flex snap-x snap-proximity motion-safe:scroll-smooth overscroll-x-contain gap-3 overflow-x-auto scroll-pr-4 pr-4 pb-2 [scrollbar-width:none]">
        {orbitGraph && (
          <article
            aria-roledescription="slide"
            aria-label={`1 of ${slideCount}: Orbit workflow reveal`}
            className="w-[86%] min-w-0 flex-none snap-start sm:w-[70%] xl:w-[46%]"
          >
            <RevealSlide graph={orbitGraph} />
          </article>
        )}
        {MODEL_DEMOS.map((demo, index) => {
          const n = index + (orbitGraph ? 2 : 1);
          return (
          <article key={demo.title} aria-roledescription="slide" aria-label={`${n} of ${slideCount}: ${demo.title}`} className="w-[86%] min-w-0 flex-none snap-start sm:w-[46%] xl:w-[30%] 2xl:w-[26%]">
            {demo.media.kind === "image" ? (
              <div className="relative overflow-hidden rounded-md border border-line bg-black aspect-video">
                <img src={demo.media.src} alt={demo.title} loading="lazy" className="absolute inset-0 size-full object-cover" />
              </div>
            ) : (
              <ExploreVideo media={demo.media} title={demo.title} source={demo.source} />
            )}
            <div className="mt-3 flex items-center justify-between gap-2">
              <Link href={demo.href} className="font-display text-body font-semibold hover:underline underline-offset-4">{demo.title} ↗</Link>
            </div>
            <p className="mt-1 text-caption text-t2">{demo.description}</p>
            <a href={demo.source} target="_blank" rel="noreferrer" className="mt-2 inline-block font-mono text-caption text-t3 hover:underline underline-offset-4">{demo.credit} ↗</a>
          </article>
          );
        })}
      </div>
      <div aria-hidden="true" className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-linear-to-l from-transparent to-black transition-opacity duration-200 motion-reduce:transition-none sm:w-40 ${position.atStart ? "opacity-0" : "opacity-100"}`} />
      <div aria-hidden="true" className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-linear-to-r from-transparent to-black transition-opacity duration-200 motion-reduce:transition-none sm:w-40 ${position.atEnd ? "opacity-0" : "opacity-100"}`} />
      <div className="pointer-events-none absolute top-1/2 right-2 z-20 flex -translate-y-full items-center gap-2">
        {!position.atStart && <Button className="pointer-events-auto rounded-full bg-black/80" variant="outline" size="icon-xl" aria-label="Previous demos" aria-controls={id} onClick={() => page(-1)}><Icon d={SECTION_ICONS.chevronLeft} className="h-5 w-5" /></Button>}
        <Button className="pointer-events-auto rounded-full bg-black/80" variant="outline" size="icon-xl" aria-label="Next demos" aria-controls={id} disabled={position.atEnd} onClick={() => page(1)}><Icon d={SECTION_ICONS.chevronRight} className="h-5 w-5" /></Button>
      </div>
    </section>
  );
}
