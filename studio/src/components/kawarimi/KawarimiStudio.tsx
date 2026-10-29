"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Composer } from "../studio/Composer";
import { HistoryRail } from "../studio/HistoryRail";
import { StageResult } from "../studio/StageResult";
import { useStudio } from "../studio/useStudio";
import { VideoPicker } from "../edit/VideoPicker";
import { mainPromptKey } from "../studio/studioUtils";
import { useComfyHealth } from "@/lib/useComfyHealth";
import { brandLogo } from "@/lib/brand-logos";
import { DEMO_MESSAGE, demoSource } from "@/lib/demo";
import type { StudioParam, StudioPreset } from "@/components/toolStudioData";
import { KawarimiResult } from "./KawarimiResult";
import { ImageLibraryPicker } from "./ImageLibraryPicker";

export type KawarimiEngineMeta = {
  id: string;
  label: string;
  license: "open" | "partner";
  maxSeconds: number;
  preset: StudioPreset;
};

function promptDefault(preset: StudioPreset): string {
  const param = preset.params.find(
    (p): p is Extract<StudioParam, { type: "text" }> =>
      p.type === "text" && p.key === "prompt",
  );
  return param?.default ?? "";
}

/** The /kawarimi studio: source video on the stage, character and prompt in the composer. */
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

  const video = s.uploads["video"];
  const character = s.uploads["character"];

  // Pre-fill the prompt with the engine default while it is untouched.
  useEffect(() => {
    if (preset && !promptEdited.current && s.values["prompt"] == null) {
      s.setValue("prompt", promptDefault(preset));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset?.id]);

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

  const textParams =
    preset?.params.filter(
      (p): p is Extract<StudioParam, { type: "text" }> =>
        p.type === "text" && !p.advanced,
    ) ?? [];
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

  // The character image uploads in the composer; the video stays on the stage.
  const composerSlots =
    preset?.inputs
      .filter((i) => i.type === "image")
      .map((i) => ({
        key: i.key,
        label: i.label,
        required: i.required,
        type: "image" as const,
      })) ?? [];

  const promptKey = mainPromptKey(textParams);
  const onValue = (key: string, v: string | number | boolean) => {
    if (key === promptKey) promptEdited.current = true;
    s.setValue(key, v);
  };

  const ready = s.demo
    ? !!preset
    : !!preset && !!video && !!character;

  return (
    <div className="grid min-h-full grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] bg-black lg:h-full lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-none">
      <section className="flex min-h-0 min-w-0 flex-col px-4 pt-5 pb-5 sm:px-6">
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
          <div>
            <h1 className="font-display text-h3 font-extrabold uppercase text-t1 font-stretch-[112.5%]">
              Kawarimi
            </h1>
            <p className="mt-1 max-w-[60ch] text-body text-t3">
              Swap the person in a video for a character from one image.
            </p>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-center py-5 lg:min-h-[240px] lg:overflow-y-auto lg:[container-type:size]">
            {job && job.status === "succeeded" && job.outputs.length > 0 ? (
              <div className="flex min-h-[240px] w-full max-w-[1100px] flex-col lg:h-full">
                <div className="flex min-h-0 flex-1 flex-col">
                  <KawarimiResult
                    key={job.id}
                    job={job}
                    sourceUrl={sourceUrl}
                    presetName={presetName}
                  />
                </div>
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
                <div className="flex min-h-0 flex-1 flex-col">
                  <StageResult
                    key={job.id}
                    job={job}
                    presetName={presetName}
                    onCancel={() => void s.cancel()}
                    aspect="wide"
                  />
                </div>
                {job.status !== "queued" && job.status !== "running" && (
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
              <div className="w-full max-w-[760px] shrink-0 lg:w-[min(100cqw,760px,calc((100cqh_-_40px)_*_16_/_9))]">
                <VideoPicker
                  uploaded={video}
                  onUploaded={(u) => s.setUploaded("video", u)}
                  onClear={() => s.clearUploaded("video")}
                  maxSeconds={engine?.maxSeconds}
                />
                <div className="mt-2 flex items-center justify-between gap-3 text-caption text-t3">
                  <span>
                    Use only footage and characters you have rights to.
                  </span>
                  <ImageLibraryPicker
                    onUploaded={(u) => s.setUploaded("character", u)}
                  />
                </div>
              </div>
            )}
          </div>

          {s.demo && (
            <p className="mb-3 text-caption text-t3">{DEMO_MESSAGE}</p>
          )}

          {health && health.status !== "ok" && (
            <p className="mb-3 text-caption text-t3">
              Comfy Cloud not connected ·{" "}
              <Link
                href="/settings"
                className="rounded-sm underline underline-offset-2 hover:text-t1"
              >
                Settings
              </Link>
            </p>
          )}

          <div className="shrink-0">
            <Composer
              slots={composerSlots}
              uploads={s.uploads}
              onUploaded={s.setUploaded}
              onClearSlot={s.clearUploaded}
              textParams={textParams}
              values={s.values}
              onValue={onValue}
              randomSeed={s.randomSeed}
              onRandomSeed={s.setRandomSeed}
              chipParams={chipParams}
              advancedParams={advancedParams}
              picker={
                engine
                  ? {
                      rows: engines.map((e) => ({
                        id: e.id,
                        name: e.label,
                        description: `${e.license === "open" ? "Open weights" : "Partner"} · clips up to ${e.maxSeconds}s`,
                        thumbUrl: "",
                        logoUrl: brandLogo(e.label.split(" ")[0]),
                      })),
                      selectedId: engine.id,
                      onSelect: selectEngine,
                      label: engine.label,
                      thumbUrl: brandLogo(engine.label.split(" ")[0]) ?? "",
                    }
                  : undefined
              }
              estimate={preset?.estimate}
              unit="clip"
              partner={preset?.partner}
              submitLabel={s.demo ? "Preview sample" : "Generate"}
              submitDisabled={!ready}
              submitting={s.submitting}
              onSubmit={() => void s.submit()}
              error={s.error}
              workflowHref={preset ? `/workflows/${preset.id}` : undefined}
              promptPlaceholder="Describe the swap"
            />
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
