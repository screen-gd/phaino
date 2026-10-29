"use client";

import { useEffect, useState } from "react";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import type { Uploaded } from "@/components/studio/useStudio";

type OutputItem = { relPath: string; name: string; kind: string };

/** Pick an image from the Library; creates an upload via from-output. */
export function ImageLibraryPicker({
  onUploaded,
}: {
  onUploaded: (u: Uploaded) => void;
}) {
  const [items, setItems] = useState<OutputItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sequence/outputs")
      .then((r) => (r.ok ? (r.json() as Promise<{ items: OutputItem[] }>) : null))
      .then((data) =>
        setItems((data?.items ?? []).filter((i) => i.kind === "image")),
      )
      .catch(() => {});
  }, []);

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
        setError("Couldn't load that image");
      }
    } catch {
      setError("Couldn't load that image. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) return null;

  return (
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
        Character from Library
      </PopoverTrigger>
      <PopoverPopup
        side="bottom"
        className="w-[min(320px,calc(100vw-32px))] border-line bg-black p-3 motion-reduce:transition-none"
      >
        <p className="mb-2 text-xs text-t3">Library images</p>
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
              <img
                src={`/api/outputs/${item.relPath}`}
                alt={item.name}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </PopoverPopup>
    </Popover>
  );
}
