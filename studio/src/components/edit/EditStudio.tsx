"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, SECTION_ICONS, type IconName } from "../icons";
import { AddToSequence } from "@/components/sequence/AddToSequence";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Composer } from "../studio/Composer";
import { HistoryRail } from "../studio/HistoryRail";
import { STATUS_BADGE, isVideoPath } from "../studio/JobViews";
import { useStudio } from "../studio/useStudio";
import { VideoPicker } from "./VideoPicker";
import type { StudioJob, StudioParam, StudioPreset } from "@/components/toolStudioData";
import { useComfyHealth } from "@/lib/useComfyHealth";
import { EffectPicker } from "@/components/effects/EffectPicker";
import { effectPreset, type VideoEffect } from "@/components/effects/effects";
import { StageResult } from "../studio/StageResult";
import { failureLabel, mainPromptKey } from "../studio/studioUtils";
import { DEMO_MESSAGE } from "@/lib/demo";

export type EditToolMeta = {
  id: string;
  label: string;
  description: string;
  icon: IconName;
  presetId: string | null;
  maxSeconds?: number;
  template?: string;
};

export type ExtendModel = { id: string; label: string };

const TOOL_ICONS: Record<string, IconName> = {
  upscale: "arrowUpRight",
  "upscale-fast": "arrowUpRight",
  "fps-boost": "clock",
  depth: "sliders",
  reframe: "fit",
  remove: "trash",
  relight: "settings",
  restyle: "pencil",
  extend: "plus",
};

