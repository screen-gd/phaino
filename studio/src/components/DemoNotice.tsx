"use client";

import { useState } from "react";
import { DEMO_MESSAGE } from "@/lib/demo";
import { Icon, SECTION_ICONS } from "./icons";

/** A slim, seamless marquee with one accessible copy of the notice. */
export function DemoNotice() {
  const [paused, setPaused] = useState(false);

  return (
    <div role="region" aria-label="Demo notice" className="flex h-6 min-w-0 items-center overflow-hidden bg-ac text-black">
      <p className="sr-only">{DEMO_MESSAGE}</p>
      <div className="min-w-0 flex-1 overflow-hidden text-sm font-bold leading-none">
        <div className="demo-notice-track" data-paused={paused} aria-hidden="true">
          {[0, 1].map((copy) => (
            <div key={copy} className="demo-notice-group">
              {[0, 1, 2].map((repeat) => (
                <span key={repeat} className="shrink-0 whitespace-nowrap px-8">{DEMO_MESSAGE}</span>
              ))}
            </div>
          ))}
        </div>
        <span className="demo-notice-static" aria-hidden="true">Demo · Sample previews. No credits used.</span>
      </div>
      <button
        type="button"
        className="demo-notice-toggle grid h-6 w-8 shrink-0 place-items-center"
        aria-label={paused ? "Resume demo notice" : "Pause demo notice"}
        aria-pressed={paused}
        onClick={() => setPaused((previous) => !previous)}
      >
        <Icon d={paused ? SECTION_ICONS.play : SECTION_ICONS.pause} className="h-3 w-3" />
      </button>
    </div>
  );
}
