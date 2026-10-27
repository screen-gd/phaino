"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Media } from "@/server/sequence/model";
import { Icon, SECTION_ICONS } from "@/components/icons";

export const OUTPUT_MIME = "application/x-phaino-output";
export const MEDIA_MIME = "application/x-phaino-media";

export type OutputItem = {
  relPath: string;
  name: string;
  kind: "image" | "video";
  mtime: number;
};

const VIDEO_EXT = /\.(mp4|mov|webm)$/i;
const AUDIO_EXT = /\.(m4a|mp3|wav)$/i;

/** Guess a media kind from a path's extension, for drop routing. */
export function kindFromPath(path: string): "video" | "audio" | "image" {
  if (AUDIO_EXT.test(path)) return "audio";
  if (VIDEO_EXT.test(path)) return "video";
  return "image";
}

const KIND_ICON: Record<Media["kind"], keyof typeof SECTION_ICONS> = {
  video: "video",
  audio: "audio",
  image: "image",
};

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
        {item.kind === "video" ? (
          <video
            preload="metadata"
            muted
            src={`${src}#t=0.1`}
            className="h-full w-full object-cover"
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={src} alt="" className="h-full w-full object-cover" />
        )}
        <button
          type="button"
          aria-label={`Add ${item.name} to the sequence`}
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
        {item.kind}
      </div>
    </div>
  );
}

function MediaRow({
  media,
  onAdd,
  onRemove,
}: {
  media: Media;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className="group flex items-center gap-2 rounded-md border border-line bg-s2 px-2 py-1.5"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(MEDIA_MIME, media.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onDoubleClick={() => onAdd(media.id)}
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-s3 text-t3">
        <Icon d={SECTION_ICONS[KIND_ICON[media.kind]]} className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] leading-tight text-t2">
          {media.name}
        </div>
        <div className="font-mono text-[10px] leading-tight text-t3">
          {media.kind === "image" ? "still" : formatSec(media.durationSec)}
        </div>
      </div>
      <button
        type="button"
        aria-label={`Add ${media.name} to the sequence`}
        title="Add to Editor"
        onClick={() => onAdd(media.id)}
        className="grid h-6 w-6 place-items-center rounded text-t3 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-ac hover:text-on"
      >
        <Icon d={SECTION_ICONS.plus} className="h-3 w-3" />
      </button>
      <button
        type="button"
        aria-label={`Remove ${media.name}`}
        onClick={() => onRemove(media.id)}
        className="grid h-6 w-6 place-items-center rounded text-t3 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-s3 hover:text-t1"
      >
        <Icon d={SECTION_ICONS.x} className="h-3 w-3" />
      </button>
    </div>
  );
}

/** The media bin: generated outputs plus imported uploads, with upload. */
export function MediaBin({
  media,
  onAddOutput,
  onAddMedia,
  onUpload,
  onRemoveMedia,
  pickRef,
}: {
  media: Media[];
  onAddOutput: (path: string) => Promise<boolean | void>;
  onAddMedia: (mediaId: string) => void;
  onUpload: (file: File) => Promise<boolean | void>;
  onRemoveMedia: (id: string) => void;
  /** Lets the empty stage trigger this bin's file picker. */
  pickRef?: React.RefObject<(() => void) | null>;
}) {
  const [tab, setTab] = useState<"outputs" | "media">("outputs");
  const [items, setItems] = useState<OutputItem[] | null>(null);
  const [dropHint, setDropHint] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pickRef) return;
    pickRef.current = () => fileRef.current?.click();
    return () => {
      pickRef.current = null;
    };
  }, [pickRef]);

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

  const upload = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0 || uploading) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) await onUpload(f);
      setTab("media");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDropHint(true);
        }
      }}
      onDragLeave={() => setDropHint(false)}
      onDrop={(e) => {
        setDropHint(false);
        if (e.dataTransfer.files.length > 0) {
          e.preventDefault();
          void upload(e.dataTransfer.files);
        }
      }}
    >
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <div className="flex h-7 items-center rounded-lg bg-s2 p-0.5">
          {(["outputs", "media"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`h-6 rounded-[6px] px-2 text-[12px] capitalize transition-colors ${
                tab === t ? "bg-s3 font-medium text-t1" : "text-t3 hover:text-t2"
              }`}
            >
              {t === "outputs" ? "Outputs" : "Media"}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="flex h-7 items-center gap-1.5 rounded-md border border-line px-2 text-[12px] text-t2 hover:bg-s2 hover:text-t1 disabled:opacity-50"
        >
          <Icon d={SECTION_ICONS.upload} className="h-3.5 w-3.5" />
          {uploading ? "Uploading" : "Upload"}
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".mp4,.mov,.webm,.m4a,.mp3,.wav,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => {
            void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {dropHint && (
        <div className="m-3 rounded-md border border-dashed border-ac px-3 py-4 text-center text-[12px] text-ac">
          Drop to import
        </div>
      )}

      {tab === "outputs" ? (
        items === null ? null : items.length === 0 ? (
          <div className="grid flex-1 place-items-center p-4 text-center">
            <div>
              <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-lg border border-line bg-s2 text-t3">
                <Icon d={SECTION_ICONS.video} className="h-4 w-4" />
              </div>
              <p className="text-[12px] text-t3">No outputs yet.</p>
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
              <BinThumb key={it.relPath} item={it} onAdd={onAddOutput} />
            ))}
          </div>
        )
      ) : media.length === 0 ? (
        <div className="grid flex-1 place-items-center p-4 text-center">
          <p className="text-[12px] text-t3">
            Imported media appears here.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-3">
          {media.map((m) => (
            <MediaRow
              key={m.id}
              media={m}
              onAdd={onAddMedia}
              onRemove={onRemoveMedia}
            />
          ))}
        </div>
      )}
    </div>
  );
}
