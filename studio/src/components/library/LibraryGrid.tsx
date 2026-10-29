"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AddToSequence } from "@/components/sequence/AddToSequence";
import { EditVideoButton } from "@/components/edit/EditVideoButton";
import { PostToSocial } from "@/components/studio/PostToSocial";
import { Icon, SECTION_ICONS } from "@/components/icons";
import {
  Dialog,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";

type LibraryItem = {
  relPath: string;
  kind: "video" | "image";
};

function previewUrl(item: LibraryItem): string {
  return `/api/outputs/${item.relPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

const ACTION_CLS =
  "inline-flex h-8 items-center gap-1.5 rounded-lg bg-s2 px-3 text-caption text-t1 hover:bg-s3";

/** One tile: hover plays the video, click opens the preview dialog. */
function Tile({
  item,
  onOpen,
}: {
  item: LibraryItem;
  onOpen: (item: LibraryItem) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const url = previewUrl(item);
  const play = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void videoRef.current?.play().catch(() => {});
  };
  const stop = () => {
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  };

  return (
    <div className="group relative aspect-video overflow-hidden rounded-xl border border-line bg-s3">
      <button
        type="button"
        aria-label={`Preview ${item.relPath}`}
        onClick={() => onOpen(item)}
        onPointerEnter={item.kind === "video" ? play : undefined}
        onPointerLeave={item.kind === "video" ? stop : undefined}
        onFocus={item.kind === "video" ? play : undefined}
        onBlur={item.kind === "video" ? stop : undefined}
        className="absolute inset-0 block h-full w-full"
      >
        {item.kind === "video" ? (
          <video
            ref={videoRef}
            src={url}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : (
          <img src={url} alt="" className="h-full w-full object-cover" />
        )}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/70 to-transparent" />
        <span className="pointer-events-none absolute bottom-2 left-3 block max-w-[60%] truncate text-caption font-semibold">
          {item.relPath}
        </span>
      </button>
      {item.kind === "video" && (
        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <EditVideoButton path={item.relPath} iconOnly />
          <AddToSequence path={item.relPath} iconOnly />
        </div>
      )}
      {item.kind === "image" && (
        <Link
          href={`/video?preset=ltx25-i2v&from=${encodeURIComponent(item.relPath)}`}
          className="absolute top-2 left-2 z-10 rounded-md bg-black/70 px-2 py-1 text-caption font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
        >
          Animate
        </Link>
      )}
    </div>
  );
}

/** Full-size preview with sound and the output's actions. */
function PreviewDialog({
  item,
  onClose,
}: {
  item: LibraryItem | null;
  onClose: () => void;
}) {
  const url = item ? previewUrl(item) : "";
  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogPopup className="max-w-4xl" aria-describedby={undefined}>
        {item && (
          <>
            <DialogTitle className="sr-only">{item.relPath}</DialogTitle>
            <DialogPanel className="p-4 in-[[data-slot=dialog-popup]]:pt-4" scrollFade={false}>
              <div className="grid gap-3">
                <div className="flex items-center justify-center overflow-hidden rounded-lg bg-black">
                  {item.kind === "video" ? (
                    <video
                      src={url}
                      controls
                      playsInline
                      className="max-h-[70vh] w-full object-contain"
                    />
                  ) : (
                    <img
                      src={url}
                      alt={item.relPath}
                      className="max-h-[70vh] w-full object-contain"
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="truncate text-caption text-t3">
                    {item.relPath}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <a href={url} download className={ACTION_CLS}>
                      <Icon d={SECTION_ICONS.download} className="h-3.5 w-3.5" />
                      Download
                    </a>
                    {item.kind === "video" && (
                      <>
                        <AddToSequence
                          path={item.relPath}
                          className="h-8 rounded-lg border-transparent bg-s2 px-3 text-caption hover:bg-s3"
                        />
                        <EditVideoButton
                          path={item.relPath}
                          className="h-8 rounded-lg border-transparent bg-s2 px-3 py-0 text-caption text-t1 hover:bg-s3"
                        />
                      </>
                    )}
                    <PostToSocial path={item.relPath} className={ACTION_CLS} />
                  </span>
                </div>
              </div>
            </DialogPanel>
          </>
        )}
      </DialogPopup>
    </Dialog>
  );
}

/** The Library grid: hover plays, click previews. */
export function LibraryGrid({ items }: { items: LibraryItem[] }) {
  const [open, setOpen] = useState<LibraryItem | null>(null);
  return (
    <div className="px-4 pt-3 pb-10">
      <h1 className="sr-only">Library</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((item) => (
          <Tile key={item.relPath} item={item} onOpen={setOpen} />
        ))}
      </div>
      <PreviewDialog item={open} onClose={() => setOpen(null)} />
    </div>
  );
}
