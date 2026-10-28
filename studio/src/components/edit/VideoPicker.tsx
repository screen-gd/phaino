"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Icon, SECTION_ICONS } from "../icons";
import type { Uploaded } from "../studio/useStudio";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";

type OutputItem = { relPath: string; name: string; kind: string };

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
        <div className="group relative aspect-video w-full overflow-hidden rounded-lg border border-line bg-black">
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
        className={`relative flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-black px-2 py-4 text-center ${
          drag ? "border-ac" : "border-line"
        }`}
      >
        <Icon d={SECTION_ICONS.upload} className="h-6 w-6 shrink-0 text-t3" />
        <div className="grid min-w-0 gap-2">
          <p className="whitespace-nowrap text-body leading-6 text-t1" role="status">
            {busy ? "Loading video…" : (
              <>
                Drop a video or{" "}
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="rounded-sm text-t1 underline underline-offset-4 hover:text-t2"
                >
                  browse
                </button>
              </>
            )}
          </p>
          <p className="font-mono text-caption whitespace-nowrap text-t3">
            MP4, MOV or WebM
            {maxSeconds != null && maxSeconds > 0
              ? ` · first ${maxSeconds}s used`
              : ""}
          </p>
        </div>
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
        {items.length > 0 && (
          <Popover>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-sm text-xs text-t2 underline underline-offset-4 hover:text-t1 disabled:text-t3"
                />
              }
            >
              Choose from outputs
            </PopoverTrigger>
            <PopoverPopup
              side="bottom"
              className="w-[min(320px,calc(100vw-32px))] border-line bg-black p-3 motion-reduce:transition-none"
            >
              <p className="mb-2 text-xs text-t3">Recent outputs</p>
              <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto">
                {items.slice(0, 8).map((item) => (
                  <button
                    key={item.relPath}
                    type="button"
                    disabled={busy}
                    onClick={() => void pickOutput(item.relPath)}
                    title={item.name}
                    aria-label={`Use ${item.name}`}
                    className="relative aspect-video overflow-hidden rounded-md border border-line hover:border-ac"
                  >
                    <video
                      src={`/api/outputs/${item.relPath}`}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </PopoverPopup>
          </Popover>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
