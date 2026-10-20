"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon, SECTION_ICONS } from "../icons";
import { CurrentJob, RecentGrid } from "./JobViews";
import { ModelPicker } from "./ModelPicker";
import { ParamChip } from "./ParamControls";
import { UploadCard } from "./UploadCard";
import { filterPresets } from "./studioUtils";
import { useStudio } from "./useStudio";
import type { StudioJob, StudioPreset } from "@/components/toolStudioData";
import { Button } from "@/components/ui/button";
import { useComfyHealth } from "@/lib/useComfyHealth";

const STEPS = [
  {
    title: "Add image",
    body: "Drop in your first frame.",
    icon: SECTION_ICONS.upload,
  },
  {
    title: "Pick a model",
    body: "Open weights, one click.",
    icon: SECTION_ICONS.sliders,
  },
  {
    title: "Generate",
    body: "Your shot lands in History.",
    icon: SECTION_ICONS.arrowUpRight,
  },
];

/** Higgsfield-style tool page for video and camera moves. */
export function VideoStudio({
  category,
  presets,
}: {
  category: "video" | "camera";
  presets: StudioPreset[];
}) {
  const s = useStudio(category, presets);
  const health = useComfyHealth();
  const [view, setView] = useState<"history" | "how" | "browse" | null>(null);
  const [browseQuery, setBrowseQuery] = useState("");

  const preset = s.preset;
  const presetName = (id: string) =>
    presets.find((p) => p.id === id)?.name ?? id;

  const textParams = preset?.params.filter((p) => p.type === "text") ?? [];
  const chipParams =
    preset?.params.filter((p) => p.type !== "text") ?? [];
  const browseFiltered = filterPresets(presets, browseQuery);

  const hasRuns = s.job != null || s.recent.length > 0;
  const activeView = view ?? (hasRuns ? "history" : "how");

  return (
    <div className="grid h-full grid-cols-[320px_minmax(0,1fr)] gap-2 px-4 pb-4">
      <aside className="flex max-h-full flex-col self-start overflow-hidden rounded-panel border border-line bg-s1">
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        <div className="flex h-12 items-stretch gap-4 px-1">
          <Link
            href="/video"
            className={`relative flex items-center text-body ${
              category === "video"
                ? "font-semibold text-t1 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-t1"
                : "text-t3 hover:text-t1"
            }`}
          >
            Create Video
          </Link>
          <Link
            href="/camera"
            className={`relative flex items-center text-body ${
              category === "camera"
                ? "font-semibold text-t1 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-t1"
                : "text-t3 hover:text-t1"
            }`}
          >
            Camera moves
          </Link>
        </div>

        {preset && (
          <div className="relative h-[130px] overflow-hidden rounded-xl">
            <img
              src={preset.thumbUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute top-1.5 right-1.5 flex gap-1">
              <Link
                href={`/workflows/${preset.id}`}
                className="flex h-7 items-center gap-1 rounded-md bg-black/50 px-2 text-xs font-semibold text-t1 hover:bg-black/70"
              >
                <Icon d={SECTION_ICONS.workflows} className="h-3 w-3" />
                Workflow
              </Link>
              <button
                type="button"
                onClick={() => setView("browse")}
                className="flex h-7 items-center gap-1 rounded-md bg-black/50 px-2 text-xs font-semibold text-t1 hover:bg-black/70"
              >
                <Icon d={SECTION_ICONS.pencil} className="h-3 w-3" />
                Change
              </button>
            </div>
            <div className="absolute bottom-2 left-2.5">
              <b className="block font-display text-[22px] font-extrabold uppercase leading-tight text-ac [font-stretch:112.5%]">
                {preset.name}
              </b>
              <span className="text-xs text-white/80">
                {preset.model.label}
              </span>
            </div>
          </div>
        )}

        {preset && preset.inputs.length > 0 && (
          <div
            className={`grid gap-2 ${
              preset.inputs.length > 1 ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            {preset.inputs.map((inp) => (
              <UploadCard
                key={inp.key}
                label={inp.label}
                required={inp.required}
                uploaded={s.uploads[inp.key]}
                onUploaded={(u) => s.setUploaded(inp.key, u)}
                onClear={() => s.clearUploaded(inp.key)}
              />
            ))}
          </div>
        )}

        {textParams.map((param) => (
          <div key={param.key} className="rounded-xl bg-white/5 p-2.5">
            <label className="mb-1 block text-caption text-t3">
              {param.label}
            </label>
            <textarea
              rows={param.key.toLowerCase().includes("prompt") ? 4 : 1}
              value={String(s.values[param.key] ?? param.default)}
              placeholder={param.placeholder}
              onChange={(e) => s.setValue(param.key, e.target.value)}
              className="w-full resize-none bg-transparent text-body text-t1 outline-none placeholder:text-t3"
            />
          </div>
        ))}

        {preset && (
          <ModelPicker
            presets={presets}
            selectedId={preset.id}
            onSelect={s.selectPreset}
            side="right"
            align="start"
            sideOffset={16}
            trigger={
              <button
                type="button"
                className="flex h-12 w-full items-center justify-between gap-2 rounded-lg bg-s2 px-3 text-left"
              >
                <span>
                  <span className="block text-[11px] text-t3">Model</span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-t1">
                    {preset.name}
                    {preset.isFork && (
                      <span className="rounded bg-white/10 px-1 py-px text-[10px] font-bold uppercase text-t2">
                        Fork
                      </span>
                    )}
                  </span>
                </span>
                <Icon
                  d={SECTION_ICONS.chevronDown}
                  className="h-3.5 w-3.5 -rotate-90 text-t3"
                />
              </button>
            }
          />
        )}

        {chipParams.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
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
          {s.error && <p className="text-xs text-destructive">{s.error}</p>}
          <Button
            className="h-12 w-full rounded-xl text-[15px] font-semibold"
            loading={s.submitting}
            disabled={!s.ready || s.submitting}
            onClick={() => void s.submit().then(() => setView(null))}
          >
            Generate
          </Button>
        </div>
      </aside>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-panel border border-line bg-s1">
        {activeView === "browse" ? (
          <>
            <div className="flex items-center justify-between gap-3 p-3">
              <span className="text-caption text-t3">All models</span>
              <div className="flex items-center gap-2">
                <div className="flex h-8 items-center gap-2 rounded-lg bg-s2 px-2.5">
                  <Icon d={SECTION_ICONS.search} className="h-3.5 w-3.5 text-t3" />
                  <input
                    value={browseQuery}
                    onChange={(e) => setBrowseQuery(e.target.value)}
                    placeholder="Search models"
                    className="w-36 bg-transparent text-body text-t1 outline-none placeholder:text-t3"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setView(null)}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-s2 text-t3 hover:text-t1"
                >
                  <Icon d={SECTION_ICONS.x} className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 pt-0">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2">
                {browseFiltered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      s.selectPreset(p.id);
                      setView(null);
                    }}
                    className={`relative aspect-[3/4] overflow-hidden rounded-xl border-2 text-left ${
                      p.id === preset?.id
                        ? "border-ac"
                        : "border-transparent hover:border-t3"
                    }`}
                  >
                    <img
                      src={p.thumbUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-8">
                      <span className="flex items-center gap-1.5">
                        <b className="font-display text-base font-bold uppercase leading-tight text-t1 [font-stretch:112.5%]">
                          {p.name}
                        </b>
                        {p.isFork && (
                          <span className="rounded bg-white/20 px-1 py-px text-[10px] font-bold uppercase text-t1">
                            Fork
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              {browseFiltered.length === 0 && (
                <p className="py-16 text-center text-caption text-t3">
                  No models match
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-1.5 p-3">
              {(["history", "how"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setView(t)}
                  className={`h-8 rounded-full px-3 text-xs font-medium ${
                    activeView === t
                      ? "bg-white/10 text-t1"
                      : "text-t3 hover:text-t1"
                  }`}
                >
                  {t === "history" ? "History" : "How it works"}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 pt-0">
              {activeView === "history" ? (
                <div className="grid gap-3">
                  {s.job && (
                    <CurrentJob
                      job={s.job}
                      presetName={presetName}
                      onCancel={() => void s.cancel()}
                    />
                  )}
                  {s.recent.length > 0 ? (
                    <RecentGrid
                      recent={s.recent}
                      presets={presets}
                      activeId={s.job?.id}
                      onSelect={(row: StudioJob) => s.setJob(row)}
                    />
                  ) : (
                    !s.job && (
                      <p className="py-24 text-center text-t3">No runs yet.</p>
                    )
                  )}
                </div>
              ) : (
                preset && (
                  <div className="grid gap-8">
                    <div className="flex items-end justify-between gap-6">
                      <div className="min-w-0">
                        <h2 className="font-display text-4xl font-extrabold uppercase leading-tight text-t1 [font-stretch:112.5%]">
                          {preset.name}
                        </h2>
                        <p className="mt-1.5 max-w-md text-base text-t3">
                          {preset.description}
                        </p>
                      </div>
                      <img
                        src={preset.thumbUrl}
                        alt=""
                        className="aspect-video w-full max-w-[520px] flex-none rounded-xl border border-line object-cover"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      {STEPS.map((step, i) => (
                        <div
                          key={step.title}
                          className="rounded-xl border border-line bg-s2 p-4"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <span className="grid h-9 w-9 place-items-center rounded-lg bg-s3 text-t2">
                              <Icon d={step.icon} className="h-4 w-4" />
                            </span>
                            <span className="font-mono text-xs text-t3">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                          </div>
                          <h3 className="font-display text-base font-bold uppercase text-t1 [font-stretch:112.5%]">
                            {step.title}
                          </h3>
                          <p className="mt-1 text-caption text-t3">{step.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
