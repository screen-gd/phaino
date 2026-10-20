"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type {
  AudioClip,
  Clip,
  Sequence,
  Title,
} from "@/server/sequence/model";
import { mediaFor } from "@/server/sequence/model";
import type { Fps } from "@/server/sequence/timecode";
import { framesToTimecode } from "@/server/sequence/timecode";
import { ClipTile } from "./ClipTile";
import type { Selection } from "./useSequence";
import { OUTPUT_MIME, MEDIA_MIME, kindFromPath } from "./MediaBin";
import {
  frameAtX,
  moveFromDrag,
  nextZoomToFit,
  tickStep,
  trimFromDrag,
  type StripLayout,
} from "./stripMath";
import { Icon, SECTION_ICONS } from "@/components/icons";
import { Slider } from "@/components/ui/slider";

/** Left inset for the ruler and lanes, so the first label isn't clipped. */
const EDGE = 12;
const HATCH =
  "repeating-linear-gradient(45deg, rgba(255,91,34,0.35) 0 3px, transparent 3px 7px)";

function Ruler({
  totalFrames,
  fps,
  pxPerSec,
}: {
  totalFrames: number;
  fps: Fps;
  pxPerSec: number;
}) {
  const totalSec = totalFrames / fps;
  const step = tickStep(pxPerSec);
  const labels: number[] = [];
  for (let t = 0; t <= totalSec + 0.001; t += step) labels.push(t);
  return (
    <div
      className="relative h-6 select-none"
      style={{ width: Math.max(0, totalSec * pxPerSec) }}
    >
      {labels.map((t) => (
        <span
          key={t}
          className="absolute top-1 w-16 -translate-x-8 text-center font-mono text-[11px] text-t3"
          style={{ left: Math.max(0, t * pxPerSec) }}
        >
          {`${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`}
        </span>
      ))}
    </div>
  );
}

/** Draggable+trimmable tile for the audio and title lanes. */
function FreeTile({
  id,
  lane,
  label,
  sub,
  start,
  len,
  inF,
  outF,
  total,
  fps,
  pxPerSec,
  selected,
  onSelect,
  onMove,
  onTrim,
  onCommit,
  onMark,
}: {
  id: string;
  lane: "audio" | "title";
  label: string;
  sub?: string;
  /** Record start in frames. */
  start: number;
  /** Used length in frames (out-in for audio, duration for titles). */
  len: number;
  inF: number;
  outF: number;
  /** Media total in frames (audio trim bound; 0 = no trim). */
  total: number;
  fps: Fps;
  pxPerSec: number;
  selected: boolean;
  onSelect: (sel: Selection) => void;
  onMove: (start: number) => void;
  onTrim: (i: number, o: number) => void;
  onCommit: () => void;
  onMark: () => void;
}) {
  const [drag, setDrag] = useState<{
    mode: "move" | "left" | "right";
    startX: number;
    start: number;
    inF: number;
    outF: number;
    pid: number;
  } | null>(null);

  const begin = (mode: "move" | "left" | "right") => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onSelect({ lane, id });
    onMark();
    setDrag({ mode, startX: e.clientX, start, inF, outF, pid: e.pointerId });
  };

  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    if (drag.mode === "move") {
      onMove(moveFromDrag(drag.start, dx, pxPerSec, fps, e.shiftKey));
    } else {
      const t = trimFromDrag({
        side: drag.mode,
        startIn: drag.inF,
        startOut: drag.outF,
        dxPx: dx,
        pxPerSec,
        fps,
        total: Math.max(total, drag.outF),
        shift: e.shiftKey,
      });
      onTrim(t.in, t.out);
    }
  };

  const end = (e: React.PointerEvent) => {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    (e.target as HTMLElement).releasePointerCapture?.(d.pid);
    if (d.start !== start || d.inF !== inF || d.outF !== outF) onCommit();
  };

  return (
    <div
      data-clip-tile
      role="button"
      tabIndex={0}
      onPointerDown={begin("move")}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onClick={() => onSelect({ lane, id })}
      onKeyDown={(e) => {
        if (e.key === "Delete" || e.key === "Backspace") e.preventDefault();
      }}
      className={`group/tile absolute top-1 bottom-1 cursor-grab touch-none overflow-hidden rounded-md border px-2 text-left ${
        selected ? "ring-2 ring-ac border-ac" : "border-line"
      } ${lane === "title" ? "bg-s3" : "bg-s2"}`}
      style={{
        left: (start / fps) * pxPerSec,
        width: Math.max(18, (len / fps) * pxPerSec),
        zIndex: drag ? 30 : 10,
      }}
      aria-label={label}
    >
      <div className="flex h-full min-w-0 items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-t1">
          {label}
        </span>
        {sub && (
          <span className="shrink-0 font-mono text-[10px] text-t3">{sub}</span>
        )}
      </div>
      {total > 0 && (
        <>
          <span
            role="presentation"
            onPointerDown={begin("left")}
            className="absolute top-0 bottom-0 -left-1 w-2 cursor-ew-resize"
          />
          <span
            role="presentation"
            onPointerDown={begin("right")}
            className="absolute top-0 bottom-0 -right-1 w-2 cursor-ew-resize"
          />
        </>
      )}
    </div>
  );
}

