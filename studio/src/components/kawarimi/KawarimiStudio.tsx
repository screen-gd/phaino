"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { EstimateCaption } from "../studio/CreditEstimate";
import { HistoryRail } from "../studio/HistoryRail";
import { STATUS_BADGE } from "../studio/JobViews";
import { AdvancedChip, ParamChip } from "../studio/ParamControls";
import { UploadCard } from "../studio/UploadCard";
import { useStudio } from "../studio/useStudio";
import { VideoPicker } from "../edit/VideoPicker";
import { progressPct } from "../studio/studioUtils";
import { useComfyHealth } from "@/lib/useComfyHealth";
import type { StudioParam, StudioPreset } from "@/components/toolStudioData";
import { KawarimiResult } from "./KawarimiResult";
import { ImageLibraryPicker } from "./ImageLibraryPicker";
import { demoSource } from "@/lib/demo";

export type KawarimiEngineMeta = {
  id: string;
  label: string;
  license: "open" | "partner";
  badge?: string;
  maxSeconds?: number;
  preset: StudioPreset;
};

const PARAM_CHIP_STYLE =
  "[&>button]:h-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-line [&>button]:bg-transparent [&>button]:font-mono [&>button]:text-caption [&>button]:text-t2 [&>button:hover]:border-t3 [&>button:hover]:bg-transparent [&>button:hover]:text-t1";

function promptDefault(preset: StudioPreset): string {
  const param = preset.params.find(
    (p): p is Extract<StudioParam, { type: "text" }> =>
      p.type === "text" && p.key === "prompt",
  );
  return param?.default ?? "";
}

