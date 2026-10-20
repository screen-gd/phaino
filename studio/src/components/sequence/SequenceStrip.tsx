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
import type { Sequence, Clip } from "@/server/sequence/model";
import type { Fps } from "@/server/sequence/timecode";
import { OUTPUT_MIME } from "./ClipDrawer";
import { ClipTile } from "./ClipTile";
import { frameAtX, nextZoomToFit, tickStep, type StripLayout } from "./stripMath";
import { Icon, SECTION_ICONS } from "@/components/icons";
import { Slider } from "@/components/ui/slider";

/** Left inset for the ruler and lane, so the first label isn't clipped. */
const EDGE = 12;

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

export function SequenceStrip({
  sequence,
  layout,
  selectedId,
  onSelect,
  onSeek,
  playheadFrame,
  pxPerSec,
  onZoomChange,
  onReorder,
  onTrimStart,
  onPreviewTrim,
  onCommitTrim,
  onResetTrim,
  onRemove,
  onMoveClip,
  onDropOutput,
}: {
  sequence: Sequence;
  layout: StripLayout<Clip>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSeek: (frame: number) => void;
  playheadFrame: number;
  pxPerSec: number;
  onZoomChange: (v: number) => void;
  onReorder: (from: number, to: number) => void;
  onTrimStart: () => void;
  onPreviewTrim: (id: string, i: number, o: number) => void;
  onCommitTrim: (clips: Clip[]) => void;
  onResetTrim: (clip: Clip) => void;
  onRemove: (id: string) => void;
  onMoveClip: (index: number, dir: -1 | 1) => void;
  onDropOutput: (path: string) => void;
}) {
  const fps = sequence.fps;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dropHint, setDropHint] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const totalPx = (layout.totalFrames / fps) * pxPerSec;

  const seekFromX = (e: React.PointerEvent) => {
    // Only seek on the ruler or the empty lane, not on a tile.
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

  // Absolute children sit inside the padding box: left:0 is already past EDGE.
  const playheadX = (playheadFrame / fps) * pxPerSec;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex h-9 items-center justify-between gap-2 px-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="font-mono text-[11px] font-medium text-t2">V1</span>
          <span className="hidden truncate text-[11px] text-t3 sm:inline">
            Alt+←/→ move · Shift snaps to 1s · Double-click resets
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

      {/* Ruler + lane */}
      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2"
        onPointerDown={seekFromX}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(OUTPUT_MIME)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            setDropHint(true);
          }
        }}
        onDragLeave={() => setDropHint(false)}
        onDrop={(e) => {
          const p = e.dataTransfer.getData(OUTPUT_MIME);
          setDropHint(false);
          if (p) {
            e.preventDefault();
            onDropOutput(p);
          }
        }}
      >
        <div className="relative w-max min-w-full pl-3 pr-3">
          <Ruler totalFrames={layout.totalFrames} fps={fps} pxPerSec={pxPerSec} />

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={sequence.clips.map((c) => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div
                className="relative h-24 rounded-lg bg-s2"
                style={{ width: Math.max(0, totalPx) }}
              >
                {layout.clips.length === 0 ? (
                  <div
                    className={`m-1 grid h-[88px] place-items-center rounded-md border border-dashed text-[12px] ${
                      dropHint
                        ? "border-ac text-ac"
                        : "border-line text-t3"
                    }`}
                  >
                    Drag clips here, or press + on a clip.
                  </div>
                ) : (
                  layout.clips.map((entry, index) => {
                    const clip = entry.clip;
                    return (
                      <ClipTile
                        key={clip.id}
                        clip={clip}
                        entry={entry}
                        fps={fps}
                        pxPerSec={pxPerSec}
                        selected={clip.id === selectedId}
                        onSelect={() => onSelect(clip.id)}
                        onTrimStart={onTrimStart}
                        onPreviewTrim={(i2, o2) => onPreviewTrim(clip.id, i2, o2)}
                        onCommitTrim={() => onCommitTrim(sequence.clips)}
                        onResetTrim={() => onResetTrim(clip)}
                        onRemove={() => onRemove(clip.id)}
                        onMove={(d) => onMoveClip(index, d)}
                      />
                    );
                  })
                )}
                {dropHint && layout.clips.length > 0 && (
                  <div
                    className="absolute top-1 bottom-1 w-0.5 rounded-full bg-ac"
                    style={{ left: totalPx - 6 }}
                  />
                )}
              </div>
            </SortableContext>
          </DndContext>

          {/* Playhead across ruler + lane */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 z-20"
            style={{ left: playheadX, height: 24 + 96 }}
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
