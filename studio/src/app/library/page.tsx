import Link from "next/link";
import { EmptyPage } from "@/components/EmptyPage";
import { AddToSequence } from "@/components/sequence/AddToSequence";
import { EditVideoButton } from "@/components/edit/EditVideoButton";
import { getEnv } from "@/server/env";
import { listOutputs, type OutputItem } from "@/server/outputs";
import { isDemoMode } from "@/lib/demo-mode";
import { DemoLibrary } from "@/components/DemoLibrary";
import { listPresets } from "@/server/presets/load";

export const dynamic = "force-dynamic";

function previewUrl(item: OutputItem): string {
  return `/api/outputs/${item.relPath.split("/").map(encodeURIComponent).join("/")}`;
}

/** Generated outputs from .data/outputs. */
export default async function LibraryPage() {
  if (isDemoMode()) {
    return <DemoLibrary presets={listPresets().map(({ id, name }) => ({ id, name }))} />;
  }
  const items = await listOutputs(getEnv().dataDir);

  if (items.length === 0) {
    return <EmptyPage title="Library" body="Generated shots appear here." />;
  }

  return (
    <div className="px-4 pt-3 pb-10">
      <h1 className="sr-only">Library</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
                  className="absolute top-2 left-2 z-10 rounded-md bg-black/70 px-2 py-1 text-caption font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  Animate
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
