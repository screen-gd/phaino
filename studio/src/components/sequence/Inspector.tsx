"use client";

import type {
  AudioClip,
  Clip,
  Sequence,
  Title,
} from "@/server/sequence/model";
import { mediaFor } from "@/server/sequence/model";
import { framesToTimecode } from "@/server/sequence/timecode";
import type { Selection } from "./useSequence";

const TRANSITION_LENGTHS = [0, 6, 12, 24] as const;

function Seg<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex h-7 items-center rounded-lg bg-s2 p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={`h-6 rounded-[6px] px-2 text-[12px] transition-colors ${
            o.value === value
              ? "bg-s3 font-medium text-t1"
              : "text-t3 hover:text-t2"
          } disabled:opacity-50`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5">
      <span className="shrink-0 text-[12px] text-t2">{label}</span>
      {children}
    </div>
  );
}

function Volume({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="range"
      min={0}
      max={2}
      step={0.05}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-28 accent-[#FF5B22]"
      aria-label="Volume"
    />
  );
}

function Fades({
  len,
  fadeIn,
  fadeOut,
  onChange,
}: {
  len: number;
  fadeIn: number;
  fadeOut: number;
  onChange: (patch: { fadeIn?: number; fadeOut?: number }) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Seg<number>
        options={TRANSITION_LENGTHS.map((n) => ({ label: String(n), value: n }))}
        value={fadeIn}
        onChange={(fadeIn) => onChange({ fadeIn: Math.min(fadeIn, len - 1) })}
      />
      <Seg<number>
        options={TRANSITION_LENGTHS.map((n) => ({ label: String(n), value: n }))}
        value={fadeOut}
        onChange={(fadeOut) => onChange({ fadeOut: Math.min(fadeOut, len - 1) })}
      />
    </div>
  );
}

/** The right-rail inspector for the selected clip, audio clip or title. */
export function Inspector({
  sequence,
  selected,
  onClip,
  onAudio,
  onTitle,
}: {
  sequence: Sequence;
  selected: Selection;
  onClip: (id: string, patch: Partial<Clip>) => void;
  onAudio: (id: string, patch: Partial<AudioClip>) => void;
  onTitle: (id: string, patch: Partial<Title>) => void;
}) {
  let body: React.ReactNode = (
    <p className="px-3 pt-3 text-[12px] text-t3">
      Select a clip, audio clip or title.
    </p>
  );

  if (selected?.lane === "video") {
    const clip = sequence.clips.find((c) => c.id === selected.id);
    const media = clip ? mediaFor(sequence, clip.mediaId) : undefined;
    if (clip && media) {
      const len = clip.out - clip.in;
      const maxTrans = Math.floor(len / 2);
      body = (
        <>
          <Row label={media.name}>
            <span className="font-mono text-[11px] text-t3">
              {framesToTimecode(len, sequence.fps)}
            </span>
          </Row>
          <Row label="Volume">
            <Volume
              value={clip.muted ? 0 : clip.volume}
              onChange={(v) => onClip(clip.id, { volume: v, muted: v === 0 })}
            />
          </Row>
          <Row label="Muted">
            <input
              type="checkbox"
              checked={clip.muted}
              onChange={(e) => onClip(clip.id, { muted: e.target.checked })}
              aria-label="Mute clip audio"
              className="h-4 w-4 accent-[#FF5B22]"
            />
          </Row>
          <Row label="Fade in/out">
            <Fades
              len={len}
              fadeIn={clip.fadeIn}
              fadeOut={clip.fadeOut}
              onChange={(p) => onClip(clip.id, p)}
            />
          </Row>
          <Row label="Transition">
            <Seg<Clip["transition"]["type"]>
              options={[
                { label: "Cut", value: "cut" },
                { label: "Dissolve", value: "crossfade" },
                { label: "Dip", value: "dip" },
              ]}
              value={clip.transition.type}
              onChange={(type) =>
                onClip(clip.id, {
                  transition: {
                    type,
                    frames: type === "cut" ? 0 : clip.transition.frames || 12,
                  },
                })
              }
            />
          </Row>
          {clip.transition.type !== "cut" && (
            <Row label="Frames">
              <Seg<number>
                options={TRANSITION_LENGTHS.filter((n) => n > 0).map((n) => ({
                  label: String(n),
                  value: n,
                }))}
                value={
                  TRANSITION_LENGTHS.includes(
                    clip.transition.frames as (typeof TRANSITION_LENGTHS)[number],
                  )
                    ? clip.transition.frames
                    : 12
                }
                onChange={(frames) =>
                  onClip(clip.id, {
                    transition: { ...clip.transition, frames: Math.min(frames, maxTrans) },
                  })
                }
              />
            </Row>
          )}
        </>
      );
    }
  } else if (selected?.lane === "audio") {
    const clip = sequence.audio.find((a) => a.id === selected.id);
    const media = clip ? mediaFor(sequence, clip.mediaId) : undefined;
    if (clip && media) {
      const len = clip.out - clip.in;
      body = (
        <>
          <Row label={media.name}>
            <span className="font-mono text-[11px] text-t3">
              {framesToTimecode(len, sequence.fps)}
            </span>
          </Row>
          <Row label="Volume">
            <Volume
              value={clip.volume}
              onChange={(v) => onAudio(clip.id, { volume: v })}
            />
          </Row>
          <Row label="Fade in/out">
            <Fades
              len={len}
              fadeIn={clip.fadeIn}
              fadeOut={clip.fadeOut}
              onChange={(p) => onAudio(clip.id, p)}
            />
          </Row>
        </>
      );
    }
  } else if (selected?.lane === "title") {
    const title = sequence.titles.find((t) => t.id === selected.id);
    if (title) {
      body = (
        <>
          <div className="px-3 py-1.5">
            <input
              type="text"
              value={title.text}
              maxLength={200}
              onChange={(e) =>
                e.target.value.trim() !== "" &&
                onTitle(title.id, { text: e.target.value })
              }
              aria-label="Title text"
              className="h-8 w-full rounded-md border border-line bg-s2 px-2 text-[13px] text-t1 outline-none focus:border-ac"
            />
          </div>
          <Row label="Position">
            <Seg<Title["position"]>
              options={[
                { label: "Top", value: "top" },
                { label: "Center", value: "center" },
                { label: "Lower", value: "lower" },
              ]}
              value={title.position}
              onChange={(position) => onTitle(title.id, { position })}
            />
          </Row>
          <Row label="Size">
            <Seg<Title["size"]>
              options={[
                { label: "S", value: "s" },
                { label: "M", value: "m" },
                { label: "L", value: "l" },
              ]}
              value={title.size}
              onChange={(size) => onTitle(title.id, { size })}
            />
          </Row>
          <Row label="Duration">
            <input
              type="number"
              min={0.5}
              max={60}
              step={0.5}
              value={Number((title.duration / sequence.fps).toFixed(1))}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v > 0) {
                  onTitle(title.id, {
                    duration: Math.max(1, Math.round(v * sequence.fps)),
                  });
                }
              }}
              aria-label="Title duration in seconds"
              className="h-7 w-16 rounded-md border border-line bg-s2 px-2 font-mono text-[11px] text-t1 outline-none focus:border-ac"
            />
          </Row>
        </>
      );
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto py-1.5">{body}</div>
    </div>
  );
}
