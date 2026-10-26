"use client";

import { useEffect, useRef, useState } from "react";
import type { StudioJob, StudioPreset } from "@/components/toolStudioData";
import { outputUrl } from "@/lib/demo";
import { isVideoPath } from "./JobViews";
import { progressPct, relativeTime } from "./studioUtils";

function RailTile({
  job,
  name,
  active,
  wide,
  onSelect,
}: {
  job: StudioJob;
  name: string;
  active: boolean;
  wide: boolean;
  onSelect: (row: StudioJob) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const play = () => {
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
  const shape = wide ? "aspect-video" : "aspect-square";
  const out = job.outputs[0];
  const media =
    job.status === "succeeded" && out ? (
      isVideoPath(out) ? (
        <video
          ref={videoRef}
          src={outputUrl(out)}
          muted
          playsInline
          preload="metadata"
          className={`${shape} w-full object-cover`}
        />
      ) : (
        <img
          src={outputUrl(out)}
          alt=""
          className={`${shape} w-full object-cover`}
        />
      )
    ) : job.status === "failed" ? (
      <span className={`grid ${shape} w-full place-items-center bg-s2`}>
        <span className="text-caption text-destructive">Failed</span>
      </span>
    ) : (
      <span className={`relative grid ${shape} w-full place-items-center bg-s2`}>
        <span className="px-2 text-center text-caption text-t2">
          {job.message ?? "Waiting"}
        </span>
        <span
          className="absolute inset-x-0 bottom-0 block h-0.5 bg-ac"
          style={{ width: `${progressPct(job.progress)}%` }}
        />
      </span>
    );

  return (
    <button
      type="button"
      title={name}
      aria-current={active || undefined}
      onClick={() => onSelect(job)}
      onPointerEnter={play}
      onPointerLeave={stop}
      onFocus={play}
      onBlur={stop}
      className={`relative block w-[200px] flex-none snap-start overflow-hidden rounded-xl border-2 text-left lg:w-full lg:flex-auto ${
        active ? "border-ac" : "border-transparent"
      }`}
    >
      {media}
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-linear-to-t from-black/80 to-transparent px-2 pb-1 pt-5">
        {wide && (
          <span className="truncate text-caption text-t1">{name}</span>
        )}
        <span className="ml-auto flex-none text-caption text-t3">
          {relativeTime(job.createdAt)}
        </span>
      </span>
    </button>
  );
}

/**
 * Right-hand rail: newest runs first as media tiles, independent scroll.
 * Clicking a run shows it on the stage via onSelect.
 */
export function HistoryRail({
  jobs,
  job,
  presets,
  activeId,
  onSelect,
  aspect,
}: {
  jobs: StudioJob[];
  /** Active job; leads the list while it is not in recent yet. */
  job?: StudioJob | null;
  presets: StudioPreset[];
  activeId?: string;
  onSelect: (row: StudioJob) => void;
  /** Tile shape: 16:9 for video/camera, square for image. */
  aspect: "wide" | "square";
}) {
  // Re-render once a minute so relative times stay fresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const presetName = (id: string) =>
    presets.find((p) => p.id === id)?.name ?? id;
  const rows =
    job && !jobs.some((j) => j.id === job.id) ? [job, ...jobs] : jobs;
  const wide = aspect === "wide";
  const shape = wide ? "aspect-video" : "aspect-square";
  return (
    <aside className="relative flex max-h-[38vh] min-h-0 flex-col border-t border-line pt-5 pr-6 pl-2 lg:max-h-none lg:h-full lg:border-t-0">
      <div className="flex items-baseline justify-between">
        <p className="text-body font-semibold text-t1">History</p>
        {rows.length > 0 && (
          <p className="text-caption text-t3">{rows.length}</p>
        )}
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2 lg:overflow-y-auto lg:overflow-x-hidden">
        {rows.length === 0 ? (
          <div className="grid gap-3">
            <p className="text-caption text-t3">No runs yet</p>
            <div
              className={`flex gap-3 lg:grid ${
                wide ? "lg:grid-cols-1" : "lg:grid-cols-2"
              }`}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`${shape} w-[200px] flex-none rounded-xl border border-dashed border-line lg:w-full`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div
            className={`flex snap-x snap-proximity gap-3 lg:grid lg:snap-none ${
              wide ? "lg:grid-cols-1" : "lg:grid-cols-2"
            }`}
          >
            {rows.map((row) => (
              <RailTile
                key={row.id}
                job={row}
                name={presetName(row.presetId)}
                active={row.id === activeId}
                wide={wide}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
