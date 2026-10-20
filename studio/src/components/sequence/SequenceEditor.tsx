"use client";

import { useCallback, useMemo, useState } from "react";
import { RESOLUTIONS, framesToTimecode } from "@/server/sequence/timecode";
import type { Clip } from "@/server/sequence/model";
import { ClipDrawer } from "./ClipDrawer";
import { ExportPanel } from "./ExportPanel";
import { SequencePlayer } from "./SequencePlayer";
import { SequenceStrip } from "./SequenceStrip";
import { locate } from "./stripMath";
import { useSequence } from "./useSequence";
import { useSequencePlayer } from "./useSequencePlayer";
import { Icon, SECTION_ICONS } from "@/components/icons";
import {
  Sheet,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * The /export sequence editor: one surface, divided by 1px lines.
 * lg: bin | player + strip | export rail. Below lg: bin moves into a Sheet,
 * the export rail stacks under the strip.
 */
export function SequenceEditor() {
  const {
    sequence,
    layout,
    error,
    commitClips,
    beginTrim,
    previewTrim,
    reorder,
    removeClip,
    appendClip,
    updateSettings,
    undo,
    canUndo,
  } = useSequence();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [binOpen, setBinOpen] = useState(false);
  const [pxPerSec, setPxPerSec] = useState(48);
  const player = useSequencePlayer({
    clips: sequence?.clips ?? [],
    fps: sequence?.fps ?? 24,
  });

  const clips = useMemo(() => sequence?.clips ?? [], [sequence]);
  const empty = clips.length === 0;
  const fps = sequence?.fps ?? 24;
  // The selection stays valid across clip list changes.
  const selId =
    selectedId && clips.some((c) => c.id === selectedId) ? selectedId : null;

  const seek = player.seek;
  const onSelect = useCallback(
    (id: string) => setSelectedId((cur) => (cur === id ? cur : id)),
    [],
  );

  const moveClip = useCallback(
    (index: number, dir: -1 | 1) => {
      const next = [...clips];
      const j = index + dir;
      if (j < 0 || j >= next.length) return;
      const [c] = next.splice(index, 1);
      next.splice(j, 0, c);
      commitClips(next);
    },
    [clips, commitClips],
  );

  const resetTrim = useCallback(
    (clip: Clip) => {
      const total = Math.floor(clip.durationSec * fps + 1e-6);
      commitClips(clips.map((c) => (c.id === clip.id ? { ...c, in: 0, out: total } : c)));
    },
    [clips, commitClips, fps],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      const selIndex = clips.findIndex((c) => c.id === selId);
      switch (e.key) {
        case " ":
          e.preventDefault();
          player.toggle();
          break;
        case "k":
          player.pause();
          player.reset();
          break;
        case "l":
          player.playForward(true);
          break;
        case "j":
          player.playReverse();
          break;
        case "ArrowLeft":
          if (e.altKey && selIndex >= 0) {
            e.preventDefault();
            moveClip(selIndex, -1);
          } else {
            e.preventDefault();
            player.step(-1);
          }
          break;
        case "ArrowRight":
          if (e.altKey && selIndex >= 0) {
            e.preventDefault();
            moveClip(selIndex, 1);
          } else {
            e.preventDefault();
            player.step(1);
          }
          break;
        case "Delete":
        case "Backspace":
          if (selIndex >= 0) {
            e.preventDefault();
            void removeClip(clips[selIndex].id);
          }
          break;
      }
    },
    [clips, selId, player, undo, moveClip, removeClip],
  );

  const currentEntry = layout.clips.length
    ? locate(layout, Math.min(player.frame, layout.totalFrames - 1))
    : null;
  const [w, h] = RESOLUTIONS[sequence?.resolution ?? "1080p"];
  const totalTc = framesToTimecode(layout.totalFrames, fps);

  const addOutput = useCallback(
    async (path: string) => appendClip(path),
    [appendClip],
  );

  return (
    <div
      role="application"
      aria-label="Sequence editor"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="h-full p-3 outline-none"
    >
      <div className="grid h-full grid-rows-[44px_minmax(0,1fr)_auto_auto] overflow-hidden rounded-panel border border-line bg-s1 max-lg:overflow-y-auto lg:grid-cols-[264px_minmax(0,1fr)_300px] lg:grid-rows-[44px_minmax(0,1fr)_212px]">
        {/* Toolbar */}
        <div className="col-span-full flex h-11 items-center justify-between gap-3 border-b border-line px-3 max-lg:shrink-0">
          <div className="flex min-w-0 items-baseline gap-3">
            <h2 className="text-[14px] font-semibold">Sequence</h2>
            <span className="truncate font-mono text-[11px] text-t3">
              {fps} fps · {w}x{h} · {totalTc}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Undo"
              title="Undo (Ctrl+Z)"
              disabled={!canUndo}
              onClick={undo}
              className="grid h-7 w-7 place-items-center rounded-md text-t2 hover:bg-s2 hover:text-t1 disabled:opacity-40"
            >
              <Icon d={SECTION_ICONS.undo} className="h-4 w-4" />
            </button>
            <span className="text-[11px] text-t3">
              {clips.length} clip{clips.length === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={() => setBinOpen(true)}
              className="ml-1 rounded-md border border-line px-2 py-1 text-[12px] text-t2 hover:bg-s2 lg:hidden"
            >
              Clips
            </button>
          </div>
        </div>

        {/* Clips bin (lg) */}
        <aside className="hidden min-h-0 border-r border-line lg:col-start-1 lg:row-start-2 lg:row-span-2 lg:block">
          <ClipDrawer onAdd={addOutput} />
        </aside>

        {/* Player stage + transport */}
        <div className="min-h-0 max-lg:shrink-0 lg:col-start-2 lg:row-start-2 max-lg:h-[46vh]">
          {sequence ? (
            <SequencePlayer
              videoRef={player.videoRef}
              hiddenRef={player.hiddenRef}
              frame={player.frame}
              playing={player.playing}
              onToggle={player.toggle}
              onStep={player.step}
              fps={fps}
              totalFrames={layout.totalFrames}
              currentEntry={currentEntry?.entry ?? null}
              empty={empty}
            />
          ) : (
            <div className="grid h-full place-items-center text-[12px] text-t3">
              {error ?? "Loading sequence…"}
            </div>
          )}
        </div>

        {/* Timeline, centre column only */}
        <div className="min-h-0 border-t border-line max-lg:shrink-0 max-lg:h-[212px] lg:col-start-2 lg:row-start-3">
          {sequence && (
            <SequenceStrip
              sequence={sequence}
              layout={layout}
              selectedId={selId}
              onSelect={onSelect}
              onSeek={seek}
              playheadFrame={player.frame}
              pxPerSec={pxPerSec}
              onZoomChange={setPxPerSec}
              onReorder={reorder}
              onTrimStart={beginTrim}
              onPreviewTrim={previewTrim}
              onCommitTrim={(next) => commitClips(next, { snapshot: false })}
              onResetTrim={resetTrim}
              onRemove={(id) => {
                if (id === selectedId) setSelectedId(null);
                void removeClip(id);
              }}
              onMoveClip={moveClip}
              onDropOutput={(p) => void appendClip(p)}
            />
          )}
        </div>

        {/* Export rail */}
        <aside className="min-h-0 border-t border-line max-lg:shrink-0 lg:col-start-3 lg:row-start-2 lg:row-span-2 lg:border-l lg:border-t-0 max-lg:min-h-[320px]">
          {sequence && (
            <ExportPanel
              sequence={sequence}
              canExport={!empty}
              onSettings={updateSettings}
            />
          )}
        </aside>
      </div>

      {/* Bin in a Sheet below lg */}
      <Sheet open={binOpen} onOpenChange={setBinOpen}>
        <SheetPopup side="left" className="w-[300px] max-w-[85vw]">
          <SheetHeader>
            <SheetTitle className="text-base">Clips</SheetTitle>
          </SheetHeader>
          <SheetPanel className="px-3">
            <ClipDrawer onAdd={addOutput} />
          </SheetPanel>
        </SheetPopup>
      </Sheet>
    </div>
  );
}

