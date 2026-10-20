import Link from "next/link";
import { EmptyPage } from "@/components/EmptyPage";
import { PublishDialog } from "@/components/PublishDialog";
import { AddToSequence } from "@/components/sequence/AddToSequence";
import { EditVideoButton } from "@/components/edit/EditVideoButton";
import { Button } from "@/components/ui/button";
import { getEnv } from "@/server/env";
import { listOutputs, type OutputItem } from "@/server/social/media";

export const dynamic = "force-dynamic";

function previewUrl(item: OutputItem): string {
  return `/api/outputs/${item.relPath.split("/").map(encodeURIComponent).join("/")}`;
}

/** Generated outputs from .data/outputs, each shareable through PublishDialog. */
export default async function LibraryPage() {
  const items = await listOutputs(getEnv().dataDir);

  if (items.length === 0) {
    return (
      <EmptyPage
        title="Library"
        body="Generated shots appear here. Share them to YouTube, Instagram, X and more."
      />
    );
  }

  return (
    <div className="px-3 pt-3 pb-10">
      <h1 className="sr-only">Library</h1>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {items.map((item) => {
          const url = previewUrl(item);
          return (
            <div
              key={item.relPath}
              className="group relative aspect-video overflow-hidden rounded-xl border border-line bg-s3"
            >
              {item.kind === "video" ? (
                <video
                  src={url}
                  muted
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              ) : (
                <img src={url} alt="" className="h-full w-full object-cover" />
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/70 to-transparent" />
              <b className="pointer-events-none absolute bottom-2 left-3 block max-w-[60%] truncate text-caption font-semibold">
                {item.relPath}
              </b>
              {item.kind === "video" && (
                <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <EditVideoButton path={item.relPath} iconOnly />
                  <AddToSequence path={item.relPath} iconOnly />
                </div>
              )}
              {item.kind === "image" && (
                <Link
                  href={`/video?preset=ltx25-i2v&from=${encodeURIComponent(item.relPath)}`}
                  className="absolute top-2 left-2 z-10 rounded-md bg-black/70 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  Animate
                </Link>
              )}
              <div className="absolute right-2 bottom-2 z-10">
                <PublishDialog
                  output={{ path: item.relPath, kind: item.kind, previewUrl: url }}
                  trigger={<Button size="xs">Share</Button>}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
