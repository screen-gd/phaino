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
import { AdvancedDisclosure, ParamChip } from "../studio/ParamControls";
import { UploadCard } from "../studio/UploadCard";
import { useStudio } from "../studio/useStudio";
import { VideoPicker } from "./VideoPicker";
import type { StudioJob, StudioParam, StudioPreset } from "@/components/toolStudioData";
import { useComfyHealth } from "@/lib/useComfyHealth";

export type EditToolMeta = {
  id: string;
  label: string;
  description: string;
  icon: IconName;
  presetId: string | null;
  maxSeconds?: number;
};

export type ExtendModel = { id: string; label: string };

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
              className="rounded-full border border-line px-3 py-1.5 text-[12px] text-t2 hover:bg-s2 hover:text-t1"
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
}: {
  tools: EditToolMeta[];
  presets: StudioPreset[];
  extendModels: ExtendModel[];
}) {
  const searchParams = useSearchParams();
  const s = useStudio("edit", presets);
  const health = useComfyHealth();
  const wantedTool = searchParams.get("tool");
  const [toolId, setToolId] = useState(
    () =>
      (wantedTool && tools.some((t) => t.id === wantedTool) && wantedTool) ||
      tools[0]?.id ||
      "",
  );
  const tool = tools.find((t) => t.id === toolId) ?? tools[0];
  const preset = tool?.presetId
    ? presets.find((p) => p.id === tool.presetId)
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
    : !!preset && preset.inputs.every((i) => !i.required || s.uploads[i.key]);

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

  const imageInputs =
    preset?.inputs.filter((i) => i.type === "image") ?? [];

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-none">
      <section className="flex min-h-0 min-w-0 flex-col px-6 pt-5 pb-5">
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
          {tool && (
            <div>
              <h1 className="font-display text-h3 font-extrabold uppercase text-t1 font-stretch-[112.5%]">
                {tool.label}
              </h1>
              <p className="mt-1 text-body text-t3">{tool.description}</p>
            </div>
          )}

          <div
            className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto py-4"
            style={{ containerType: "size" }}
          >
            {s.job ? (
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
                className="flex flex-col items-center gap-2"
                style={{
                  width: "min(100cqw, 960px, calc((100cqh - 24px) * 16 / 9))",
                }}
              >
                <VideoPicker
                  uploaded={video}
                  onUploaded={(u) => s.setUploaded("video", u)}
                  onClear={() => s.clearUploaded("video")}
                />
                {tool?.maxSeconds != null && tool.maxSeconds > 0 && (
                  <p className="text-caption text-t3">
                    Uses the first {tool.maxSeconds}s.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tools.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTool(t.id)}
                aria-pressed={t.id === tool?.id}
                className={`flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-body whitespace-nowrap ${
                  t.id === tool?.id
                    ? "border-ac text-t1"
                    : "border-line text-t2 hover:text-t1"
                }`}
              >
                <Icon d={SECTION_ICONS[t.icon]} className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>

          <div className="rounded-panel border border-line bg-s1 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="flex min-w-0 flex-1 flex-col gap-3">
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
                    <div className="rounded-xl bg-white/5 p-2.5">
                      <label className="mb-1 block text-caption text-t3">
                        Prompt
                      </label>
                      <textarea
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
                    {textParams.map((param) => (
                      <div key={param.key} className="rounded-xl bg-white/5 p-2.5">
                        <label className="mb-1 block text-caption text-t3">
                          {param.label}
                        </label>
                        <textarea
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
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        {chipParams.map((param) => (
                          <ParamChip
                            key={param.key}
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
                            variant="panel"
                            side="top"
                          />
                        ))}
                      </div>
                    )}
                    <AdvancedDisclosure
                      params={advancedParams}
                      values={s.values}
                      randomSeed={s.randomSeed}
                      onChange={(key, v) => s.setValue(key, v)}
                      onRandomSeed={s.setRandomSeed}
                    />
                  </>
                )}
              </div>

              <div className="flex w-full flex-col gap-1.5 lg:w-[200px] lg:shrink-0">
                {health && health.status !== "ok" && (
                  <p className="text-xs text-t3">
                    Comfy Cloud is not connected.{" "}
                    <Link
                      href="/settings"
                      className="text-t1 underline underline-offset-2"
                    >
                      Settings
                    </Link>
                  </p>
                )}
                {(s.error || extendError) && (
                  <p className="text-xs text-destructive">
                    {s.error ?? extendError}
                  </p>
                )}
                {preset && (
                  <div className="flex justify-end">
                    <EstimateCaption
                      stats={preset.estimate}
                      partner={preset.partner}
                    />
                  </div>
                )}
                <Button
                  className="h-12 w-full rounded-xl text-[15px] font-semibold"
                  loading={s.submitting || extendBusy}
                  disabled={!ready || s.submitting || extendBusy}
                  onClick={() =>
                    isExtend ? void submitExtend() : void s.submit()
                  }
                >
                  Generate
                </Button>
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