/** Status + progress for a queued, running or failed Kawarimi run. */
function RunStatus({
  job,
  presetName,
  onCancel,
}: {
  job: import("@/components/toolStudioData").StudioJob;
  presetName: (id: string) => string;
  onCancel: () => void;
}) {
  const badge = STATUS_BADGE[job.status];
  const running = job.status === "queued" || job.status === "running";
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="relative aspect-video h-full w-auto max-w-full overflow-hidden rounded-xl border border-line bg-s2">
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            {job.status === "failed" ? (
              <p className="text-body text-destructive">
                {job.error ?? "Something went wrong"}
              </p>
            ) : job.status === "cancelled" ? (
              <p className="text-body text-t2">Cancelled</p>
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
      <div className="mt-3 flex w-full flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-body text-t1">
            {presetName(job.presetId)}
          </span>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </span>
        {running && (
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-s2 px-3 text-caption text-t1 hover:bg-s3"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

/** The /kawarimi studio: source video + character image in, swap out. */
export function KawarimiStudio({
  engines,
  defaultId,
}: {
  engines: KawarimiEngineMeta[];
  defaultId?: string;
}) {
  const presets = engines.map((e) => e.preset);
  const s = useStudio("video", presets);
  const health = useComfyHealth();
  const engine =
    engines.find((e) => e.id === s.preset?.id) ??
    engines.find((e) => e.id === defaultId) ??
    engines[0];
  const preset = engine?.preset;
  const promptEdited = useRef(false);
  const [clip, setClip] = useState<{ url: string; seconds: number } | null>(
    null,
  );

  const video = s.uploads["video"];
  const character = s.uploads["character"];

  // Pre-fill the prompt with the engine default while it is untouched.
  useEffect(() => {
    if (preset && !promptEdited.current && s.values["prompt"] == null) {
      s.setValue("prompt", promptDefault(preset));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset?.id]);

  // Read the uploaded clip's length for the trim note.
  useEffect(() => {
    if (!video) return;
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.muted = true;
    probe.src = video.previewUrl;
    probe.onloadedmetadata = () => {
      if (Number.isFinite(probe.duration)) {
        setClip({ url: video.previewUrl, seconds: probe.duration });
      }
    };
    return () => {
      probe.src = "";
    };
  }, [video]);
  const clipSeconds =
    clip && video && clip.url === video.previewUrl ? clip.seconds : null;

  const selectEngine = (id: string) => {
    s.selectPreset(id, { keep: true });
    if (!promptEdited.current) {
      const next = engines.find((e) => e.id === id);
      if (next) s.setValue("prompt", promptDefault(next.preset));
    }
  };

  const job = s.job;
  const sourceUrl = job?.outputs[0]
    ? (demoSource(job.outputs[0]) ??
      (job.inputs?.video
        ? job.inputs.video.startsWith("/")
          ? job.inputs.video
          : `/api/uploads/${job.inputs.video}`
        : video?.previewUrl))
    : video?.previewUrl;

  const chipParams =
    preset?.params.filter((p) => p.type !== "text" && !p.advanced) ?? [];
  const advancedParams = preset?.params.filter((p) => p.advanced) ?? [];
  const recent = s.recent.filter(
    (row) =>
      engines.some((e) => e.id === row.presetId) ||
      row.presetId.startsWith("kawarimi"),
  );
  const presetName = (id: string) =>
    engines.find((e) => e.id === id)?.preset.name ?? id;
  const ready = !!preset && !!video && !!character;
  const busy = s.submitting;

  return (
    <div className="grid min-h-full grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] bg-black lg:h-full lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-none">
      <section className="flex min-h-0 min-w-0 flex-col px-4 pt-5 pb-5 sm:px-6">
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
          <div>
            <h1 className="font-display text-h3 font-semibold text-t1">
              Kawarimi
            </h1>
            <p className="mt-1 text-body text-t3">Character swap</p>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-center py-5 lg:min-h-[240px] lg:overflow-y-auto lg:[container-type:size]">
            {job && job.status === "succeeded" && job.outputs.length > 0 ? (
              <div className="flex min-h-[240px] w-full max-w-[1100px] flex-col lg:h-full">
                <KawarimiResult
                  key={job.id}
                  job={job}
                  sourceUrl={sourceUrl}
                  presetName={presetName}
                />
                <button
                  type="button"
                  onClick={s.clearJob}
                  className="mt-3 self-start text-caption text-t2 underline underline-offset-4 hover:text-t1"
                >
                  New swap
                </button>
              </div>
            ) : job ? (
              <div className="flex min-h-[240px] w-full max-w-[1100px] flex-col lg:h-full">
                <RunStatus
                  job={job}
                  presetName={presetName}
                  onCancel={() => void s.cancel()}
                />
                {!["queued", "running"].includes(job.status) && (
                  <button
                    type="button"
                    onClick={s.clearJob}
                    className="mt-3 self-start text-caption text-t2 underline underline-offset-4 hover:text-t1"
                  >
                    New swap
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full max-w-[960px] shrink-0">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
                  <div>
                    <span className="mb-1 block text-caption text-t3">
                      Source video
                    </span>
                    <VideoPicker
                      uploaded={video}
                      onUploaded={(u) => s.setUploaded("video", u)}
                      onClear={() => s.clearUploaded("video")}
                    />
                  </div>
                  <div>
                    <span className="mb-1 block text-caption text-t3">
                      Character
                    </span>
                    <UploadCard
                      label="Character"
                      required
                      uploaded={character}
                      onUploaded={(u) => s.setUploaded("character", u)}
                      onClear={() => s.clearUploaded("character")}
                    />
                    <div className="mt-2 text-center">
                      <ImageLibraryPicker
                        onUploaded={(u) => s.setUploaded("character", u)}
                      />
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-caption text-t3">
                  Only swap in characters and footage you have the rights to.
                </p>
                {clipSeconds != null &&
                  engine?.maxSeconds != null &&
                  clipSeconds > engine.maxSeconds && (
                    <p className="mt-1 text-caption text-t3">
                      Longer than {engine.maxSeconds}s. {engine.label} uses the
                      first {engine.maxSeconds}s.
                    </p>
                  )}
              </div>
            )}
          </div>

          <div
            role="group"
            aria-label="Engine"
            className="mb-3 flex shrink-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {engines.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => selectEngine(e.id)}
                aria-pressed={e.id === engine?.id}
                className={`flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-body whitespace-nowrap ${
                  e.id === engine?.id
                    ? "border-ac text-t1"
                    : "border-line text-t2 hover:border-t3 hover:text-t1"
                }`}
              >
                {e.label}
                <span className="rounded bg-s3 px-1.5 py-0.5 text-caption uppercase text-t2">
                  {e.license === "partner" ? "Partner" : "Open"}
                </span>
                {e.badge && (
                  <span className="rounded bg-acs px-1.5 py-0.5 text-caption uppercase text-t1">
                    {e.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="shrink-0 rounded-lg border border-line bg-black p-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="rounded-lg border border-line p-2.5 focus-within:border-t3">
                  <label
                    htmlFor="kawarimi-prompt"
                    className="mb-1 block text-caption text-t3"
                  >
                    Prompt
                  </label>
                  <textarea
                    id="kawarimi-prompt"
                    rows={2}
                    value={String(
                      s.values["prompt"] ?? promptDefault(preset as StudioPreset),
                    )}
                    onChange={(e) => {
                      promptEdited.current = true;
                      s.setValue("prompt", e.target.value);
                    }}
                    className="w-full resize-none bg-transparent text-body text-t1 outline-none placeholder:text-t3"
                  />
                </div>
                {chipParams.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {chipParams.map((param) => (
                      <div key={param.key} className={PARAM_CHIP_STYLE}>
                        <ParamChip
                          param={param}
                          value={
                            param.type === "seed"
                              ? s.randomSeed
                                ? "random"
                                : Number(s.values[param.key] ?? 0)
                              : s.values[param.key]
                          }
                          randomSeed={s.randomSeed}
                          onChange={(v) => s.setValue(param.key, v)}
                          onRandomSeed={s.setRandomSeed}
                          variant="bar"
                          side="top"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {advancedParams.length > 0 && (
                  <div className={PARAM_CHIP_STYLE}>
                    <AdvancedChip
                      params={advancedParams}
                      values={s.values}
                      randomSeed={s.randomSeed}
                      onChange={(key, v) => s.setValue(key, v)}
                      onRandomSeed={s.setRandomSeed}
                    />
                  </div>
                )}
              </div>

              <div className="flex min-w-0 w-full flex-col gap-3 xl:w-auto xl:shrink-0">
                {health && health.status !== "ok" && (
                  <p className="whitespace-nowrap text-xs text-t3">
                    Comfy Cloud not connected ·{" "}
                    <Link
                      href="/settings"
                      className="rounded-sm text-t3 underline underline-offset-2 hover:text-t1"
                    >
                      Settings
                    </Link>
                  </p>
                )}
                {s.error && (
                  <p role="alert" className="text-xs text-destructive">
                    {s.error}
                  </p>
                )}
                {preset && (
                  <div className="flex justify-end whitespace-nowrap font-mono">
                    <EstimateCaption
                      stats={preset.estimate}
                      unit="clip"
                      partner={preset.partner}
                    />
                  </div>
                )}
                <button
                  type="button"
                  className="h-10 w-full shrink-0 rounded-lg border border-ac px-5 text-body font-semibold text-t1 enabled:hover:text-ac disabled:cursor-not-allowed disabled:border-line disabled:text-t3"
                  aria-busy={busy}
                  disabled={!ready || busy}
                  onClick={() => void s.submit()}
                >
                  {busy ? "Generating…" : "Generate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HistoryRail
        jobs={recent}
        job={s.job}
        presets={presets}
        activeId={s.job?.id}
        onSelect={s.setJob}
        onCancel={(id) => void s.cancel(id)}
        aspect="wide"
        failed={s.recentFailed}
      />
    </div>
  );
}
