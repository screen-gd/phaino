"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, SECTION_ICONS } from "../icons";
import { CurrentJob, RecentGrid } from "./JobViews";
import { EstimateCaption } from "./CreditEstimate";
import { ModelPicker } from "./ModelPicker";
import { useModelMaps } from "./modelRows";
import { AdvancedChip, ParamChip } from "./ParamControls";
import { UploadCard } from "./UploadCard";
import { useStudio } from "./useStudio";
import { MODE_LABELS, resolveImageMode, type ModeKey } from "@/lib/modes";
import type {
  StudioModel,
  StudioParam,
  StudioPreset,
} from "@/components/toolStudioData";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useComfyHealth } from "@/lib/useComfyHealth";

const TILTS = ["-rotate-8", "-rotate-3", "rotate-3", "rotate-8"];

function promptParamOf(
  preset: StudioPreset | undefined,
): Extract<StudioParam, { type: "text" }> | undefined {
  return preset?.params.find(
    (p): p is Extract<StudioParam, { type: "text" }> =>
      p.type === "text" && p.key.toLowerCase().includes("prompt"),
  );
}

/** Image tool: centered hero + bottom prompt bar, no side panel. */
export function ImageStudio({
  presets,
  models = [],
}: {
  presets: StudioPreset[];
  models?: StudioModel[];
}) {
  const s = useStudio("image", presets, { prefillKey: "image" });
  const health = useComfyHealth();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [attachOpen, setAttachOpen] = useState(false);

  const preset = s.preset;

  const { modelOf, modeOf, pickerRows } = useModelMaps(models, presets);
  const model = preset ? modelOf.get(preset.id) : undefined;
  const activeMode = preset ? modeOf.get(preset.id) : undefined;

  // Reference slot bound to the edit mode's image input key.
  const refSlotKey = useMemo(() => {
    if (!model?.modes.edit) return undefined;
    return presets.find((p) => p.id === model.modes.edit)?.inputs[0]?.key;
  }, [model, presets]);
  const slots = useMemo(() => {
    if (!preset) return [];
    if (model && refSlotKey) {
      return [{ key: refSlotKey, label: "Reference", required: false }];
    }
    return preset.inputs.map((i) => ({
      key: i.key,
      label: i.label,
      required: i.required,
    }));
  }, [model, preset, refSlotKey]);

  const modeRes =
    model && preset
      ? resolveImageMode(
          Object.keys(model.modes) as ModeKey[],
          !!(refSlotKey && s.uploads[refSlotKey]),
        )
      : null;
  const modeError = modeRes?.error ?? null;

  // Filling the reference switches to the model's edit mode.
  useEffect(() => {
    if (!model || !preset) return;
    const target = modeRes?.mode ? model.modes[modeRes.mode] : undefined;
    if (target && target !== preset.id) {
      s.selectPreset(target, { keep: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model?.id, preset?.id, modeRes?.mode, s.uploads, refSlotKey]);
  const promptParam = promptParamOf(preset);
  const extraText =
    preset?.params.filter(
      (p) => p.type === "text" && p.key !== promptParam?.key && !p.advanced,
    ) ?? [];
  const chipParams =
    preset?.params.filter((p) => p.type !== "text" && !p.advanced) ?? [];
  const advancedParams = preset?.params.filter((p) => p.advanced) ?? [];
  const presetName = (id: string) =>
    presets.find((p) => p.id === id)?.name ?? id;

  const hasRuns = s.job != null || s.recent.length > 0;
  const collage = presets.slice(0, 4);

  function autosize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
  }

  return (
    <div className="relative h-full">
      {health && health.status !== "ok" && (
        <div className="absolute top-3 left-1/2 z-20 flex h-[58px] -translate-x-1/2 items-center gap-3 rounded-full border border-line bg-s2 p-2.5 pl-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-s3 text-t2">
            <Icon d={SECTION_ICONS.alert} className="h-4 w-4" />
          </span>
          <span className="text-sm text-t1">
            Comfy Cloud is not connected.
          </span>
          <Button
            size="xs"
            variant="secondary"
            className="rounded-full bg-white text-black hover:bg-white/90"
            render={<Link href="/settings" />}
          >
            Settings
          </Button>
        </div>
      )}

      {!hasRuns ? (
        <div className="grid h-full place-items-center pb-36">
          <div className="grid justify-items-center gap-5 px-4">
            <div className="flex items-start justify-center">
              {collage.map((p, i) => (
                <img
                  key={p.id}
                  src={p.thumbUrl}
                  alt=""
                  className={`h-[150px] w-[150px] object-cover ${
                    i === 2 ? "rounded-full" : "rounded-2xl"
                  } border-[3px] border-white/20 ${
                    i > 0 ? "-ml-6" : ""
                  } ${TILTS[i]}`}
                />
              ))}
            </div>
            <h1 className="text-center font-display text-4xl font-extrabold uppercase leading-tight text-t1 [font-stretch:112.5%]">
              Start creating with
              <br />
              <span className="text-ac">{preset?.name}</span>
            </h1>
            <p className="max-w-md text-center text-base text-t3">
              {preset?.description}
            </p>
          </div>
        </div>
      ) : (
        <div className="h-full overflow-y-auto px-4 pt-4 pb-44">
          <div className="mx-auto grid max-w-4xl gap-3">
            {s.job && (
              <CurrentJob
                job={s.job}
                presetName={presetName}
                onCancel={() => void s.cancel()}
              />
            )}
            <RecentGrid
              recent={s.recent}
              presets={presets}
              activeId={s.job?.id}
              onSelect={(row) => s.setJob(row)}
            />
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 w-[min(880px,calc(100%-32px))] -translate-x-1/2">
        <div className="rounded-[20px] border border-line bg-s1 p-1">
          <div className="flex items-end gap-3 rounded-2xl bg-s2 p-3">
            <div className="min-w-0 flex-1">
              <textarea
                ref={taRef}
                rows={1}
                value={String(
                  (promptParam && s.values[promptParam.key]) ??
                    promptParam?.default ??
                    "",
                )}
                placeholder={
                  promptParam?.placeholder ??
                  "Describe the scene you imagine"
                }
                onChange={(e) => {
                  if (promptParam) s.setValue(promptParam.key, e.target.value);
                  autosize(e.currentTarget);
                }}
                className="max-h-[100px] w-full resize-none bg-transparent text-body text-t1 outline-none placeholder:text-t3"
              />
              <div className="mt-1 flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {preset && slots.length > 0 && (
                  <Popover open={attachOpen} onOpenChange={setAttachOpen}>
                    <PopoverTrigger
                      render={
                        <button
                          type="button"
                          aria-label="Attach image"
                          className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-white/5 text-t2 hover:bg-white/10"
                        >
                          <Icon d={SECTION_ICONS.plus} className="h-4 w-4" />
                        </button>
                      }
                    />
                    <PopoverPopup
                      side="top"
                      align="start"
                      sideOffset={12}
                      className="w-[340px] rounded-2xl border-line bg-s2 p-2.5 shadow-xl shadow-black/50"
                    >
                      <div
                        className={`grid gap-2 ${
                          slots.length > 1 ? "grid-cols-2" : "grid-cols-1"
                        }`}
                      >
                        {slots.map((inp) => (
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
                    </PopoverPopup>
                  </Popover>
                )}
                {preset && (
                  <Link
                    href={`/workflows/${preset.id}`}
                    aria-label={`View the ${preset.name} workflow`}
                    className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-white/5 text-t2 hover:bg-white/10"
                  >
                    <Icon d={SECTION_ICONS.workflows} className="h-4 w-4" />
                  </Link>
                )}
                {preset && (
                  <ModelPicker
                    presets={pickerRows}
                    selectedId={model?.defaultPresetId ?? preset.id}
                    onSelect={s.selectPreset}
                    side="top"
                    align="start"
                    sideOffset={12}
                    trigger={
                      <button
                        type="button"
                        aria-label={`Model: ${model ? model.label : preset.name}`}
                        className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white/5 px-2 text-sm font-medium text-t1 hover:bg-white/10"
                      >
                        <img
                          src={preset.thumbUrl}
                          alt=""
                          className="h-5 w-5 rounded object-cover"
                        />
                        <span className="max-w-28 truncate">
                          {model ? model.label : preset.name}
                        </span>
                        {activeMode && (
                          <span className="text-[10px] font-normal text-t3">
                            {MODE_LABELS[activeMode]}
                          </span>
                        )}
                        <Icon
                          d={SECTION_ICONS.chevronDown}
                          className="h-3 w-3 text-t3"
                        />
                      </button>
                    }
                  />
                )}
                {chipParams.map((param: StudioParam) => (
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
                    variant="bar"
                    side="top"
                  />
                ))}
                {extraText.map((param) => (
                  <ParamChip
                    key={param.key}
                    param={param}
                    value={s.values[param.key]}
                    randomSeed={s.randomSeed}
                    onChange={(v) => s.setValue(param.key, v)}
                    variant="bar"
                    side="top"
                  />
                ))}
                <AdvancedChip
                  params={advancedParams}
                  values={s.values}
                  randomSeed={s.randomSeed}
                  onChange={(key, v) => s.setValue(key, v)}
                  onRandomSeed={s.setRandomSeed}
                />
              </div>
            </div>
            <Button
              className="h-20 w-[120px] flex-none rounded-xl font-display text-xs font-bold uppercase tracking-wide"
              loading={s.submitting}
              disabled={!s.ready || !!modeError || s.submitting}
              onClick={() => void s.submit()}
            >
              Generate
            </Button>
          </div>
        </div>
        <div className="mt-1.5 flex h-4 items-center gap-3 px-2">
          {(s.error || modeError) && (
            <p className="truncate text-xs text-destructive">
              {s.error ?? modeError}
            </p>
          )}
          <span className="ml-auto">
            {preset && (
              <EstimateCaption stats={preset.estimate} partner={preset.partner} />
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
