"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "../icons";
import { AddToSequence } from "@/components/sequence/AddToSequence";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EstimateCaption } from "../studio/CreditEstimate";
import { RecentGrid, STATUS_BADGE, isVideoPath } from "../studio/JobViews";
import { AdvancedDisclosure, ParamChip } from "../studio/ParamControls";
import { mainPromptKey } from "../studio/studioUtils";
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
}: {
  job: StudioJob;
  sourceUrl?: string;
  toolId: string;
  sourceUploadId?: string;
  onCancel: () => void;
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
    <div className="rounded-panel border border-line bg-s1 p-4">
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
        <p className="mt-3 text-body text-destructive">
          {job.error ?? "Generation failed"}
        </p>
      )}
      {job.status === "succeeded" && output && (
        <div className="mt-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {sourceUrl && (
              <div>
                <span className="mb-1 block text-[10px] uppercase text-t3">
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
              <span className="mb-1 block text-[10px] uppercase text-t3">
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

/** The /edit studio: tool list + form on the left, result + history right. */
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
  const promptKey = mainPromptKey(textParams);

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

  return (
    <div className="grid h-full grid-cols-[320px_minmax(0,1fr)] gap-2 px-4 pb-4">
      <aside className="flex max-h-full flex-col self-start overflow-hidden rounded-panel border border-line bg-s1">
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
          <div className="flex h-12 items-stretch px-1">
            <span className="flex items-center text-body font-semibold text-t1">
              Edit Video
            </span>
          </div>

          <div className="grid gap-1">
            {tools.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTool(t.id)}
                className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors ${
                  t.id === tool?.id
                    ? "border-ac bg-s2"
                    : "border-transparent hover:bg-s2"
                }`}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-s3 text-t2">
                  <Icon d={t.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-t1">
                    {t.label}
                  </span>
                  <span className="block truncate text-[11px] text-t3">
                    {t.description}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {tool && (
            <div className="flex flex-col gap-2 border-t border-line pt-2">
              <VideoPicker
                uploaded={video}
                onUploaded={(u) => s.setUploaded("video", u)}
                onClear={() => s.clearUploaded("video")}
              />
              {tool.maxSeconds && (
                <p className="px-1 text-[11px] text-t3">
                  Uses the first {tool.maxSeconds}s.
                </p>
              )}

              {preset?.inputs
                .filter((i) => i.type === "image")
                .map((i) => (
                  <UploadCard
                    key={i.key}
                    label={i.label}
                    required={i.required}
                    uploaded={s.uploads[i.key]}
                    onUploaded={(u) => s.setUploaded(i.key, u)}
                    onClear={() => s.clearUploaded(i.key)}
                  />
                ))}

              {isExtend ? (
                <>
                  <div className="grid grid-cols-2 gap-1.5">
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
                        value={
                          param.key === promptKey
                            ? String(s.values[param.key] ?? "")
                            : String(s.values[param.key] ?? param.default)
                        }
                        placeholder={param.placeholder}
                        onChange={(e) => s.setValue(param.key, e.target.value)}
                        className="w-full resize-none bg-transparent text-body text-t1 outline-none placeholder:text-t3"
                      />
                    </div>
                  ))}
                  {chipParams.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
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
          )}
        </div>

        <div className="flex flex-col gap-1.5 border-t border-line p-2">
          {health && health.status !== "ok" && (
            <p className="text-xs text-t3">
              Comfy Cloud is not connected.{" "}
              <Link href="/settings" className="text-t1 underline underline-offset-2">
                Settings
              </Link>
            </p>
          )}
          {(s.error || extendError) && (
            <p className="text-xs text-destructive">{s.error ?? extendError}</p>
          )}
          {preset && (
            <div className="flex justify-end">
              <EstimateCaption stats={preset.estimate} partner={preset.partner} />
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
      </aside>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-panel border border-line bg-s1">
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {s.job ? (
            <EditJobCard
              job={s.job}
              sourceUrl={video?.previewUrl}
              toolId={tool?.id ?? ""}
              sourceUploadId={video?.uploadId}
              onCancel={() => void s.cancel()}
            />
          ) : (
            <div className="grid h-full place-items-center">
              <p className="text-center text-t3">
                Pick a tool, drop a video, Generate.
              </p>
            </div>
          )}
          {s.recent.length > 0 && (
            <div className="mt-4">
              <span className="mb-2 block text-caption text-t3">History</span>
              <RecentGrid
                recent={s.recent}
                presets={presets}
                activeId={s.job?.id}
                onSelect={(row) => s.setJob(row)}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
