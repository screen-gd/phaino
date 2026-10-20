"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Clip, Sequence } from "@/server/sequence/model";
import { mediaFor, mediaFrames } from "@/server/sequence/model";
import { framesToTimecode, outputSize } from "@/server/sequence/timecode";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Icon, SECTION_ICONS } from "@/components/icons";
import { ExportPanel } from "./ExportPanel";
import { Inspector } from "./Inspector";
import { Timeline } from "./Timeline";
import { SequencePlayer } from "./SequencePlayer";
import { MediaBin } from "./MediaBin";
import { useSequence, type Selection } from "./useSequence";
import { useSequencePlayer } from "./useSequencePlayer";
import { layoutClips, locate } from "./stripMath";

const ASPECTS: { label: string; value: Sequence["aspect"] }[] = [
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" },
  { label: "1:1", value: "1:1" },
  { label: "4:5", value: "4:5" },
];

function Tool({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: keyof typeof SECTION_ICONS;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-7 w-7 place-items-center rounded-md text-t3 hover:bg-s2 hover:text-t1 disabled:opacity-40"
    >
      <Icon d={SECTION_ICONS[icon]} className="h-3.5 w-3.5" />
    </button>
  );
}

export function SequenceEditor() {
  const seq = useSequence();
  const sequence = seq.sequence;
  const [pxPerSec, setPxPerSec] = useState(60);
  const [selected, setSelected] = useState<Selection>(null);
  const [rightTab, setRightTab] = useState<"inspector" | "export">("export");

  const mediaMap = useMemo(
    () => new Map((sequence?.media ?? []).map((m) => [m.id, m])),
    [sequence?.media],
  );
  const player = useSequencePlayer({
    clips: sequence?.clips ?? [],
    audio: sequence?.audio ?? [],
    media: mediaMap,
    fps: sequence?.fps ?? 24,
  });
  const layout = useMemo(
    () => layoutClips(sequence?.clips ?? []),
    [sequence?.clips],
  );
  const [w, h] = sequence ? outputSize(sequence.aspect, sequence.resolution) : [1920, 1080];

  const commit = useCallback(() => {
    /* debounced PUT already scheduled by every preview edit */
  }, []);

  const select = useCallback(
    (sel: Selection) => {
      setSelected(sel);
      if (sel) setRightTab("inspector");
    },
    [],
  );

  const split = useCallback(() => {
    if (selected?.lane === "audio") {
      const newId = seq.splitAudioAt(player.frame, selected.id);
      if (newId) setSelected({ lane: "audio", id: newId });
      return;
    }
    const id = selected?.lane === "video" ? selected.id : undefined;
    const newId = seq.splitAt(player.frame, id);
    if (newId) setSelected({ lane: "video", id: newId });
  }, [player.frame, selected, seq]);

  const duplicate = useCallback(() => {
    if (selected?.lane !== "video") return;
    const newId = seq.duplicateClip(selected.id);
    if (newId) setSelected({ lane: "video", id: newId });
  }, [selected, seq]);

  const addTitle = useCallback(() => {
    const id = seq.addTitle(player.frame);
    setSelected({ lane: "title", id });
    setRightTab("inspector");
  }, [player.frame, seq]);

  const removeSel = useCallback(() => {
    seq.removeSelection(selected);
    setSelected(null);
  }, [selected, seq]);

  // Keys: JKL shuttle, space, arrows, Alt+arrows, S/Cmd+K split, Cmd+D
  // duplicate, Delete removes the selection, Cmd+Z/Shift+Z undo/redo.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) {
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        split();
      } else if (e.key.toLowerCase() === "s" && !mod) {
        e.preventDefault();
        split();
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicate();
      } else if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) seq.redo();
        else seq.undo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selected) {
          e.preventDefault();
          removeSel();
        }
      } else if (e.key === " ") {
        e.preventDefault();
        player.toggle();
      } else if (e.key.toLowerCase() === "j") {
        player.playReverse();
      } else if (e.key.toLowerCase() === "l") {
        player.playForward(true);
      } else if (e.key.toLowerCase() === "k") {
        player.pause();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        player.step(e.shiftKey ? -10 : -1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        player.step(e.shiftKey ? 10 : 1);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [player, selected, split, duplicate, removeSel, seq]);

  if (!sequence) {
    return (
      <div className="grid h-full place-items-center">
        <span className="text-[12px] text-t3">
          {seq.error ?? "Loading sequence"}
        </span>
      </div>
    );
  }

  const onDropMedia = (mediaId: string) => {
    const m = mediaFor(sequence, mediaId);
    if (!m) return;
    const total = mediaFrames(m, sequence.fps);
    if (m.kind === "audio") {
      const end = sequence.audio.reduce(
        (x, a) => Math.max(x, a.start + (a.out - a.in)),
        0,
      );
      seq.edit((s) => ({
        audio: [
          ...s.audio,
          {
            id: crypto.randomUUID(),
            mediaId,
            start: end,
            in: 0,
            out: total,
            volume: 1,
            fadeIn: 0,
            fadeOut: 0,
          },
        ],
      }));
    } else {
      const len = m.kind === "image" ? Math.min(total, 3 * sequence.fps) : total;
      seq.edit((s) => ({
        clips: [
          ...s.clips,
          {
            id: crypto.randomUUID(),
            mediaId,
            in: 0,
            out: len,
            volume: 1,
            muted: false,
            fadeIn: 0,
            fadeOut: 0,
            transition: { type: "cut" as const, frames: 0 },
          },
        ],
      }));
    }
  };

  const bin = (
    <MediaBin
      media={sequence.media}
      onAddOutput={seq.appendClip}
      onAddMedia={onDropMedia}
      onUpload={seq.uploadMedia}
      onRemoveMedia={(id) => void seq.removeMedia(id)}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-line px-3">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="text-[13px] font-semibold">Editor</h1>
          <span className="hidden font-mono text-[11px] text-t3 sm:inline">
            {sequence.fps} fps · {w}x{h} · {framesToTimecode(layout.totalFrames, sequence.fps)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex h-7 items-center rounded-lg bg-s2 p-0.5">
            {ASPECTS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => void seq.updateSettings({ aspect: a.value })}
                className={`h-6 rounded-[6px] px-2 font-mono text-[11px] transition-colors ${
                  sequence.aspect === a.value
                    ? "bg-s3 font-medium text-t1"
                    : "text-t3 hover:text-t2"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            title={sequence.fit === "contain" ? "Contain" : "Cover"}
            aria-label="Toggle contain or cover"
            onClick={() =>
              void seq.updateSettings({
                fit: sequence.fit === "contain" ? "cover" : "contain",
              })
            }
            className="flex h-7 items-center rounded-md border border-line px-2 text-[12px] text-t2 hover:bg-s2 hover:text-t1"
          >
            {sequence.fit === "contain" ? "Contain" : "Cover"}
          </button>
          <span className="mx-1 h-4 w-px bg-line" />
          <Tool
            icon="type"
            label="Add title"
            onClick={addTitle}
          />
          <Tool icon="scissors" label="Split (S)" onClick={split} />
          <Tool
            icon="undo"
            label="Undo"
            onClick={seq.undo}
            disabled={!seq.canUndo}
          />
          <Tool
            icon="redo"
            label="Redo"
            onClick={seq.redo}
            disabled={!seq.canRedo}
          />
          <Sheet>
            <SheetTrigger className="grid h-7 w-7 place-items-center rounded-md text-t3 hover:bg-s2 hover:text-t1 lg:hidden">
              <Icon d={SECTION_ICONS.video} className="h-3.5 w-3.5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0">
              {bin}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {seq.error && (
        <p className="shrink-0 px-3 pt-2 text-[12px] text-destructive">
          {seq.error}
        </p>
      )}

      {/* Columns */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_260px]">
        <div className="hidden min-h-0 border-r border-line lg:block">
          {bin}
        </div>
        <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]">
          <SequencePlayer
            videoRef={player.videoRef}
            nextRef={player.nextRef}
            audioRef={player.audioRef}
            sequence={sequence}
            frame={player.frame}
            playing={player.playing}
            onToggle={player.toggle}
            onStep={player.step}
            fps={sequence.fps}
            totalFrames={layout.totalFrames}
            currentEntry={
              layout.clips.length > 0
                ? locate(layout, Math.min(player.frame, Math.max(0, layout.totalFrames - 1))).entry
                : null
            }
            empty={sequence.clips.length === 0}
          />
          <div className="h-[240px] border-t border-line">
            <Timeline
              sequence={sequence}
              layout={layout}
              selected={selected}
              onSelect={select}
              onSeek={player.seek}
              playheadFrame={player.frame}
              pxPerSec={pxPerSec}
              onZoomChange={setPxPerSec}
              onReorder={seq.reorder}
              onMark={seq.mark}
              onPreviewClip={(id, i, o) =>
                seq.replaceClip(id, { in: i, out: o }, false)
              }
              onPreviewAudio={(id, patch) => seq.replaceAudio(id, patch, false)}
              onPreviewTitle={(id, patch) => seq.replaceTitle(id, patch, false)}
              onCommit={commit}
              onResetTrim={(clip: Clip) => {
                const m = mediaFor(sequence, clip.mediaId);
                seq.replaceClip(clip.id, {
                  in: 0,
                  out: m ? mediaFrames(m, sequence.fps) : clip.out,
                });
              }}
              onRemoveClip={seq.removeClip}
              onMoveClip={(i, d) => seq.reorder(i, i + d)}
              onDropOutput={(p) => void seq.appendClip(p)}
              onDropMedia={onDropMedia}
            />
          </div>
        </div>
        <div className="hidden min-h-0 border-l border-line lg:block">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-10 items-center gap-1 border-b border-line px-3">
              {(["inspector", "export"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setRightTab(t)}
                  className={`rounded-md px-2 py-1 text-[12px] capitalize transition-colors ${
                    rightTab === t ? "bg-s2 font-medium text-t1" : "text-t3 hover:text-t2"
                  }`}
                >
                  {t === "inspector" ? "Inspector" : "Export"}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1">
              {rightTab === "inspector" ? (
                <Inspector
                  sequence={sequence}
                  selected={selected}
                  onClip={seq.replaceClip}
                  onAudio={seq.replaceAudio}
                  onTitle={seq.replaceTitle}
                />
              ) : (
                <ExportPanel
                  sequence={sequence}
                  canExport={sequence.clips.length > 0}
                  onSettings={(patch) => void seq.updateSettings(patch)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
