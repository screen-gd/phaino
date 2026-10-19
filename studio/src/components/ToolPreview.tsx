"use client";

import { useEffect, useRef } from "react";

/**
 * Tool tile media: the WebP still by default, or a muted loop when the
 * server found an MP4 for this tool. The loop plays on pointer hover and
 * keyboard focus (on the enclosing link) and pauses on leave. Never autoplays.
 */
export function ToolPreview({ poster, video }: { poster: string; video: string | null }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !video) return;
    const v = el.querySelector("video");
    if (!v) return;
    const host = el.closest("a, button");

    const play = () => {
      void v.play().catch(() => {});
    };
    const stop = () => v.pause();
    el.addEventListener("pointerenter", play);
    el.addEventListener("pointerleave", stop);
    host?.addEventListener("focusin", play);
    host?.addEventListener("focusout", stop);
    return () => {
      el.removeEventListener("pointerenter", play);
      el.removeEventListener("pointerleave", stop);
      host?.removeEventListener("focusin", play);
      host?.removeEventListener("focusout", stop);
    };
  }, [video]);

  return (
    <div ref={ref} className="relative aspect-4/3 overflow-hidden rounded-xl bg-s3">
      {video ? (
        <video
          src={video}
          poster={poster}
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      ) : (
        <img src={poster} alt="" className="h-full w-full object-cover" />
      )}
    </div>
  );
}
