"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ExploreVideo } from "@/components/ExploreVideo";
import { Icon, SECTION_ICONS } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { MODEL_DEMOS } from "@/lib/explore-media";

export function ExploreCarousel() {
  const id = useId();
  const track = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ index: 0, atStart: true, atEnd: false });

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const update = () => {
      const cards = Array.from(element.children);
      let closest = 0;
      let distance = Infinity;
      cards.forEach((card, index) => {
        const offset = Math.abs(card.getBoundingClientRect().left - element.getBoundingClientRect().left);
        if (offset < distance) { closest = index; distance = offset; }
      });
      setPosition({ index: closest, atStart: element.scrollLeft <= 2, atEnd: element.scrollWidth - element.clientWidth - element.scrollLeft <= 2 });
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => { element.removeEventListener("scroll", update); observer.disconnect(); };
  }, []);

  function move(index: number) {
    const element = track.current;
    const card = element?.children.item(index);
    if (!element || !card) return;
    element.scrollTo({ left: element.scrollLeft + card.getBoundingClientRect().left - element.getBoundingClientRect().left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  return (
    <section className="relative" aria-label="Explore video models" aria-roledescription="carousel">
      <div id={id} ref={track} tabIndex={0} aria-label="Video demos. Use left and right arrows to browse." onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        const destinations: Record<string, number> = { ArrowLeft: Math.max(0, position.index - 1), ArrowRight: Math.min(MODEL_DEMOS.length - 1, position.index + 1), Home: 0, End: MODEL_DEMOS.length - 1 };
        if (event.key in destinations) { event.preventDefault(); move(destinations[event.key]); }
      }} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-ac">
        {MODEL_DEMOS.map((demo, index) => (
          <article key={demo.title} aria-roledescription="slide" aria-label={`${index + 1} of ${MODEL_DEMOS.length}: ${demo.title}`} className="w-[86%] min-w-0 flex-none snap-start sm:w-[46%] xl:w-[30%] 2xl:w-[26%]">
            {demo.media.kind === "image" ? (
              <div className="relative overflow-hidden rounded-xl border border-line bg-s2 aspect-video">
                <img src={demo.media.src} alt={demo.title} loading="lazy" className="absolute inset-0 size-full object-cover" />
              </div>
            ) : (
              <ExploreVideo media={demo.media} title={demo.title} source={demo.source} />
            )}
            <div className="mt-3 flex items-center justify-between gap-2">
              <Link href={demo.href} className="font-display text-body font-bold uppercase hover:underline underline-offset-4">{demo.title} ↗</Link>
            </div>
            <p className="mt-1 text-caption text-t2">{demo.description}</p>
            <a href={demo.source} target="_blank" rel="noreferrer" className="mt-2 inline-block text-caption text-t3 hover:underline underline-offset-4">{demo.credit} ↗</a>
          </article>
        ))}
      </div>
      {!position.atEnd && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-linear-to-r from-transparent to-black sm:w-40" />}
      <div className="pointer-events-none absolute top-1/2 right-2 z-20 flex -translate-y-full items-center gap-2">
        {!position.atStart && <Button className="pointer-events-auto rounded-full bg-black/80" variant="outline" size="icon-xl" aria-label="Previous demos" aria-controls={id} onClick={() => move(Math.max(0, position.index - 1))}><Icon d={SECTION_ICONS.chevronLeft} className="h-5 w-5" /></Button>}
        <Button className="pointer-events-auto rounded-full bg-black/80" variant="outline" size="icon-xl" aria-label="Next demos" aria-controls={id} disabled={position.atEnd} onClick={() => move(Math.min(MODEL_DEMOS.length - 1, position.index + 1))}><Icon d={SECTION_ICONS.chevronRight} className="h-5 w-5" /></Button>
      </div>
    </section>
  );
}

