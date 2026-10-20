"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { framesToTimecode } from "@/server/sequence/timecode";
import type { Clip, Media } from "@/server/sequence/model";
import type { Fps } from "@/server/sequence/timecode";
import { trimFromDrag } from "./stripMath";
import type { StripEntry } from "./stripMath";


const HATCH =
  "repeating-linear-gradient(45deg, rgba(255,91,34,0.35) 0 3px, transparent 3px 7px)";

export function clipTotal(media: Media, fps: Fps): number {
  return Math.floor(media.durationSec * fps + 1e-6);
}

export function ClipTile({
  clip,
  media,
  entry,
  fps,
  pxPerSec,
  selected,
  onSelect,
  onTrimStart,
  onPreviewTrim,
  onCommitTrim,
  onResetTrim,
  onRemove,
  onMove,
}: {
  clip: Clip;
  media: Media;
  entry: StripEntry<Clip>;
  fps: Fps;
  pxPerSec: number;
  selected: boolean;
  onSelect: () => void;
  onTrimStart: () => void;
  onPreviewTrim: (i: number, o: number) => void;
  onCommitTrim: () => void;
  onResetTrim: () => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const total = clipTotal(media, fps);
  const width = Math.max(24, ((clip.out - clip.in) / fps) * pxPerSec);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: clip.id });
  const [drag, setDrag] = useState<{
    side: "left" | "right";
    startX: number;
    startIn: number;
    startOut: number;
    pid: number;
  } | null>(null);
  const dragging = drag?.side ?? null;

  const begin = (side: "left" | "right") => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onTrimStart();
    setDrag({
      side,
      startX: e.clientX,
      startIn: clip.in,
      startOut: clip.out,
      pid: e.pointerId,
    });
    onSelect();
  };

  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    const t = trimFromDrag({
      side: drag.side,
      startIn: drag.startIn,
      startOut: drag.startOut,
      dxPx: e.clientX - drag.startX,
      pxPerSec,
      fps,
      total,
      shift: e.shiftKey,
    });
    onPreviewTrim(t.in, t.out);
  };

  const end = (e: React.PointerEvent) => {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    (e.target as HTMLElement).releasePointerCapture?.(d.pid);
    if (d.startIn !== clip.in || d.startOut !== clip.out) onCommitTrim();
  };

  const ghostLeft =
    dragging === "left" ? (clip.in / fps) * pxPerSec : 0;
  const ghostRight =
    dragging === "right" ? ((total - clip.out) / fps) * pxPerSec : 0;

  return (
    <div
      ref={setNodeRef}
      style={{
        left: (entry.recordIn / fps) * pxPerSec,
        width,
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: dragging ? 20 : isDragging ? 30 : undefined,
      }}
      className="group/tile absolute top-1 bottom-1"
    >
      {/* trim ghosts: the trimmed-off source while dragging */}
      {ghostLeft > 0 && (
        <div
          className="pointer-events-none absolute top-0 bottom-0 rounded-l-lg opacity-70"
          style={{
            right: "100%",
            width: ghostLeft,
            backgroundImage: HATCH,
            backgroundColor: "rgb(255 255 255 / 0.08)",
          }}
        />
      )}
      {ghostRight > 0 && (
        <div
          className="pointer-events-none absolute top-0 bottom-0 rounded-r-lg opacity-70"
          style={{
            left: "100%",
            width: ghostRight,
            backgroundImage: HATCH,
            backgroundColor: "rgb(255 255 255 / 0.08)",
          }}
        />
      )}
      <button
        type="button"
        data-clip-tile
        {...attributes}
        {...listeners}
        onClick={onSelect}
        onFocus={onSelect}
        onDoubleClick={onResetTrim}
        onKeyDown={(e) => {
          if (e.altKey && e.key === "ArrowLeft") {
            e.preventDefault();
            e.stopPropagation();
            onMove(-1);
          } else if (e.altKey && e.key === "ArrowRight") {
            e.preventDefault();
            e.stopPropagation();
            onMove(1);
          } else if (e.key === "Delete" || e.key === "Backspace") {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }
        }}
        className={`relative block h-full w-full cursor-grab overflow-hidden rounded-lg border text-left ${
          selected ? "ring-2 ring-ac border-ac" : "border-line"
        } ${isDragging ? "opacity-60" : ""}`}
        aria-label={`Clip ${media.name}`}
      >
        {media.kind === "image" ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`/api/sequence/media/${media.id}`}
            alt=""
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`/api/sequence/posters/${media.id}`}
            alt=""
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        )}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
        {/* rest-state hatch where the source is trimmed */}
        {clip.in > 0 && (
          <span
            className="pointer-events-none absolute top-0 bottom-0 left-0 w-1"
            style={{ backgroundImage: HATCH }}
          />
        )}
        {clip.out < total && (
          <span
            className="pointer-events-none absolute top-0 bottom-0 right-0 w-1"
            style={{ backgroundImage: HATCH }}
          />
        )}
        <span className="pointer-events-none absolute inset-x-2 bottom-1.5 flex items-end justify-between gap-1">
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-t1">
            {media.name}
            {clip.muted ? " · muted" : ""}
          </span>
          <span className="font-mono text-[11px] text-t3">
            {framesToTimecode(clip.out - clip.in, fps)}
          </span>
        </span>
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Remove ${media.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={`absolute top-1 right-1 z-10 h-5 w-5 place-items-center rounded bg-black/60 text-[13px] leading-none text-t1 hover:bg-black/90 ${
          selected ? "grid" : "hidden group-hover/tile:grid"
        }`}
      >
        ×
      </button>
      {/* trim handles */}
      <div
        role="presentation"
        onPointerDown={begin("left")}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="group/l absolute top-0 bottom-0 -left-1 w-2 cursor-ew-resize touch-none"
      >
        <span
          className={`absolute top-1 bottom-1 left-0.5 w-[3px] rounded-full bg-ac ${
            selected || dragging === "left" ? "" : "opacity-0 group-hover/l:opacity-100"
          }`}
        />
      </div>
      <div
        role="presentation"
        onPointerDown={begin("right")}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="group/r absolute top-0 bottom-0 -right-1 w-2 cursor-ew-resize touch-none"
      >
        <span
          className={`absolute top-1 bottom-1 right-0.5 w-[3px] rounded-full bg-ac ${
            selected || dragging === "right" ? "" : "opacity-0 group-hover/r:opacity-100"
          }`}
        />
      </div>
    </div>
  );
}
