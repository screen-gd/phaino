"use client";

import Link from "next/link";
import { PostToSocial } from "./PostToSocial";
import { useState } from "react";
import { Icon, SECTION_ICONS } from "../icons";
import { STATUS_BADGE, isVideoPath } from "./JobViews";
import { AddToSequence } from "@/components/sequence/AddToSequence";
import { EditVideoButton } from "@/components/edit/EditVideoButton";
import { useDemo } from "@/components/DemoProvider";
import { failureLabel, progressPct } from "./studioUtils";
import { outputUrl } from "@/lib/demo";
import type { StudioJob } from "@/components/toolStudioData";
import { Badge } from "@/components/ui/badge";

const ACTION_CLS =
  "inline-flex h-8 items-center gap-1.5 rounded-lg bg-s2 px-3 text-caption text-t1 hover:bg-s3";

function OutputMedia({
  path,
  className,
}: {
  path: string;
  className?: string;
}) {
  return isVideoPath(path) ? (
    <video
      src={outputUrl(path)}
      controls
      loop
      muted
      playsInline
      className={className}
    />
  ) : (
    <img src={outputUrl(path)} alt="" className={className} />
  );
}

/**
 * The selected or running job on the stage: media fills the shot area,
 * a slim toolbar sits under it.
 */
export function StageResult({
  job,
  presetName,
  onCancel,
  aspect,
}: {
  job: StudioJob;
  presetName: (id: string) => string;
  onCancel: () => void;
  /** Output frame shape for pending/failed states. */
  aspect: "wide" | "square";
}) {
  const demo = useDemo();
  const [selected, setSelected] = useState<number | null>(null);
  const outs = job.outputs;
  const badge = STATUS_BADGE[job.status];
  const running = job.status === "queued" || job.status === "running";
  const shown = selected !== null ? outs[selected] : outs[0];
  const shownIsVideo = shown ? isVideoPath(shown) : aspect === "wide";
  const shownIsSingle = selected !== null || outs.length <= 1;

  const toolbar = (
    <div className="mt-3 flex w-full flex-wrap items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-body text-t1">
          {presetName(job.presetId)}
        </span>
        {job.status !== "succeeded" && (
          <Badge variant={badge.variant}>{badge.label}</Badge>
        )}
      </span>
      <span className="flex flex-wrap items-center justify-end gap-1.5">
        {selected !== null && (
          <button
            type="button"
            className={ACTION_CLS}
            onClick={() => setSelected(null)}
          >
            All
          </button>
        )}
        {running && (
          <button type="button" className={ACTION_CLS} onClick={onCancel}>
            Cancel
          </button>
        )}
        {job.status === "succeeded" && (
          <>
            {shown && (
              <a href={outputUrl(shown)} download className={ACTION_CLS}>
                <Icon d={SECTION_ICONS.download} className="h-3.5 w-3.5" />
                Download
              </a>
            )}
            {!shownIsVideo && shownIsSingle && shown && (
              <Link
                href={`/video?preset=ltx25-i2v&from=${encodeURIComponent(shown)}`}
                className={ACTION_CLS}
              >
                Animate
              </Link>
            )}
            {shownIsVideo && !demo.enabled && shown && (
              <>
                <AddToSequence
                  path={shown}
                  className="h-8 rounded-lg border-transparent bg-s2 px-3 text-caption hover:bg-s3"
                />
                <EditVideoButton
                  path={shown}
                  className="h-8 rounded-lg border-transparent bg-s2 px-3 py-0 text-caption text-t1 hover:bg-s3"
                />
              </>
            )}
            {shown && shownIsSingle && !demo.enabled && (
              <PostToSocial path={shown} className={ACTION_CLS} />
            )}
            <Link href="/library" className={ACTION_CLS}>
              Open in Library
            </Link>
          </>
        )}
      </span>
    </div>
  );

  if (running || job.status === "failed") {
    return (
      <div className="flex h-full w-full flex-col">
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div
            className={`relative h-full w-auto max-w-full overflow-hidden rounded-xl border border-line bg-s2 ${
              aspect === "square" ? "aspect-square" : "aspect-video"
            }`}
          >
            <div className="absolute inset-0 grid place-items-center px-6 text-center">
              {job.status === "failed" ? (
                <div>
                  <p className="text-body text-t1">{failureLabel(job.error)}</p>
                  {job.error && (
                    <p className="mt-1 text-caption text-t3">{job.error}</p>
                  )}
                </div>
              ) : (
                <p className="text-body text-t2">{job.message ?? "Waiting"}</p>
              )}
            </div>
            {running && (
              <span
                className="absolute inset-x-0 bottom-0 block h-0.5 bg-ac"
                style={{ width: `${progressPct(job.progress)}%` }}
              />
            )}
          </div>
        </div>
        {toolbar}
      </div>
    );
  }

  if (outs.length > 1 && selected === null) {
    return (
      <div className="flex h-full w-full flex-col">
        <div className="grid min-h-0 w-full flex-1 place-items-center overflow-y-auto">
          <div
            className={`grid h-full gap-2 ${
              outs.length <= 4 ? "grid-cols-2" : "grid-cols-3"
            }`}
          >
            {outs.map((out, i) => (
              <button
                key={out}
                type="button"
                onClick={() => setSelected(i)}
                className="h-full overflow-hidden rounded-xl border border-line hover:border-[#444]"
              >
                <OutputMedia
                  path={out}
                  className="aspect-square h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
        {toolbar}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex min-h-0 flex-1 items-center justify-center">
        {shown && (
          <OutputMedia
            path={shown}
            className="h-full w-auto max-w-full rounded-xl object-contain"
          />
        )}
      </div>
      {toolbar}
    </div>
  );
}
