"use client";

import { useMemo } from "react";
import { Composer } from "./Composer";
import { EmptyStage } from "./EmptyStage";
import { HistoryRail } from "./HistoryRail";
import { MoveStrip } from "./MoveStrip";
import { StageResult } from "./StageResult";
import { useModelMaps } from "./modelRows";
import { stackThumbs } from "./studioUtils";
import { useStudio } from "./useStudio";
import { MODE_LABELS, type ModeKey } from "@/lib/modes";
import type {
  StudioModel,
  StudioParam,
  StudioPreset,
} from "@/components/toolStudioData";

const MODE_ORDER: ModeKey[] = ["t2v", "i2v", "flf2v"];

/** Stage-first tool page for video and camera moves. */
export function VideoStudio({
  category,
  presets,
  models = [],
}: {
  category: "video" | "camera";
  presets: StudioPreset[];
  models?: StudioModel[];
}) {
  const s = useStudio(category, presets, { prefillKey: "image" });

  const preset = s.preset;
  const presetName = (id: string) =>
    presets.find((p) => p.id === id)?.name ?? id;

  // Model mode maps: preset id -> model, preset id -> mode key.
  const { modelOf, modeOf, pickerRows } = useModelMaps(models, presets);
  const model = preset ? modelOf.get(preset.id) : undefined;
  const activeMode = preset ? modeOf.get(preset.id) : undefined;

  // Upload slots come from the active preset's declared inputs; model modes
  // get the First frame / Last frame labels.
  const slots = useMemo(() => {
    if (!preset) return [];
    return preset.inputs.map((i, index) => ({
      key: i.key,
      label: model
        ? index === 0
          ? "First frame"
          : index === 1
            ? "Last frame"
            : i.label
        : i.label,
      required: i.required,
      type: i.type,
    }));
  }, [model, preset]);

  // Explicit mode switch for models with more than one mode.
  const modeOptions = useMemo(
    () =>
      model
        ? MODE_ORDER.filter((m) => model.modes[m]).map((m) => ({
            key: m,
            label: MODE_LABELS[m],
          }))
        : [],
    [model],
  );

  const switchMode = (mode: string) => {
    if (!model || !preset) return;
    const nextId = model.modes[mode as ModeKey];
    if (!nextId || nextId === preset.id) return;
    const next = presets.find((p) => p.id === nextId);
    const oldFirstKey = preset.inputs[0]?.key;
    const newFirstKey = next?.inputs[0]?.key;
    const carried = oldFirstKey ? s.uploads[oldFirstKey] : undefined;
    s.selectPreset(nextId, { keep: true });
    if (carried && newFirstKey && newFirstKey !== oldFirstKey) {
      s.setUploaded(newFirstKey, carried);
    }
  };

  const textParams =
    preset?.params.filter(
      (p): p is Extract<StudioParam, { type: "text" }> =>
        p.type === "text" && !p.advanced,
    ) ?? [];
  const chipParams =
    preset?.params.filter((p) => p.type !== "text" && !p.advanced) ?? [];
  const advancedParams = preset?.params.filter((p) => p.advanced) ?? [];

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
          {s.stageJob ? (
            <StageResult
              key={s.stageJob.id}
              job={s.stageJob}
              presetName={presetName}
              onCancel={() => void s.cancel()}
              aspect="wide"
            />
          ) : preset ? (
            <EmptyStage
              thumbs={emptyThumbs}
              shape="wide"
              text={
                category === "camera"
                  ? "Add a first frame to move the camera"
                  : slots.some((s) => s.required)
                    ? "Add a first frame to start"
                    : activeMode === "t2v" || slots.length === 0
                      ? "Describe a shot"
                      : "Describe a shot or add a first frame"
              }
            />
          ) : null}
        </div>
        {category === "camera" && (
          <div className="mb-3">
            <MoveStrip
              presets={presets}
              selectedId={preset?.id ?? ""}
              onSelect={(id) => s.selectPreset(id, { keep: true })}
            />
          </div>
        )}
        <div>
          <Composer
            slots={slots}
            uploads={s.uploads}
            onUploaded={s.setUploaded}
            onClearSlot={s.clearUploaded}
            textParams={textParams}
            values={s.values}
            onValue={s.setValue}
            randomSeed={s.randomSeed}
            onRandomSeed={s.setRandomSeed}
            chipParams={chipParams}
            advancedParams={advancedParams}
            picker={
              category !== "camera" && preset
                ? {
                    rows: pickerRows,
                    selectedId: model?.defaultPresetId ?? preset.id,
                    onSelect: s.selectPreset,
                    label: model ? model.label : preset.name,
                    modeLabel: activeMode
                      ? MODE_LABELS[activeMode]
                      : undefined,
                    thumbUrl:
                      preset.thumbUrl ||
                      (pickerRows.find((r) => r.id === preset.id)?.logoUrl ?? ""),
                    isFork: preset.isFork,
                  }
                : undefined
            }
            modes={
              category !== "camera" && modeOptions.length > 1
                ? {
                    options: modeOptions,
                    value: activeMode,
                    onChange: switchMode,
                  }
                : undefined
            }
            estimate={preset?.estimate}
            unit="clip"
            partner={preset?.partner}
            submitLabel={s.demo ? "Preview sample" : "Generate"}
            submitDisabled={!s.ready}
            submitting={s.submitting}
            onSubmit={() => void s.submit()}
            error={s.error}
            workflowHref={preset ? `/workflows/${preset.id}` : undefined}
            promptPlaceholder="Describe the shot"
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
        onCancel={(id) => void s.cancel(id)}
        aspect="wide"
        failed={s.recentFailed}
      />
    </div>
  );
}
