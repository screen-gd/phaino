"use client";

import type { VideoEffect } from "./effects";

export function EffectPicker({
  effects,
  activeId,
  onSelect,
}: {
  effects: VideoEffect[];
  activeId?: string;
  onSelect: (effect: VideoEffect) => void;
}) {
  return (
    <div role="group" aria-label="Video effects" className="mt-4 flex shrink-0 gap-2 overflow-x-auto pb-1">
      {effects.map((effect) => (
        <button
          key={effect.id}
          type="button"
          aria-pressed={activeId === effect.id}
          onClick={() => onSelect(effect)}
          className={`w-44 shrink-0 rounded-lg border bg-transparent p-3 text-left ${activeId === effect.id ? "border-ac text-t1" : "border-line text-t2 hover:border-t3 hover:text-t1"}`}
        >
          <span className="block text-body font-medium">{effect.name}</span>
          <span className="mt-1 block text-caption text-t3">{effect.description}</span>
        </button>
      ))}
    </div>
  );
}