/** The three-lane timeline: titles, video (V1), audio (A1). */
export function Timeline({
  sequence,
  layout,
  selected,
  onSelect,
  onSeek,
  playheadFrame,
  pxPerSec,
  onZoomChange,
  onReorder,
  onMark,
  onPreviewClip,
  onPreviewAudio,
  onPreviewTitle,
  onCommit,
  onResetTrim,
  onRemoveClip,
  onMoveClip,
  onDropOutput,
  onDropMedia,
}: {
  sequence: Sequence;
  layout: StripLayout<Clip>;
  selected: Selection;
  onSelect: (sel: Selection) => void;
  onSeek: (frame: number) => void;
  playheadFrame: number;
  pxPerSec: number;
  onZoomChange: (v: number) => void;
  onReorder: (from: number, to: number) => void;
  /** Push an undo point before a preview gesture. */
  onMark: () => void;
  onPreviewClip: (id: string, i: number, o: number) => void;
  onPreviewAudio: (id: string, patch: Partial<AudioClip>) => void;
  onPreviewTitle: (id: string, patch: Partial<Title>) => void;
  onCommit: () => void;
  onResetTrim: (clip: Clip) => void;
  onRemoveClip: (id: string) => void;
  onMoveClip: (index: number, dir: -1 | 1) => void;
  onDropOutput: (path: string) => void;
  onDropMedia: (mediaId: string) => void;
}) {
  const fps = sequence.fps;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dropHint, setDropHint] = useState<"video" | "audio" | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const totalPx = (layout.totalFrames / fps) * pxPerSec;

  const seekFromX = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-clip-tile]")) return;
    const el = scrollRef.current;
    if (!el) return;
    const x = e.clientX - el.getBoundingClientRect().left + el.scrollLeft - EDGE;
    onSeek(frameAtX(x, pxPerSec, fps, layout.totalFrames));
  };

  const onDragEnd = (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const from = sequence.clips.findIndex((c) => c.id === active.id);
    const to = sequence.clips.findIndex((c) => c.id === over.id);
    if (from >= 0 && to >= 0) onReorder(from, to);
  };

  const dropOn = (lane: "video" | "audio") => (e: React.DragEvent) => {
    const mediaId = e.dataTransfer.getData(MEDIA_MIME);
    const rel = e.dataTransfer.getData(OUTPUT_MIME);
    setDropHint(null);
    if (mediaId) {
      const m = mediaFor(sequence, mediaId);
      if (!m) return;
      if (lane === "audio" ? m.kind !== "audio" : m.kind === "audio") return;
      e.preventDefault();
      onDropMedia(mediaId);
      return;
    }
    if (!rel) return;
    const kind = kindFromPath(rel);
    if (lane === "audio" ? kind !== "audio" : kind === "audio") return;
    e.preventDefault();
    onDropOutput(rel);
  };

  const allowDrop = (lane: "video" | "audio") => (e: React.DragEvent) => {
    if (
      e.dataTransfer.types.includes(OUTPUT_MIME) ||
      e.dataTransfer.types.includes(MEDIA_MIME)
    ) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setDropHint(lane);
    }
  };

  const playheadX = (playheadFrame / fps) * pxPerSec;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex h-9 items-center justify-between gap-2 px-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="font-mono text-[11px] font-medium text-t2">
            V1 / A1
          </span>
          <span className="hidden truncate text-[11px] text-t3 sm:inline">
            S split · Shift snaps to 1s · Alt+←/→ move
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => onZoomChange(pxPerSec / 1.5)}
            className="grid h-7 w-7 place-items-center rounded-md text-t3 hover:bg-s2 hover:text-t1"
          >
            <Icon d={SECTION_ICONS.minus} className="h-3.5 w-3.5" />
          </button>
          <Slider
            aria-label="Zoom"
            min={10}
            max={200}
            step={1}
            value={[pxPerSec]}
            onValueChange={(v) => {
              const val = Array.isArray(v) ? v[0] : v;
              if (typeof val === "number") onZoomChange(val);
            }}
            className="w-[120px]"
          />
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => onZoomChange(pxPerSec * 1.5)}
            className="grid h-7 w-7 place-items-center rounded-md text-t3 hover:bg-s2 hover:text-t1"
          >
            <Icon d={SECTION_ICONS.plus} className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              const w = scrollRef.current?.clientWidth ?? 800;
              onZoomChange(nextZoomToFit(layout.totalFrames, fps, w - EDGE));
            }}
            className="rounded-md px-2 py-1 text-[12px] text-t3 hover:bg-s2 hover:text-t1"
          >
            Fit
          </button>
        </div>
      </div>

      {/* Ruler + lanes */}
      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2"
        onPointerDown={seekFromX}
      >
        <div className="relative w-max min-w-full pl-3 pr-3">
          <Ruler totalFrames={layout.totalFrames} fps={fps} pxPerSec={pxPerSec} />

          {/* Titles lane */}
          <div className="mt-1 flex items-center gap-2">
            <span className="w-8 shrink-0 font-mono text-[10px] text-t3">T</span>
            <div
              className="relative h-8 rounded-md bg-s2/60"
              style={{ width: Math.max(60, totalPx) }}
            >
              {sequence.titles.map((t) => (
                <FreeTile
                  key={t.id}
                  id={t.id}
                  lane="title"
                  label={t.text}
                  sub={framesToTimecode(t.duration, fps)}
                  start={t.start}
                  len={t.duration}
                  inF={0}
                  outF={t.duration}
                  total={1e9}
                  fps={fps}
                  pxPerSec={pxPerSec}
                  selected={selected?.lane === "title" && selected.id === t.id}
                  onSelect={onSelect}
                  onMove={(start) =>
                    onPreviewTitle(t.id, { start })
                  }
                  onTrim={(i2, o2) =>
                    onPreviewTitle(t.id, {
                      start: t.start + i2,
                      duration: Math.max(1, o2 - i2),
                    })
                  }
                  onCommit={onCommit}
                  onMark={onMark}
                />
              ))}
            </div>
          </div>

          {/* Video lane */}
          <div className="mt-1 flex items-center gap-2">
            <span className="w-8 shrink-0 font-mono text-[10px] text-t3">V1</span>
            <div
              className="relative h-24 flex-1 rounded-lg bg-s2"
              style={{ width: Math.max(60, totalPx) }}
              onDragOver={allowDrop("video")}
              onDragLeave={() => setDropHint(null)}
              onDrop={dropOn("video")}
            >
              {layout.clips.length === 0 ? (
                <div
                  className={`m-1 grid h-[88px] place-items-center rounded-md border border-dashed text-[12px] ${
                    dropHint === "video" ? "border-ac text-ac" : "border-line text-t3"
                  }`}
                >
                  Drag media here, or press + on a bin item.
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext
                    items={sequence.clips.map((c) => c.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {layout.clips.map((entry, index) => {
                      const clip = entry.clip;
                      const media = mediaFor(sequence, clip.mediaId);
                      if (!media) return null;
                      return (
                        <span key={clip.id}>
                          <ClipTile
                            clip={clip}
                            media={media}
                            entry={entry}
                            fps={fps}
                            pxPerSec={pxPerSec}
                            selected={
                              selected?.lane === "video" && selected.id === clip.id
                            }
                            onSelect={() => onSelect({ lane: "video", id: clip.id })}
                            onTrimStart={onMark}
                            onPreviewTrim={(i2, o2) =>
                              onPreviewClip(clip.id, i2, o2)
                            }
                            onCommitTrim={onCommit}
                            onResetTrim={() => onResetTrim(clip)}
                            onRemove={() => onRemoveClip(clip.id)}
                            onMove={(d) => onMoveClip(index, d)}
                          />
                          {entry.transition.type !== "cut" && (
                            <button
                              type="button"
                              aria-label={`${entry.transition.type} ${entry.transition.frames} frames`}
                              title={`${entry.transition.type} · ${entry.transition.frames}f`}
                              onClick={() =>
                                onSelect({ lane: "video", id: clip.id })
                              }
                              className={`absolute top-0 bottom-0 z-20 -translate-x-1/2 ${
                                entry.transition.type === "crossfade"
                                  ? "bg-ac/40"
                                  : ""
                              }`}
                              style={{
                                left:
                                  ((entry.recordOut - entry.transition.frames) /
                                    fps) *
                                  pxPerSec,
                                width: Math.max(
                                  8,
                                  (entry.transition.frames / fps) * pxPerSec,
                                ),
                                backgroundImage:
                                  entry.transition.type === "dip"
                                    ? HATCH
                                    : undefined,
                                borderRadius: 4,
                              }}
                            />
                          )}
                        </span>
                      );
                    })}
                  </SortableContext>
                </DndContext>
              )}
              {dropHint === "video" && layout.clips.length > 0 && (
                <div
                  className="absolute top-1 bottom-1 w-0.5 rounded-full bg-ac"
                  style={{ left: totalPx - 6 }}
                />
              )}
            </div>
          </div>

          {/* Audio lane */}
          <div className="mt-1 flex items-center gap-2">
            <span className="w-8 shrink-0 font-mono text-[10px] text-t3">A1</span>
            <div
              className="relative h-14 flex-1 rounded-lg bg-s2/60"
              style={{ width: Math.max(60, totalPx) }}
              onDragOver={allowDrop("audio")}
              onDragLeave={() => setDropHint(null)}
              onDrop={dropOn("audio")}
            >
              {sequence.audio.length === 0 && (
                <div
                  className={`m-1 grid h-12 place-items-center rounded-md border border-dashed text-[11px] ${
                    dropHint === "audio" ? "border-ac text-ac" : "border-line/60 text-t3"
                  }`}
                >
                  Drop audio here
                </div>
              )}
              {sequence.audio.map((a) => {
                const media = mediaFor(sequence, a.mediaId);
                const total = media
                  ? Math.floor(media.durationSec * fps)
                  : a.out;
                return (
                  <FreeTile
                    key={a.id}
                    id={a.id}
                    lane="audio"
                    label={media?.name ?? "Audio"}
                    sub={framesToTimecode(a.out - a.in, fps)}
                    start={a.start}
                    len={a.out - a.in}
                    inF={a.in}
                    outF={a.out}
                    total={total}
                    fps={fps}
                    pxPerSec={pxPerSec}
                    selected={selected?.lane === "audio" && selected.id === a.id}
                    onSelect={onSelect}
                    onMove={(start) => onPreviewAudio(a.id, { start })}
                    onTrim={(i2, o2) => onPreviewAudio(a.id, { in: i2, out: o2 })}
                    onCommit={onCommit}
                    onMark={onMark}
                  />
                );
              })}
            </div>
          </div>

          {/* Playhead across ruler + lanes */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 z-20"
            style={{ left: playheadX, height: 24 + 4 + 32 + 4 + 96 + 4 + 56 }}
          >
            <div
              className="absolute -top-0 left-0 -translate-x-1/2"
              style={{
                width: 0,
                height: 0,
                borderLeft: "4.5px solid transparent",
                borderRight: "4.5px solid transparent",
                borderTop: "5px solid var(--color-ac, #FF5B22)",
              }}
            />
            <div className="absolute top-0 bottom-0 left-0 w-px bg-ac" />
          </div>
        </div>
      </div>
    </div>
  );
}
