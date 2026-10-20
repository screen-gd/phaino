"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon, SECTION_ICONS } from "@/components/icons";

type OutputItem = { relPath: string; name: string; mtime: number };

export const OUTPUT_MIME = "application/x-phaino-output";

function formatSec(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function BinThumb({
  item,
  onAdd,
}: {
  item: OutputItem;
  onAdd: (path: string) => Promise<boolean | void>;
}) {
  const [duration, setDuration] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const src = `/api/outputs/${item.relPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  return (
    <div
      className="group"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(OUTPUT_MIME, item.relPath);
        e.dataTransfer.effectAllowed = "copy";
      }}
    >
      <div className="relative aspect-video overflow-hidden rounded-md bg-s2">
        <video
          preload="metadata"
          muted
          src={`${src}#t=0.1`}
          onLoadedMetadata={(e) => {
            const d = (e.target as HTMLVideoElement).duration;
            if (Number.isFinite(d)) setDuration(d);
          }}
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          aria-label={`Add ${item.name} to sequence`}
          disabled={adding}
          onClick={async () => {
            setAdding(true);
            try {
              await onAdd(item.relPath);
            } finally {
              setAdding(false);
            }
          }}
          className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-ac hover:text-on"
        >
          <Icon d={SECTION_ICONS.plus} className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-1 truncate text-[12px] leading-tight text-t2">
        {item.name}
      </div>
      <div className="font-mono text-[11px] leading-tight text-t3">
        {duration === null ? "–:––" : formatSec(duration)}
      </div>
    </div>
  );
}

/** The Clips bin: recent video outputs you can append or drag onto the strip. */
export function ClipDrawer({
  onAdd,
}: {
  onAdd: (path: string) => Promise<boolean | void>;
}) {
  const [items, setItems] = useState<OutputItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/sequence/outputs")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { items?: OutputItem[] } | null) => {
        if (!cancelled && d?.items) setItems(d.items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-baseline justify-between border-b border-line px-3 py-2.5">
        <h3 className="text-[13px] font-semibold">Clips</h3>
        {items && (
          <span className="text-[11px] text-t3">{items.length}</span>
        )}
      </div>
      {items === null ? null : items.length === 0 ? (
        <div className="grid flex-1 place-items-center p-4 text-center">
          <div>
            <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-lg border border-line bg-s2 text-t3">
              <Icon d={SECTION_ICONS.video} className="h-4 w-4" />
            </div>
            <p className="text-[12px] text-t3">No video outputs yet.</p>
            <Link
              href="/video"
              className="mt-2 inline-block rounded-full border border-line px-3 py-1 text-[12px] text-t2 hover:bg-s2 hover:text-t1"
            >
              Make a video
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid flex-1 auto-rows-min grid-cols-2 content-start gap-2 overflow-y-auto p-3">
          {items.map((it) => (
            <BinThumb key={it.relPath} item={it} onAdd={onAdd} />
          ))}
        </div>
      )}
    </div>
  );
}
