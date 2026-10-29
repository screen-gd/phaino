"use client";

import { useRef } from "react";
import { useEdgeFade } from "../studio/useEdgeFade";
import { EffectPreview } from "./EffectPreview";
import type { VideoEffect } from "./effects";

/** Video effects: a horizontal strip of treated previews above the composer. */
export function EffectPicker({
  effects,
  activeId,
  onSelect,
}: {
  effects: VideoEffect[];
  activeId?: string;
  onSelect: (effect: VideoEffect) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fade = useEdgeFade(ref);
  return (
    <div
      ref={ref}
      style={fade}
      role="group"
      aria-label="Video effects"
      className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {effects.map((effect) => (
        <button
          key={effect.id}
          type="button"
          aria-pressed={activeId === effect.id}
          onClick={() => onSelect(effect)}
          className="w-[132px] flex-none text-left"
        >
          <span
            className={`block overflow-hidden rounded-lg border-2 ${
              activeId === effect.id
                ? "border-ac"
                : "border-transparent hover:border-line"
            }`}
          >
            <EffectPreview effect={effect} />
          </span>
          <span className="mt-1 block truncate text-[12px] text-t2">
            {effect.name}
          </span>
        </button>
      ))}
    </div>
  );
}
