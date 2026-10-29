"use client";

import { useRef } from "react";
import type { StudioPreset } from "@/components/toolStudioData";
import { useEdgeFade } from "./useEdgeFade";

/** Camera moves: a horizontal strip of every camera preset above the composer. */
export function MoveStrip({
  presets,
  selectedId,
  onSelect,
}: {
  presets: StudioPreset[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fade = useEdgeFade(ref);
  return (
    <div
      ref={ref}
      style={fade}
      className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {presets.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect(p.id)}
          aria-pressed={p.id === selectedId}
          className="w-[132px] flex-none text-left"
        >
          <span
            className={`block overflow-hidden rounded-lg border-2 ${
              p.id === selectedId
                ? "border-ac"
                : "border-transparent hover:border-line"
            }`}
          >
            <img
              src={p.thumbUrl}
              alt=""
              className="aspect-video w-full object-cover"
            />
          </span>
          <span className="mt-1 block truncate text-[12px] text-t2">
            {p.name}
            {p.chip ? ` ${p.chip}` : ""}
          </span>
        </button>
      ))}
    </div>
  );
}
