"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Icon, SECTION_ICONS } from "../icons";
import { outputPosterUrl } from "@/lib/demo";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Uploaded } from "../studio/useStudio";

type OutputItem = { relPath: string; name: string; kind: string };

/** One recent-output thumbnail; the poster endpoint covers codecs Chromium can't decode. */
function OutputThumb({
  item,
  onPick,
  disabled,
}: {
  item: OutputItem;
  onPick: (relPath: string) => void;
  disabled?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(item.relPath)}
      title={item.name}
      aria-label={`Use ${item.name}`}
      className="w-24 overflow-hidden rounded-md border border-line hover:border-ac"
    >
      {failed ? (
        <span className="grid aspect-video w-full place-items-center bg-s1">
          <Icon d={SECTION_ICONS.video} className="h-4 w-4 text-t3" />
        </span>
      ) : (
        <img
          src={outputPosterUrl(item.relPath)}
          alt=""
          onError={() => setFailed(true)}
          className="aspect-video w-full object-cover"
        />
      )}
    </button>
  );
}

/** Drop zone plus recent generated videos; feeds an uploadId. */
export function VideoPicker({
  uploaded,
  onUploaded,
  onClear,
  maxSeconds,
}: {
  uploaded?: Uploaded;
  onUploaded: (u: Uploaded) => void;
  onClear: () => void;
  maxSeconds?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [items, setItems] = useState<OutputItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sequence/outputs")
      .then((r) => (r.ok ? (r.json() as Promise<{ items: OutputItem[] }>) : null))
      .then((data) =>
        setItems((data?.items ?? []).filter((i) => i.kind === "video")),
      )
      .catch(() => {});
  }, []);

  async function upload(file: File) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        onUploaded({
          uploadId: data.uploadId,
          previewUrl: data.previewUrl,
          name: file.name,
        });
      } else {
        setError(data.error ?? data.message ?? "Upload failed");
      }
    } catch {
      setError("Couldn't upload that video. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function pickOutput(relPath: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/uploads/from-output", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: relPath }),
      });
      const data = await res.json();
      if (res.ok) {
        onUploaded({
          uploadId: data.uploadId,
          previewUrl: data.previewUrl,
          name: relPath.split("/").pop() ?? "output",
        });
      } else {
        setError("Couldn't load that video");
      }
    } catch {
      setError("Couldn't load that video. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  if (uploaded) {
    return (
      <div className="w-full">
        <div className="group relative aspect-video w-full overflow-hidden rounded-panel border border-line bg-black">
          <video
            src={uploaded.previewUrl}
            muted
            playsInline
            controls
            preload="metadata"
            className="h-full w-full object-contain"
          />
          <button
            type="button"
            aria-label="Remove video"
            onClick={onClear}
            className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-md bg-black/60 text-t2 hover:text-t1"
          >
            <Icon d={SECTION_ICONS.x} className="h-4 w-4" />
          </button>
          <span className="pointer-events-none absolute top-2 left-2 max-w-[80%] truncate rounded bg-black/60 px-1.5 py-0.5 font-mono text-caption text-t2">
            {uploaded.name}
          </span>
        </div>
        {maxSeconds != null && maxSeconds > 0 && (
          <p className="mt-2 text-center font-mono text-caption text-t3">
            First {maxSeconds}s used
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div
        aria-busy={busy}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDrag(true);
        }}
        onDragLeave={(e) => {
          if (
            !(e.relatedTarget instanceof Node) ||
            !e.currentTarget.contains(e.relatedTarget)
          ) {
            setDrag(false);
          }
        }}
        onDrop={onDrop}
        className={`relative flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-panel border border-dashed bg-s1 px-2 py-4 text-center ${
          drag ? "border-ac" : "border-line"
        }`}
      >
        <span className="grid h-11 w-11 place-items-center rounded-full bg-s3">
          <Icon d={SECTION_ICONS.upload} className="h-5 w-5 text-t2" />
        </span>
        <div className="grid min-w-0 gap-1.5">
          <p className="text-body font-medium text-t1" role="status">
            {busy ? "Loading video…" : "Drop a video here"}
          </p>
          <p className="text-caption text-t3">
            MP4, MOV or WebM
            {maxSeconds != null && maxSeconds > 0
              ? ` · first ${maxSeconds}s used`
              : ""}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="h-9 rounded-lg bg-ac px-4 text-body font-semibold text-on hover:bg-[#ff6d3a] disabled:bg-s3 disabled:text-t3"
        >
          Browse files
        </button>
        {items.length > 0 && (
          <div>
            <p className="mb-2 text-caption text-t3">Recent outputs</p>
            <div className="flex items-center justify-center gap-2">
              {items.slice(0, 4).map((item) => (
                <OutputThumb
                  key={item.relPath}
                  item={item}
                  onPick={(relPath) => void pickOutput(relPath)}
                  disabled={busy}
                />
              ))}
              {items.length > 4 && (
                <Popover>
                  <PopoverTrigger
                    render={
                      <button
                        type="button"
                        className="grid w-24 aspect-video place-items-center rounded-md border border-dashed border-line hover:border-t3"
                      />
                    }
                  >
                    <span className="text-caption text-t2">
                      +{Math.min(items.length - 4, 8)}
                    </span>
                  </PopoverTrigger>
                  <PopoverPopup
                    side="top"
                    align="center"
                    className="rounded-xl border-line bg-s2 p-2 shadow-xl shadow-black/50"
                  >
                    <div className="grid w-[304px] grid-cols-3 gap-2">
                      {items.slice(4, 12).map((item) => (
                        <OutputThumb
                          key={item.relPath}
                          item={item}
                          onPick={(relPath) => void pickOutput(relPath)}
                          disabled={busy}
                        />
                      ))}
                    </div>
                  </PopoverPopup>
                </Popover>
              )}
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-caption text-destructive">{error}</p>
      )}
    </div>
  );
}
