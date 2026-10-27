"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  clampZoom,
  followScroll,
  frameAtX,
  MAX_ZOOM,
  MIN_ZOOM,
  moveFromDrag,
  nextZoomToFit,
  tickStep,
  trimFromDrag,
  zoomAnchorScroll,
  type StripLayout,
} from "./stripMath";
import { Icon, SECTION_ICONS } from "@/components/icons";
import { Slider } from "@/components/ui/slider";

/** Width of the sticky lane-label column. */
const HEADER_W = 48;
const HATCH =
  "repeating-linear-gradient(45deg, rgba(255,91,34,0.35) 0 3px, transparent 3px 7px)";

/** Ruler ticks spanning the whole track: labeled majors, 1/5-step minors. */
function Ruler({
  widthPx,
  totalFrames,
  fps,
  pxPerSec,
}: {
  widthPx: number;
  totalFrames: number;
  fps: Fps;
  pxPerSec: number;
}) {
  const endSec = Math.max(totalFrames / fps, widthPx / pxPerSec);
  const step = tickStep(pxPerSec);
  const labels: number[] = [];
  for (let t = 0; t <= endSec + 1e-6; t += step) labels.push(t);
  const minor = step / 5;
  const minors: number[] = [];
  if (minor * pxPerSec >= 8) {
    for (let t = minor; t <= endSec + 1e-6; t += minor) {
      if (Math.abs(t / step - Math.round(t / step)) > 1e-6) minors.push(t);
    }
  }
  return (
    <div className="relative h-6 select-none" style={{ width: widthPx }}>
      {minors.map((t) => (
        <span
          key={t}
          className="absolute bottom-0 h-1 w-px bg-line"
          style={{ left: t * pxPerSec }}
        />
      ))}
      {labels.map((t) => (
        <span
          key={t}
          className="absolute top-0 bottom-0"
          style={{ left: t * pxPerSec }}
        >
          <span className="absolute bottom-0 h-2 w-px bg-line" />
          <span
            className={`absolute top-0.5 font-mono text-[11px] text-t3 ${
              t === 0 ? "left-[6px]" : "w-16 -translate-x-1/2 text-center"
            }`}
          >
            {`${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`}
          </span>
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
  /** Right-edge trim bound (audio media total; 1e9 for titles). */
  total: number;
  fps: Fps;
  pxPerSec: number;
  selected: boolean;
  onSelect: (sel: Selection) => void;
  onMove: (start: number) => void;
  /** in/out are source (or record) trim points; start is the record start. */
  onTrim: (t: { in: number; out: number; start: number }) => void;
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
    e.currentTarget.setPointerCapture(e.pointerId);
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
      if (drag.mode === "left") {
        // The left edge carries the record start so the tail stays put.
        let start = drag.start + (t.in - drag.inF);
        let i = t.in;
        if (start < 0) {
          start = 0;
          i = drag.inF - drag.start;
        }
        onTrim({ in: i, out: t.out, start });
      } else {
        onTrim({ in: t.in, out: t.out, start: drag.start });
      }
    }
  };

  const end = (e: React.PointerEvent) => {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    if (e.currentTarget.hasPointerCapture(d.pid)) {
      e.currentTarget.releasePointerCapture(d.pid);
    }
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
        selected ? "border-ac" : "border-line"
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
  playing,
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
  playing: boolean;
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
  onDropMedia: (drop: { mediaId: string; frame: number }) => void;
}) {
  const fps = sequence.fps;
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [viewW, setViewW] = useState(0);
  const [dropHint, setDropHint] = useState<{
    lane: "video" | "audio";
    x: number;
  } | null>(null);
  const scrubPid = useRef<number | null>(null);
  const userZoomed = useRef(false);
  const autoFitted = useRef(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const totalPx = (layout.totalFrames / fps) * pxPerSec;
  const playheadX = (playheadFrame / fps) * pxPerSec;
  // The track always covers the view so the ruler never runs short, plus
  // some end room for scrubs and drops past the last clip.
  const trackPx = Math.max(totalPx, viewW - HEADER_W) + HEADER_W;

  // Measure the visible width for the track and fit calculations.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewW(el.clientWidth));
    ro.observe(el);
    setViewW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  /** Zoom clamped to the slider range, anchored on a frame or the playhead. */
  const zoomTo = useCallback(
    (next: number, anchor?: { frame: number; screenX: number }) => {
      const clamped = clampZoom(next);
      userZoomed.current = true;
      if (clamped === pxPerSec) return;
      const el = scrollRef.current;
      const a = anchor ?? {
        frame: playheadFrame,
        screenX: el ? playheadX - el.scrollLeft : 0,
      };
      if (el) {
        const sl = zoomAnchorScroll({
          anchorFrame: a.frame,
          anchorScreenX: a.screenX,
          fps,
          nextPxPerSec: clamped,
        });
        // Applied after React commits the new track width, before paint.
        requestAnimationFrame(() => {
          el.scrollLeft = sl;
        });
      }
      onZoomChange(clamped);
    },
    [pxPerSec, fps, playheadFrame, playheadX, onZoomChange],
  );

  // Latest zoom values for the native wheel listener (bound once).
  const zoomRef = useRef({ zoomTo, pxPerSec, fps });
  useEffect(() => {
    zoomRef.current = { zoomTo, pxPerSec, fps };
  });

  // Ctrl/Cmd + wheel zooms anchored at the pointer. React's onWheel is
  // passive, so this needs a native non-passive listener to preventDefault.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const track = trackRef.current;
        if (!track) return;
        e.preventDefault();
        const { zoomTo: zoom, pxPerSec: pps, fps: f } = zoomRef.current;
        const frame = Math.max(
          0,
          ((e.clientX - track.getBoundingClientRect().left) / pps) * f,
        );
        zoom(pps * (e.deltaY < 0 ? 1.2 : 1 / 1.2), {
          frame,
          screenX:
            e.clientX - el.getBoundingClientRect().left - HEADER_W,
        });
        return;
      }
      // A plain vertical wheel scrolls the timeline sideways.
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Follow the playhead while it leaves the visible track area.
  useEffect(() => {
    if (!playing) return;
    const el = scrollRef.current;
    if (!el) return;
    const next = followScroll({
      playheadX,
      scrollLeft: el.scrollLeft,
      viewWidth: el.clientWidth,
      margin: HEADER_W,
    });
    if (next !== null) el.scrollLeft = next;
  }, [playheadX, playing]);

  // Auto-fit once, when the sequence first has clips and before the user
  // touches a zoom control.
  useEffect(() => {
    if (autoFitted.current || userZoomed.current) return;
    if (layout.clips.length === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    autoFitted.current = true;
    onZoomChange(
      nextZoomToFit(layout.totalFrames, fps, el.clientWidth - HEADER_W),
    );
  }, [layout.clips.length, layout.totalFrames, fps, onZoomChange]);

  const seekFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const x = clientX - track.getBoundingClientRect().left;
    onSeek(frameAtX(x, pxPerSec, fps, layout.totalFrames));
  };

  // Scrub: press on the ruler, the playhead head or empty track seeks, then
  // pointer capture keeps seeking until release.
  const onScrubDown = (e: React.PointerEvent) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("[data-clip-tile], button, input, a")) return;
    e.preventDefault();
    scrubPid.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromClientX(e.clientX);
  };
  const onScrubMove = (e: React.PointerEvent) => {
    if (scrubPid.current !== e.pointerId) return;
    seekFromClientX(e.clientX);
  };
  const onScrubUp = (e: React.PointerEvent) => {
    if (scrubPid.current !== e.pointerId) return;
    scrubPid.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
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
      const track = trackRef.current;
      const frame = track
        ? Math.max(
            0,
            Math.floor(
              ((e.clientX - track.getBoundingClientRect().left) / pxPerSec) *
                fps,
            ),
          )
        : 0;
      onDropMedia({ mediaId, frame });
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
      const track = trackRef.current;
      if (track) {
        setDropHint({
          lane,
          x: e.clientX - track.getBoundingClientRect().left,
        });
      }
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 px-3">
        <span className="font-mono text-[11px] text-t2">
          {framesToTimecode(playheadFrame, fps)}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => zoomTo(pxPerSec / 1.5)}
            className="grid h-7 w-7 place-items-center rounded-md text-t3 hover:bg-s2 hover:text-t1"
          >
            <Icon d={SECTION_ICONS.minus} className="h-3.5 w-3.5" />
          </button>
          <Slider
            aria-label="Zoom"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={1}
            value={[pxPerSec]}
            onValueChange={(v) => {
              const val = Array.isArray(v) ? v[0] : v;
              if (typeof val === "number") zoomTo(val);
            }}
            className="w-[120px]"
          />
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => zoomTo(pxPerSec * 1.5)}
            className="grid h-7 w-7 place-items-center rounded-md text-t3 hover:bg-s2 hover:text-t1"
          >
            <Icon d={SECTION_ICONS.plus} className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              userZoomed.current = true;
              const el = scrollRef.current;
              if (el) {
                requestAnimationFrame(() => {
                  el.scrollLeft = 0;
                });
              }
              onZoomChange(
                nextZoomToFit(
                  layout.totalFrames,
                  fps,
                  (el?.clientWidth ?? 800) - HEADER_W,
                ),
              );
            }}
            className="rounded-md px-2 py-1 text-[12px] text-t3 hover:bg-s2 hover:text-t1"
          >
            Fit
          </button>
        </div>
      </div>

      {/* Scroll area: sticky lane labels + one shared-origin track. */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <div className="flex min-h-full w-max min-w-full">
          <div className="sticky left-0 z-40 w-12 shrink-0 border-r border-line bg-bg">
            <div className="h-6" />
            <div className="mt-1 flex h-7 items-center justify-center font-mono text-[10px] text-t3">
              T
            </div>
            <div className="mt-1 flex h-16 items-center justify-center font-mono text-[10px] text-t3">
              V1
            </div>
            <div className="mt-1 flex h-10 items-center justify-center font-mono text-[10px] text-t3">
              A1
            </div>
          </div>

          {/* Track: ruler + lanes + playhead all share x = 0 = frame 0. */}
          <div
            ref={trackRef}
            className="relative flex-none pr-6"
            style={{ width: trackPx }}
            onPointerDown={onScrubDown}
            onPointerMove={onScrubMove}
            onPointerUp={onScrubUp}
            onPointerCancel={onScrubUp}
          >
            <div className="sticky top-0 z-20 h-6 bg-bg">
              <Ruler
                widthPx={trackPx}
                totalFrames={layout.totalFrames}
                fps={fps}
                pxPerSec={pxPerSec}
              />
            </div>

            {/* Titles lane */}
            <div className="relative mt-1 h-7 rounded-md bg-s2/60">
              {sequence.titles.map((t) => (
                <FreeTile
                  key={t.id}
                  id={t.id}
                  lane="title"
                  label={t.text}
                  sub={framesToTimecode(t.duration, fps)}
                  start={t.start}
                  len={t.duration}
                  inF={t.start}
                  outF={t.start + t.duration}
                  total={1e9}
                  fps={fps}
                  pxPerSec={pxPerSec}
                  selected={selected?.lane === "title" && selected.id === t.id}
                  onSelect={onSelect}
                  onMove={(start) => onPreviewTitle(t.id, { start })}
                  onTrim={(tr) =>
                    onPreviewTitle(t.id, {
                      start: tr.start,
                      duration: Math.max(1, tr.out - tr.in),
                    })
                  }
                  onCommit={onCommit}
                  onMark={onMark}
                />
              ))}
            </div>

            {/* Video lane */}
            <div
              className="relative mt-1 h-16 rounded-lg bg-s2"
              onDragOver={allowDrop("video")}
              onDragLeave={() => setDropHint(null)}
              onDrop={dropOn("video")}
            >
              {layout.clips.length === 0 ? (
                <div
                  className={`absolute inset-1 grid place-items-center rounded-md border border-dashed text-[12px] ${
                    dropHint?.lane === "video"
                      ? "border-ac text-ac"
                      : "border-line text-t3"
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
                              className={`absolute top-0 bottom-0 z-20 ${
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
                                  6,
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
              {dropHint?.lane === "video" && (
                <div
                  className="pointer-events-none absolute top-1 bottom-1 w-0.5 rounded-full bg-ac"
                  style={{ left: dropHint.x }}
                />
              )}
            </div>

            {/* Audio lane */}
            <div
              className="relative mt-1 h-10 rounded-md bg-s2/60"
              onDragOver={allowDrop("audio")}
              onDragLeave={() => setDropHint(null)}
              onDrop={dropOn("audio")}
            >
              {sequence.audio.length === 0 && (
                <div
                  className={`absolute inset-1 grid place-items-center rounded-md border border-dashed text-[11px] ${
                    dropHint?.lane === "audio"
                      ? "border-ac text-ac"
                      : "border-line/60 text-t3"
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
                    onTrim={(tr) =>
                      onPreviewAudio(a.id, {
                        in: tr.in,
                        out: tr.out,
                        start: tr.start,
                      })
                    }
                    onCommit={onCommit}
                    onMark={onMark}
                  />
                );
              })}
              {dropHint?.lane === "audio" && (
                <div
                  className="pointer-events-none absolute top-1 bottom-1 w-0.5 rounded-full bg-ac"
                  style={{ left: dropHint.x }}
                />
              )}
            </div>

            {/* Playhead across the ruler and all lanes. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 bottom-0 z-30"
              style={{ left: playheadX }}
            >
              <div
                className="absolute top-0 left-0 -translate-x-1/2"
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
    </div>
  );
}
