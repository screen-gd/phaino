"use client";

import Link from "next/link";
import { framesToTimecode } from "@/server/sequence/timecode";
import type { Fps } from "@/server/sequence/timecode";
import type { Media, Sequence, Title } from "@/server/sequence/model";
import { mediaFor } from "@/server/sequence/model";
import type { StripEntry } from "./stripMath";
import { Icon, SECTION_ICONS } from "@/components/icons";
import type { Clip } from "@/server/sequence/model";

const iconBtn =
  "grid h-8 w-8 place-items-center rounded-md text-t2 hover:bg-s2 hover:text-t1";

const ASPECT_NUM: Record<Sequence["aspect"], number> = {
  "16:9": 16 / 9,
  "9:16": 9 / 16,
  "1:1": 1,
  "4:5": 4 / 5,
};

function TitleOverlay({ titles, frame }: { titles: Title[]; frame: number }) {
  const active = titles.filter(
    (t) => frame >= t.start && frame < t.start + t.duration,
  );
  if (active.length === 0) return null;
  const sizeClass = { s: "text-[3.2cqh]", m: "text-[5cqh]", l: "text-[7.5cqh]" } as const;
  return (
    <div className="pointer-events-none absolute inset-0" style={{ containerType: "size" }}>
      {active.map((t) => (
        <div
          key={t.id}
          className="absolute inset-x-0 flex justify-center px-[6%]"
          style={{
            top: t.position === "top" ? "7%" : t.position === "center" ? "50%" : "75%",
            transform: t.position === "center" ? "translateY(-50%)" : undefined,
          }}
        >
          <span
            className={`text-center font-semibold text-white ${sizeClass[t.size]}`}
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}
          >
            {t.text}
          </span>
        </div>
      ))}
    </div>
  );
}

/** The player stage and the 44px transport bar under it. */
export function SequencePlayer({
  videoRef,
  nextRef,
  audioRef,
  sequence,
  frame,
  playing,
  onToggle,
  onStep,
  fps,
  totalFrames,
  currentEntry,
  empty,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  nextRef: React.RefObject<HTMLVideoElement | null>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  sequence: Sequence;
  frame: number;
  playing: boolean;
  onToggle: () => void;
  onStep: (d: number) => void;
  fps: Fps;
  totalFrames: number;
  currentEntry: StripEntry<Clip> | null;
  empty: boolean;
}) {
  const tc = framesToTimecode(frame, fps);
  const totalTc = framesToTimecode(totalFrames, fps);
  const fit = sequence.fit === "cover" ? "object-cover" : "object-contain";
  const currentMedia: Media | undefined = currentEntry
    ? mediaFor(sequence, currentEntry.clip.mediaId)
    : undefined;
  return (
    <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_44px]">
      {/* Stage */}
      <div
        className={`relative min-h-0 overflow-hidden ${empty ? "bg-s1" : "bg-black"}`}
      >
        {/* The output aspect box, centred in the stage. */}
        <div
          className="absolute inset-0 grid place-items-center"
          style={{ containerType: "size" }}
        >
          <div
            className="relative overflow-hidden bg-black"
            style={{
              aspectRatio: String(ASPECT_NUM[sequence.aspect]),
              width: `min(100cqw, calc(100cqh * ${ASPECT_NUM[sequence.aspect]}))`,
            }}
          >
            <div
              className="absolute inset-0"
              style={{ containerType: "size" }}
            >
              <video
                ref={videoRef}
                playsInline
                className={`absolute inset-0 h-full w-full ${fit}`}
              />
              <video
                ref={nextRef}
                playsInline
                className={`absolute inset-0 h-full w-full ${fit}`}
                style={{ opacity: 0 }}
              />
              <TitleOverlay titles={sequence.titles} frame={frame} />
            </div>
          </div>
        </div>
        <audio ref={audioRef} className="hidden" />
        {empty && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl border border-line bg-s2 text-t3">
                <Icon d={SECTION_ICONS.edit} className="h-4.5 w-4.5" />
              </div>
              <p className="text-caption text-t3">
                Add media to start a sequence.
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <Link
                  href="/video"
                  className="rounded-full border border-line px-3 py-1.5 text-[12px] text-t2 hover:bg-s2 hover:text-t1"
                >
                  Open Video
                </Link>
                <Link
                  href="/library"
                  className="rounded-full border border-line px-3 py-1.5 text-[12px] text-t2 hover:bg-s2 hover:text-t1"
                >
                  Library
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transport */}
      <div className="flex h-11 items-center justify-between gap-3 border-t border-line px-3">
        <span className="w-24 font-mono text-[11px] text-t2">{tc}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous frame"
            onClick={() => onStep(-1)}
            className={iconBtn}
          >
            <Icon d={SECTION_ICONS.stepBack} className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={playing ? "Pause" : "Play"}
            onClick={onToggle}
            className="grid h-8 w-8 place-items-center rounded-full bg-white text-black transition-colors hover:bg-white/85"
          >
            <Icon
              d={playing ? SECTION_ICONS.pause : SECTION_ICONS.play}
              className="h-3.5 w-3.5"
            />
          </button>
          <button
            type="button"
            aria-label="Next frame"
            onClick={() => onStep(1)}
            className={iconBtn}
          >
            <Icon d={SECTION_ICONS.stepForward} className="h-4 w-4" />
          </button>
        </div>
        <div className="flex w-24 items-center justify-end gap-2">
          {currentMedia && (
            <span className="hidden truncate text-[11px] text-t3 sm:inline">
              {currentMedia.name}
            </span>
          )}
          <span className="font-mono text-[11px] text-t3">{totalTc}</span>
        </div>
      </div>
    </div>
  );
}
