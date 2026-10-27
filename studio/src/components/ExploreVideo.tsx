"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, SECTION_ICONS } from "@/components/icons";
import type { ExploreMedia } from "@/lib/explore-media";

/** Muted loops start on arrival and stop when hidden or outside the viewport. */
export function ExploreVideo({ media, title, source, portrait = false, natural = false }: {
  media: ExploreMedia;
  title: string;
  source: string;
  portrait?: boolean;
  /** Render at the media's own aspect ratio (masonry tiles). */
  natural?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let visible = false;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      if (paused || !visible || document.hidden || motion.matches) {
        element.pause();
      } else {
        void element.play().catch(() => { /* Keep the poster if autoplay is unavailable. */ });
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    }, { threshold: 0.1 });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    motion.addEventListener("change", update);
    return () => {
      element.pause();
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      motion.removeEventListener("change", update);
    };
  }, [paused]);

  return (
    <div
      className={`group relative overflow-hidden rounded-md border border-line bg-black ${natural ? "" : portrait ? "aspect-[4/5]" : "aspect-video"}`}
      style={natural ? { aspectRatio: `${media.w} / ${media.h}` } : undefined}
    >
      <img src={media.poster} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
      {!failed && (
        <video
          ref={video}
          src={media.src}
          poster={media.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={title}
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {failed ? (
        <a href={source} target="_blank" rel="noreferrer" className="absolute right-2 bottom-2 z-20 rounded bg-black/80 px-2 py-1 text-caption text-white underline underline-offset-4">View source ↗</a>
      ) : (
        <button
          type="button"
          aria-label={`${paused ? "Play" : "Pause"} ${title}`}
          onClick={() => setPaused(!paused)}
          className="absolute top-2 right-2 z-20 grid size-9 cursor-pointer place-items-center rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        >
          {paused ? <Icon d={SECTION_ICONS.play} className="size-4" /> : <Icon d={SECTION_ICONS.pause} className="size-4" />}
        </button>
      )}
    </div>
  );
}