/** Status badge + progress for the running edit job. */
function EditJobCard({
  job,
  sourceUrl,
  toolId,
  sourceUploadId,
  onCancel,
  onNewEdit,
}: {
  job: StudioJob;
  sourceUrl?: string;
  toolId: string;
  sourceUploadId?: string;
  onCancel: () => void;
  onNewEdit: () => void;
}) {
  const output = job.outputs[0];
  const isVideo = output ? isVideoPath(output) : false;
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const router = useRouter();

  const join = async () => {
    if (!output || !sourceUploadId) return;
    setJoining(true);
    try {
      const res = await fetch("/api/edits/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId: sourceUploadId, result: output }),
      });
      if (res.ok) {
        setJoined(true);
        router.push("/editor");
      }
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="w-full max-w-[1100px] rounded-panel border border-line bg-s1 p-4">
      <div className="flex items-center justify-between gap-3">
        <Badge variant={STATUS_BADGE[job.status].variant}>
          {STATUS_BADGE[job.status].label}
        </Badge>
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
              className="h-full rounded-full bg-ac transition-[width] duration-200 motion-reduce:transition-none"
              style={{ width: `${Math.round(job.progress * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-caption text-t3">
            {job.message ?? "Waiting"}
          </p>
        </div>
      )}
      {job.status === "failed" && (
        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-body text-t1">{failureLabel(job.error)}</p>
            {job.error && (
              <p className="mt-0.5 text-caption text-t3">{job.error}</p>
            )}
          </div>
          <Button variant="ghost" size="xs" onClick={onNewEdit}>
            New edit
          </Button>
        </div>
      )}
      {job.status === "cancelled" && (
        <div className="mt-3">
          <Button variant="ghost" size="xs" onClick={onNewEdit}>
            New edit
          </Button>
        </div>
      )}
      {job.status === "succeeded" && output && (
        <div className="mt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {sourceUrl && (
              <div>
                <span className="mb-1 block text-caption text-t3">
                  Source
                </span>
                <video
                  src={sourceUrl}
                  controls
                  loop
                  muted
                  playsInline
                  className="w-full rounded-lg border border-line"
                />
              </div>
            )}
            <div>
              <span className="mb-1 block text-caption text-t3">
                Result
              </span>
              <video
                src={`/api/outputs/${output}`}
                controls
                loop
                muted
                playsInline
                className="w-full rounded-lg border border-line"
              />
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {isVideo && <AddToSequence path={output} />}
            <a
              href={`/api/outputs/${output}`}
              download
              className="rounded-full border border-line px-3 py-1.5 text-[12px] text-t2 hover:border-t3 hover:text-t1"
            >
              Download
            </a>
            <Button variant="ghost" size="xs" render={<Link href="/library" />}>
              Library
            </Button>
            <Button variant="ghost" size="xs" onClick={onNewEdit}>
              New edit
            </Button>
            {toolId === "extend" && sourceUploadId && (
              <Button
                variant="outline"
                size="xs"
                disabled={joining || joined}
                onClick={() => void join()}
              >
                {joined ? "In Editor" : "Join in Editor"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** The /edit studio: stage-first layout matching the video studio. */
export function EditStudio({
  tools,
  presets,
  extendModels,
  effects,
}: {
  tools: EditToolMeta[];
  presets: StudioPreset[];
  extendModels: ExtendModel[];
  effects?: VideoEffect[];
}) {
  const searchParams = useSearchParams();
  const [effectId, setEffectId] = useState(() =>
    effects?.find((effect) => effect.id === searchParams.get("effect"))?.id ??
    effects?.find((effect) => effect.presetId === searchParams.get("preset"))?.id ??
    effects?.[0]?.id,
  );
  const [extraPrompt, setExtraPrompt] = useState("");
  const activeEffect = effects?.find((effect) => effect.id === effectId) ?? effects?.[0];
  const configuredPresets = activeEffect
    ? presets.map((p) => p.id === activeEffect.presetId ? effectPreset(p, activeEffect, extraPrompt) : p)
    : presets;
  const s = useStudio("edit", configuredPresets);
  const health = useComfyHealth();
  const wantedTool = searchParams.get("tool");
  const [toolId, setToolId] = useState(
    () =>
      (wantedTool && tools.some((t) => t.id === wantedTool) && wantedTool) ||
      tools[0]?.id ||
      "",
  );
  const tool = activeEffect
    ? tools.find((t) => t.presetId === activeEffect.presetId)
    : effects ? undefined : tools.find((t) => t.id === toolId) ?? tools[0];
  const preset = tool?.presetId
    ? configuredPresets.find((p) => p.id === tool.presetId)
    : undefined;
  const isExtend = tool?.id === "extend";

  const [extendModel, setExtendModel] = useState(extendModels[0]?.id ?? "");
  const [extendPrompt, setExtendPrompt] = useState("");
  const [extendBusy, setExtendBusy] = useState(false);
  const [extendError, setExtendError] = useState<string | null>(null);

  const video = s.uploads["video"];
  const router = useRouter();

  // ?tool= preselects; ?preset= also maps (tool preset ids are edit-*).
  useEffect(() => {
    if (!tool?.presetId) return;
    if (s.preset?.id !== tool.presetId) {
      s.selectPreset(tool.presetId, { keep: true });
      if (activeEffect) {
        router.replace(`?effect=${activeEffect.id}&preset=${tool.presetId}`, { scroll: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool?.presetId]);

  // ?upload=<id> preselects the source video (?from= is handled by
  // useStudio into the first required input, which is the video).
  const wantUpload = searchParams.get("upload");
  useEffect(() => {
    if (!wantUpload || video) return;
    s.setUploaded("video", {
      uploadId: wantUpload,
      previewUrl: `/api/uploads/${wantUpload}`,
      name: wantUpload,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantUpload]);

  const textParams =
    preset?.params.filter(
      (p): p is Extract<StudioParam, { type: "text" }> =>
        p.type === "text" && !p.advanced,
    ) ?? [];
  const chipParams =
    preset?.params.filter((p) => p.type !== "text" && !p.advanced) ?? [];
  const advancedParams = preset?.params.filter((p) => p.advanced) ?? [];

  const promptKey = mainPromptKey(textParams);
  const ready = isExtend
    ? !!video && !!extendModel
    : !!preset &&
      (!effects || preset.id === s.preset?.id) &&
      preset.inputs.every((i) => !i.required || s.uploads[i.key]) &&
      (effects ||
        !promptKey ||
        String(s.values[promptKey] ?? "").trim() !== "");

  const submitExtend = async () => {
    if (!video || !extendModel) return;
    setExtendBusy(true);
    setExtendError(null);
    try {
      const res = await fetch("/api/edits/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId: video.uploadId,
          modelId: extendModel,
          prompt: extendPrompt,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        s.setJob(data.job as StudioJob);
      } else {
        setExtendError(data.error ?? data.message ?? "Extend failed");
      }
    } catch {
      setExtendError("Extend failed");
    } finally {
      setExtendBusy(false);
    }
  };

  const selectTool = (id: string) => {
    setToolId(id);
    setExtendError(null);
    router.replace(`?tool=${id}`, { scroll: false });
  };

  const selectEffect = (effect: VideoEffect) => {
    const target = presets.find((p) => p.id === effect.presetId);
    if (!target) return;
    setEffectId(effect.id);
    setExtraPrompt("");
    s.clearJob();
    s.selectPreset(effect.presetId, { keep: true });
    for (const param of effectPreset(target, effect, "").params) {
      if (param.type !== "text" && param.type !== "seed") {
        s.setValue(param.key, param.default);
      }
    }
    router.replace(`?effect=${effect.id}&preset=${effect.presetId}`, { scroll: false });
  };

  // Image inputs (e.g. the restyle reference) become composer upload slots;
  // the video itself uploads on the stage.
  const composerSlots =
    preset?.inputs
      .filter((i) => i.type === "image")
      .map((i) => ({
        key: i.key,
        label: i.label,
        required: i.required,
        type: "image" as const,
      })) ?? [];
  const composerTextParams: Extract<StudioParam, { type: "text" }>[] = isExtend
    ? [
        {
          type: "text",
          key: "__extend_prompt",
          label: "Prompt",
          default: "",
          placeholder: "What happens next",
        },
      ]
    : effects
      ? activeEffect?.prompt
        ? [
            {
              type: "text",
              key: "__effect_extra",
              label: "Extra prompt",
              default: "",
              placeholder: "Add details to the effect (optional)",
            },
          ]
        : []
      : textParams;
  const composerValues: Record<string, string | number | boolean> = {
    ...s.values,
    __extend_prompt: extendPrompt,
    __effect_extra: extraPrompt,
  };
  const onComposerValue = (key: string, v: string | number | boolean) => {
    if (key === "__extend_prompt") setExtendPrompt(String(v));
    else if (key === "__effect_extra") setExtraPrompt(String(v));
    else s.setValue(key, v);
  };
  const busy = s.submitting || extendBusy;

  return (
    <div className="grid min-h-full grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] bg-black lg:h-full lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-none">
      <section className="flex min-h-0 min-w-0 flex-col px-4 pt-5 pb-5 sm:px-6">
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
          {effects ? (
            <div>
              <h1 className="font-display text-h3 font-extrabold uppercase text-t1 font-stretch-[112.5%]">
                {activeEffect?.name ?? "Effects"}
              </h1>
              <p className="mt-1 max-w-[60ch] text-body text-t3">
                {activeEffect?.description ?? "No video effects available"}
              </p>
            </div>
          ) : tool && (
            <div>
              <h1 className="font-display text-h3 font-extrabold uppercase text-t1 font-stretch-[112.5%]">
                {tool.label}
              </h1>
              <p className="mt-1 max-w-[60ch] text-body text-t3">
                {tool.description}
              </p>
            </div>
          )}

          <div
            className="flex min-w-0 flex-1 items-center justify-center py-5 lg:min-h-[240px] lg:overflow-y-auto lg:[container-type:size]"
          >
            {s.job && effects ? (
              <div className="flex min-h-[240px] w-full max-w-[1100px] flex-col lg:h-full">
                <div className="flex min-h-0 flex-1 flex-col">
                  <StageResult
                    key={s.job.id}
                    job={s.job}
                    presetName={(id) => presets.find((p) => p.id === id)?.name ?? id}
                    onCancel={() => void s.cancel()}
                    aspect="wide"
                  />
                </div>
                <button type="button" onClick={s.clearJob} className="mt-3 self-start text-caption text-t2 underline underline-offset-4 hover:text-t1">
                  New effect
                </button>
              </div>
            ) : s.job ? (
              <EditJobCard
                job={s.job}
                sourceUrl={video?.previewUrl}
                toolId={tool?.id ?? ""}
                sourceUploadId={video?.uploadId}
                onCancel={() => void s.cancel()}
                onNewEdit={s.clearJob}
              />
            ) : (
              <div
                className="w-full max-w-[760px] shrink-0 lg:w-[min(100cqw,760px,calc((100cqh_-_40px)_*_16_/_9))]"
              >
                <VideoPicker
                  uploaded={video}
                  onUploaded={(u) => s.setUploaded("video", u)}
                  onClear={() => s.clearUploaded("video")}
                  maxSeconds={tool?.maxSeconds}
                />
              </div>
            )}
          </div>

          {!effects && <div
            role="group"
            aria-label="Video tools"
            className="mb-3 flex shrink-0 flex-wrap gap-1.5"
          >
            {tools.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTool(t.id)}
                aria-pressed={t.id === tool?.id}
                className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium whitespace-nowrap ${
                  t.id === tool?.id
                    ? "bg-s3 text-t1 ring-1 ring-inset ring-ac"
                    : "bg-s2 text-t2 hover:bg-s3 hover:text-t1"
                }`}
              >
                <Icon
                  d={SECTION_ICONS[TOOL_ICONS[t.id] ?? t.icon]}
                  className="h-4 w-4 shrink-0 [&_path[stroke]]:opacity-100"
                />
                {t.label}
              </button>
            ))}
          </div>}

          {effects && s.demo && (
            <p className="mb-3 text-caption text-t3">{DEMO_MESSAGE}</p>
          )}

          {effects && (
            <div className="mb-3">
              <EffectPicker
                effects={effects}
                activeId={activeEffect?.id}
                onSelect={selectEffect}
              />
            </div>
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
              textParams={composerTextParams}
              values={composerValues}
              onValue={onComposerValue}
              randomSeed={s.randomSeed}
              onRandomSeed={s.setRandomSeed}
              chipParams={chipParams}
              advancedParams={advancedParams}
              picker={
                isExtend
                  ? {
                      rows: extendModels.map((m) => ({
                        id: m.id,
                        name: m.label,
                        description: "",
                        thumbUrl: "",
                      })),
                      selectedId: extendModel,
                      onSelect: setExtendModel,
                      label:
                        extendModels.find((m) => m.id === extendModel)?.label ??
                        "Model",
                      thumbUrl: "",
                    }
                  : undefined
              }
              reserveInputRow
              estimate={preset?.estimate}
              unit="clip"
              partner={preset?.partner}
              submitLabel={!isExtend && s.demo ? "Preview sample" : "Generate"}
              submitDisabled={!ready}
              submitting={busy}
              onSubmit={() =>
                isExtend ? void submitExtend() : void s.submit()
              }
              error={s.error ?? extendError}
              workflowHref={preset ? `/workflows/${preset.id}` : undefined}
            />
          </div>
        </div>
      </section>

      <HistoryRail
        jobs={s.recent}
        job={s.job}
        presets={presets}
        activeId={s.job?.id}
        onSelect={s.setJob}
        aspect="wide"
      />
    </div>
  );
}
