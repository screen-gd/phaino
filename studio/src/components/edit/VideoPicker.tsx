"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Icon, SECTION_ICONS } from "../icons";
import type { Uploaded } from "../studio/useStudio";

type OutputItem = { relPath: string; name: string; kind: string };

/** Drop zone plus recent generated videos; feeds an uploadId. */
export function VideoPicker({
  uploaded,
  onUploaded,
  onClear,
}: {
  uploaded?: Uploaded;
  onUploaded: (u: Uploaded) => void;
  onClear: () => void;
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
    } finally {
      setBusy(false);
    }
  }

  async function pickOutput(relPath: string) {
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
      <div className="group relative aspect-video w-full overflow-hidden rounded-panel border border-line bg-black">
        <video
          src={uploaded.previewUrl}
          muted
          playsInline
          loop
          autoPlay
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
        <span className="absolute bottom-2 left-2 max-w-[80%] truncate rounded bg-black/60 px-1.5 py-0.5 text-caption text-t2">
          {uploaded.name}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`relative grid aspect-video w-full place-items-center rounded-panel border bg-s2 transition-colors ${
          drag ? "border-ac" : "border-line hover:border-t3"
        } ${busy ? "opacity-60" : ""}`}
      >
        <span className="grid justify-items-center gap-2">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-s3 text-t3">
            <Icon d={SECTION_ICONS.upload} className="h-5 w-5" />
          </span>
          <span className="text-body text-t1">
            {busy ? "Uploading…" : "Drop a video or browse"}
          </span>
          <span className="text-caption text-t3">MP4, MOV or WebM</span>
        </span>
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
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {items.length > 0 && (
        <div>
          <span className="mb-1 block text-caption text-t3">Recent outputs</span>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {items.slice(0, 8).map((item) => (
              <button
                key={item.relPath}
                type="button"
                disabled={busy}
                onClick={() => void pickOutput(item.relPath)}
                title={item.name}
                className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-md border border-line hover:border-ac"
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
        </div>
      )}
    </div>
  );
}
