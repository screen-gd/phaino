"use client";

import Link from "next/link";
import { Icon, SECTION_ICONS } from "../icons";
import type { StudioJob, StudioPreset } from "@/components/toolStudioData";
import { PublishDialog } from "@/components/PublishDialog";
import { AddToSequence } from "@/components/sequence/AddToSequence";
import { EditVideoButton } from "@/components/edit/EditVideoButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const STATUS_BADGE: Record<
  StudioJob["status"],
  {
    variant: "default" | "secondary" | "destructive" | "outline" | "success";
    label: string;
  }
> = {
  queued: { variant: "secondary", label: "Queued" },
  running: { variant: "default", label: "Running" },
  succeeded: { variant: "success", label: "Done" },
  failed: { variant: "destructive", label: "Failed" },
  cancelled: { variant: "outline", label: "Cancelled" },
};

export function isVideoPath(rel: string) {
  return /\.(mp4|mov)$/i.test(rel);
}

/** The active run: status, progress, cancel, then result + share. */
export function CurrentJob({
  job,
  presetName,
  onCancel,
}: {
  job: StudioJob;
  presetName: (id: string) => string;
  onCancel: () => void;
}) {
  const output = job.outputs[0];
  const outputKind = output && isVideoPath(output) ? "video" : "image";
  return (
    <div className="rounded-panel border border-line bg-s1 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_BADGE[job.status].variant}>
            {STATUS_BADGE[job.status].label}
          </Badge>
          <span className="text-caption text-t3">
            {presetName(job.presetId)}
          </span>
        </div>
        {(job.status === "queued" || job.status === "running") && (
          <Button variant="outline" size="xs" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      {(job.status === "queued" || job.status === "running") && (
        <div className="mt-3">
          <div className="h-1 w-full overflow-hidden rounded-full bg-s3">
            <div
              className="h-full rounded-full bg-ac transition-[width] duration-200"
              style={{ width: `${Math.round(job.progress * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-caption text-t3">
            {job.message ?? "Waiting"}
          </p>
        </div>
      )}
      {job.status === "failed" && (
        <p className="mt-3 text-body text-destructive">
          {job.error ?? "Generation failed"}
        </p>
      )}
      {job.status === "succeeded" && output && (
        <div className="mt-3">
          {outputKind === "video" ? (
            <video
              src={`/api/outputs/${output}`}
              controls
              loop
              muted
              playsInline
              className="w-full rounded-lg border border-line"
            />
          ) : (
            <img
              src={`/api/outputs/${output}`}
              alt=""
              className="w-full rounded-lg border border-line"
            />
          )}
          <div className="mt-2.5 flex items-center gap-2">
            <PublishDialog
              output={{
                path: output,
                kind: outputKind,
                previewUrl: `/api/outputs/${output}`,
              }}
              trigger={
                <Button variant="outline" size="xs">
                  Share
                </Button>
              }
            />
            {outputKind === "video" && (
              <>
                <AddToSequence path={output} />
                <EditVideoButton path={output} />
              </>
            )}
            {outputKind === "image" && (
              <Button
                variant="outline"
                size="xs"
                render={
                  <Link
                    href={`/video?preset=ltx25-i2v&from=${encodeURIComponent(output)}`}
                  />
                }
              >
                Animate
              </Button>
            )}
            <Button variant="ghost" size="xs" render={<Link href="/library" />}>
              Open in Library
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Grid of finished runs; clicking one shows it as the current job. */
export function RecentGrid({
  recent,
  presets,
  activeId,
  onSelect,
}: {
  recent: StudioJob[];
  presets: StudioPreset[];
  activeId?: string;
  onSelect: (row: StudioJob) => void;
}) {
  const presetName = (id: string) =>
    presets.find((p) => p.id === id)?.name ?? id;
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
      {recent.map((r) => {
        const out = r.outputs[0];
        const isVid = out ? isVideoPath(out) : false;
        return (
          <li key={r.id} className="group relative">
            <button
              type="button"
              onClick={() => onSelect(r)}
              className={`relative block w-full overflow-hidden rounded-xl border text-left ${
                activeId === r.id
                  ? "border-ac"
                  : "border-line hover:border-t3"
              }`}
            >
              {r.status === "succeeded" && out ? (
                isVid ? (
                  <video
                    src={`/api/outputs/${out}`}
                    muted
                    preload="metadata"
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <img
                    src={`/api/outputs/${out}`}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                )
              ) : (
                <span className="grid aspect-video w-full place-items-center bg-s2 text-t3">
                  <Icon d={SECTION_ICONS.image} className="h-5 w-5" />
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-6">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-semibold text-t1">
                    {presetName(r.presetId)}
                  </span>
                  {r.error && (
                    <span className="block truncate text-[10px] text-destructive">
                      {r.error}
                    </span>
                  )}
                </span>
                <Badge size="sm" variant={STATUS_BADGE[r.status].variant}>
                  {STATUS_BADGE[r.status].label}
                </Badge>
              </span>
            </button>
            {r.status === "succeeded" && isVid && out && (
              <span className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <EditVideoButton path={out} iconOnly />
                <AddToSequence path={out} iconOnly />
              </span>
            )}
            {r.status === "succeeded" && !isVid && out && (
              <Link
                href={`/video?preset=ltx25-i2v&from=${encodeURIComponent(out)}`}
                className="absolute top-1.5 left-1.5 rounded-md bg-black/70 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                Animate
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
