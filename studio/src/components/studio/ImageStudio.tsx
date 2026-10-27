"use client";

import { useEffect, useMemo } from "react";
import { Composer } from "./Composer";
import { EmptyStage } from "./EmptyStage";
import { HistoryRail } from "./HistoryRail";
import { StageResult } from "./StageResult";
import { useModelMaps } from "./modelRows";
import { stackThumbs } from "./studioUtils";
import { useStudio } from "./useStudio";
import { MODE_LABELS, resolveImageMode, type ModeKey } from "@/lib/modes";
import type {
  StudioModel,
  StudioParam,
  StudioPreset,
} from "@/components/toolStudioData";

function promptParamOf(
  preset: StudioPreset | undefined,
): Extract<StudioParam, { type: "text" }> | undefined {
  return preset?.params.find(
    (p): p is Extract<StudioParam, { type: "text" }> =>
      p.type === "text" && p.key.toLowerCase().includes("prompt"),
  );
}

/** Image tool on the shared stage-first layout. */
export function ImageStudio({
  presets,
  models = [],
}: {
  presets: StudioPreset[];
  models?: StudioModel[];
}) {
  const s = useStudio("image", presets, { prefillKey: "image" });

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

  const emptyThumbs = stackThumbs(presets);

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-none">
      <section className="flex min-h-0 min-w-0 flex-col px-6 pt-5 pb-5">
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        {preset && (
          <div>
            <h1 className="font-display text-h3 font-extrabold uppercase text-t1 font-stretch-[112.5%]">
              {model ? model.label : preset.name}
            </h1>
            <p className="mt-1 max-w-[60ch] text-body text-t3">
              {preset.description}
            </p>
          </div>
        )}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto py-4">
          {s.job ? (
            <StageResult
              key={s.job.id}
              job={s.job}
              presetName={presetName}
              onCancel={() => void s.cancel()}
              aspect="square"
            />
          ) : preset ? (
            <EmptyStage
              thumbs={emptyThumbs}
              shape="square"
              text="Describe an image to start"
            />
          ) : null}
        </div>
        <div>
          <Composer
            slots={slots}
            uploads={s.uploads}
            onUploaded={s.setUploaded}
            onClearSlot={s.clearUploaded}
            textParams={promptParam ? [promptParam] : []}
            values={s.values}
            onValue={s.setValue}
            randomSeed={s.randomSeed}
            onRandomSeed={s.setRandomSeed}
            chipParams={[...chipParams, ...extraText]}
            advancedParams={advancedParams}
            picker={
              preset
                ? {
                    rows: pickerRows,
                    selectedId: model?.defaultPresetId ?? preset.id,
                    onSelect: s.selectPreset,
                    label: model ? model.label : preset.name,
                    modeLabel: activeMode
                      ? MODE_LABELS[activeMode]
                      : undefined,
                    thumbUrl: preset.thumbUrl,
                    isFork: preset.isFork,
                  }
                : undefined
            }
            estimate={preset?.estimate}
            unit="image"
            partner={preset?.partner}
            submitLabel={s.demo ? "Preview sample" : "Generate"}
            submitDisabled={!s.ready || !!modeError}
            submitting={s.submitting}
            onSubmit={() => void s.submit()}
            error={s.error ?? modeError}
            workflowHref={preset ? `/workflows/${preset.id}` : undefined}
            promptPlaceholder="Describe the image"
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
        aspect="square"
      />
    </div>
  );
}
