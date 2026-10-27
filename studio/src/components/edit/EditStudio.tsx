"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, SECTION_ICONS, type IconName } from "../icons";
import { AddToSequence } from "@/components/sequence/AddToSequence";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EstimateCaption } from "../studio/CreditEstimate";
import { HistoryRail } from "../studio/HistoryRail";
import { STATUS_BADGE, isVideoPath } from "../studio/JobViews";
import { AdvancedChip, ParamChip } from "../studio/ParamControls";
import { UploadCard } from "../studio/UploadCard";
import { useStudio } from "../studio/useStudio";
import { VideoPicker } from "./VideoPicker";
import type { StudioJob, StudioParam, StudioPreset } from "@/components/toolStudioData";
import { useComfyHealth } from "@/lib/useComfyHealth";
import { EffectPicker } from "@/components/effects/EffectPicker";
import { effectPreset, type VideoEffect } from "@/components/effects/effects";
import { StageResult } from "../studio/StageResult";
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

const PARAM_CHIP_STYLE =
  "[&>button]:h-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-line [&>button]:bg-transparent [&>button]:font-mono [&>button]:text-caption [&>button]:text-t2 [&>button:hover]:border-t3 [&>button:hover]:bg-transparent [&>button:hover]:text-t1";

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
          <p className="text-body text-destructive">
            {job.error ?? "Generation failed"}
          </p>
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

  const ready = isExtend
    ? !!video && !!extendModel
    : !!preset && (!effects || preset.id === s.preset?.id) &&
      preset.inputs.every((i) => !i.required || s.uploads[i.key]);

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

  const imageInputs =
    preset?.inputs.filter((i) => i.type === "image") ?? [];
  const compactComposer =
    !isExtend && (effects ? !activeEffect?.prompt : textParams.length === 0) && imageInputs.length === 0;
  const busy = s.submitting || extendBusy;

  return (
    <div className="grid min-h-full grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] bg-black lg:h-full lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-none">
      <section className="flex min-h-0 min-w-0 flex-col px-4 pt-5 pb-5 sm:px-6">
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
          {effects ? (
            <div>
              <h1 className="font-display text-h3 font-semibold text-t1">Effects</h1>
              {activeEffect && preset ? (
                <>
                  <p className="mt-1 font-mono text-caption text-t3">
                    {activeEffect.name} · {preset.id} · {tool?.template ?? preset.model.label}
                  </p>
                  <Link href={`/workflows/${preset.id}`} className="mt-1 inline-block text-caption text-t2 underline underline-offset-4 hover:text-t1">
                    Open the workflow
                  </Link>
                </>
              ) : (
                <p className="mt-1 text-body text-t3">No video effects available</p>
              )}
              <EffectPicker effects={effects} activeId={activeEffect?.id} onSelect={selectEffect} />
            </div>
          ) : tool && (
            <div>
              <h1 className="font-display text-h3 font-semibold text-t1">
                {tool.label === "FPS Boost"
                  ? "FPS boost"
                  : tool.label.charAt(0) + tool.label.slice(1).toLowerCase()}
              </h1>
              <p className="mt-1 text-body text-t3">{tool.description}</p>
            </div>
          )}

          <div
            className="flex min-w-0 flex-1 items-center justify-center py-5 lg:min-h-[240px] lg:overflow-y-auto lg:[container-type:size]"
          >
            {s.job && effects ? (
              <div className="flex min-h-[240px] w-full max-w-[1100px] flex-col lg:h-full">
                <StageResult
                  key={s.job.id}
                  job={s.job}
                  presetName={(id) => presets.find((p) => p.id === id)?.name ?? id}
                  onCancel={() => void s.cancel()}
                  aspect="wide"
                />
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
                className="w-full max-w-[960px] shrink-0 lg:w-[min(100cqw,960px,calc((100cqh_-_40px)_*_16_/_9))]"
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
            className="mb-3 flex shrink-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {tools.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTool(t.id)}
                aria-pressed={t.id === tool?.id}
                className={`flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-body whitespace-nowrap ${
                  t.id === tool?.id
                    ? "border-ac text-t1"
                    : "border-line text-t2 hover:border-t3 hover:text-t1"
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

          <div className="shrink-0 rounded-lg border border-line bg-black p-3">
            <div className={`flex gap-3 ${compactComposer ? "flex-wrap items-center" : "flex-col xl:flex-row xl:items-end"}`}>
              <div className={`flex min-w-0 gap-3 ${compactComposer ? "flex-wrap items-center" : "flex-1 flex-col"}`}>
                {isExtend ? (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {extendModels.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setExtendModel(m.id)}
                          className={`rounded-lg border px-2 py-1.5 text-left text-[12px] font-medium ${
                            m.id === extendModel
                              ? "border-ac text-t1"
                              : "border-line text-t3 hover:text-t1"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <div className="rounded-lg border border-line p-2.5 focus-within:border-t3">
                      <label
                        htmlFor="extend-prompt"
                        className="mb-1 block text-caption text-t3"
                      >
                        Prompt
                      </label>
                      <textarea
                        id="extend-prompt"
                        rows={3}
                        value={extendPrompt}
                        placeholder="Continue the shot"
                        onChange={(e) => setExtendPrompt(e.target.value)}
                        className="w-full resize-none bg-transparent text-body text-t1 outline-none placeholder:text-t3"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {effects ? activeEffect?.prompt && (
                      <div className="rounded-lg border border-line p-2.5 focus-within:border-t3">
                        <label htmlFor="effect-prompt" className="mb-1 block text-caption text-t3">Extra prompt (optional)</label>
                        <textarea
                          id="effect-prompt"
                          rows={2}
                          value={extraPrompt}
                          placeholder="Add details to the effect"
                          onChange={(event) => setExtraPrompt(event.target.value)}
                          className="w-full resize-none bg-transparent text-body text-t1 outline-none placeholder:text-t3"
                        />
                      </div>
                    ) : textParams.map((param) => (
                      <div
                        key={param.key}
                        className="rounded-lg border border-line p-2.5 focus-within:border-t3"
                      >
                        <label
                          htmlFor={`edit-${param.key}`}
                          className="mb-1 block text-caption text-t3"
                        >
                          {param.label}
                        </label>
                        <textarea
                          id={`edit-${param.key}`}
                          rows={param.key.toLowerCase().includes("prompt") ? 3 : 1}
                          value={String(s.values[param.key] ?? param.default)}
                          placeholder={param.placeholder}
                          onChange={(e) => s.setValue(param.key, e.target.value)}
                          className="w-full resize-none bg-transparent text-body text-t1 outline-none placeholder:text-t3"
                        />
                      </div>
                    ))}
                    {imageInputs.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {imageInputs.map((i) => (
                          <UploadCard
                            key={i.key}
                            label={i.label}
                            required={i.required}
                            uploaded={s.uploads[i.key]}
                            onUploaded={(u) => s.setUploaded(i.key, u)}
                            onClear={() => s.clearUploaded(i.key)}
                            compact
                          />
                        ))}
                      </div>
                    )}
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
                  </>
                )}
              </div>

              <div className={`flex min-w-0 gap-3 ${compactComposer ? "ml-auto w-full flex-wrap items-center justify-between sm:w-auto sm:min-w-[260px] sm:flex-1 sm:justify-end" : "w-full flex-col xl:w-auto xl:shrink-0"}`}>
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
                {(s.error || extendError) && (
                  <p role="alert" className="text-xs text-destructive">
                    {s.error ?? extendError}
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
                  className={`h-10 shrink-0 rounded-lg border border-ac px-5 text-body font-semibold text-t1 enabled:hover:text-ac disabled:cursor-not-allowed disabled:border-line disabled:text-t3 ${compactComposer ? "" : "w-full"}`}
                  aria-busy={busy}
                  disabled={!ready || busy}
                  onClick={() =>
                    isExtend ? void submitExtend() : void s.submit()
                  }
                >
                  {busy ? "Generating…" : "Generate"}
                </button>
              </div>
            </div>
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
