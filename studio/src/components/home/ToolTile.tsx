"use client";

import Link from "next/link";
import { useRef } from "react";
import { Icon, SECTION_ICONS, type IconName } from "@/components/icons";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import type { FeatureStatus } from "@/lib/features";

const EXAMPLES = "/explore/examples/";

export type ToolArt =
  | { still: string; video?: string; split?: true }
  | { kind: "timeline" };

// Art lives apart from TOOLS so a future entry can stay text-only.
const TOOL_ART: Partial<Record<string, ToolArt>> = {
  camera: { still: "ltx25-i2v.webp", video: "ltx25-i2v.webm" },
  image: { still: "flux2-klein.webp" },
  video: { still: "wan22.webp", video: "wan22-i2v.webm" },
  effects: { still: "fasth3-t2v.webp", video: "fasth3-t2v.webm" },
  edit: { still: "hunyuan15-t2v.webp", video: "hunyuan15-t2v.webm", split: true },
  kawarimi: { still: "kawarimi_2.webp", video: "kawarimi_2.webm" },
  editor: { kind: "timeline" },
};

const TIMELINE_CLIPS = [
  ["ltx25-i2v.webp", "wan22.webp", "fasth3-t2v.webp"],
  ["minimax-h3-t2v.webp", "hunyuan15-t2v.webp", "qwen-gummy.webp"],
] as const;

/** Static mini timeline: two clip tracks and a playhead for the Editor card. */
function TimelineArt({ wide }: { wide?: boolean }) {
  return (
    <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-center gap-1.5 bg-s1 px-3">
      <div className="flex justify-between border-b border-line/70 pb-1 font-mono text-[9px] text-t3">
        <span>0:00</span>
        <span>0:05</span>
        <span>0:10</span>
        <span>0:15</span>
      </div>
      {TIMELINE_CLIPS.map((row, i) => {
        const cells = wide ? [...row, ...row, ...row] : row;
        return (
          <div key={i} className={cn("grid flex-1 gap-1", wide ? "grid-cols-6 sm:grid-cols-9" : "grid-cols-3")}>
            {cells.map((clip, j) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${clip}-${j}`}
                src={EXAMPLES + clip}
                alt=""
                width={96}
                height={54}
                loading="lazy"
                className={cn(
                  "h-full w-full rounded-[3px] border border-line object-cover",
                  j >= 6 && "max-sm:hidden",
                )}
              />
            ))}
          </div>
        );
      })}
      <span className="absolute bottom-2.5 top-2.5 left-[42%] w-px bg-ac" />
    </div>
  );
}

export type ToolTileTool = {
  id: string;
  href: string;
  name: string;
  kind: string | null;
  desc: string;
  icon: IconName;
};

/** Tool card: still art that plays its clip on hover, editor gets a timeline. */
export function ToolTile({
  tool,
  status,
  wide,
  className,
}: {
  tool: ToolTileTool;
  status: FeatureStatus;
  wide?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const soon = status === "soon";
  const art = TOOL_ART[tool.id];
  const still = art && "still" in art ? art.still : undefined;
  const video = art && "still" in art ? art.video : undefined;
  const split = art && "still" in art ? art.split === true : false;

  const start = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void videoRef.current?.play().catch(() => {});
  };
  const stop = () => {
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  };

  return (
    <Link
      href={soon ? "/roadmap" : tool.href}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
      className={cn(
        "group block overflow-hidden rounded-xl border border-line bg-s1 hover:border-[#444] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-t1",
        className,
      )}
    >
      <div className="relative h-[90px] overflow-hidden">
        {still ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={EXAMPLES + still}
            alt=""
            width={480}
            height={270}
            loading="lazy"
            className="absolute inset-0 size-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
          />
        ) : art && "kind" in art && art.kind === "timeline" ? (
          <TimelineArt wide={wide} />
        ) : (
          <div aria-hidden="true" className="absolute inset-0 grid place-items-center bg-s1">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_90%_at_50%_110%,var(--color-ac),transparent)] opacity-25" />
            <Icon d={SECTION_ICONS[tool.icon]} className="relative h-9 w-9 text-t3" />
          </div>
        )}
        {video && (
          <video
            ref={videoRef}
            src={EXAMPLES + video}
            poster={EXAMPLES + still}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
            width={480}
            height={270}
            className="absolute inset-0 size-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
          />
        )}
        {split && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/2 backdrop-blur-[3px] backdrop-saturate-50"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-t1/80"
            >
              <span className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-t1/80 bg-black/55" />
            </div>
          </>
        )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-s1 via-s1/50 to-transparent" />
        <span className="absolute top-2.5 left-2.5 grid size-7 place-items-center rounded-lg bg-black/55 backdrop-blur-sm">
          <Icon d={SECTION_ICONS[tool.icon]} className="size-3.5 text-t1" />
        </span>
        {tool.kind && (
          <span className="absolute top-2.5 right-2.5 rounded-md bg-black/55 px-1.5 py-0.5 font-mono text-[11px] text-t1 backdrop-blur-sm">
            {tool.kind}
          </span>
        )}
      </div>
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between gap-2">
          <b className={`text-body font-semibold ${soon ? "text-t3" : ""}`}>
            {tool.name}
            <StatusBadge status={status} className="ml-1.5 align-middle" />
          </b>
          <Icon
            d={SECTION_ICONS.arrowUpRight}
            className="size-3.5 shrink-0 text-t3 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
          />
        </div>
        <p className="mt-0.5 truncate text-caption text-t2">{tool.desc}</p>
      </div>
    </Link>
  );
}
