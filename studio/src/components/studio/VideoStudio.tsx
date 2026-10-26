"use client";

import { useEffect, useMemo } from "react";
import { Composer } from "./Composer";
import { EmptyStage } from "./EmptyStage";
import { HistoryRail } from "./HistoryRail";
import { MoveStrip } from "./MoveStrip";
import { StageResult } from "./StageResult";
import { useModelMaps } from "./modelRows";
import { stackThumbs } from "./studioUtils";
import { useStudio } from "./useStudio";
import { MODE_LABELS, resolveVideoMode, type ModeKey } from "@/lib/modes";
import type {
  StudioModel,
  StudioParam,
  StudioPreset,
} from "@/components/toolStudioData";

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

  // Frame slots come from the model's modes, not the active preset.
  const firstSlotKey = useMemo(() => {
    if (!model) return undefined;
    const pid = model.modes.i2v ?? model.modes.flf2v;
    return presets.find((p) => p.id === pid)?.inputs[0]?.key;
  }, [model, presets]);
  const lastSlotKey = useMemo(() => {
    if (!model?.modes.flf2v) return undefined;
    return presets.find((p) => p.id === model.modes.flf2v)?.inputs[1]?.key;
  }, [model, presets]);

  const slots = useMemo(() => {
    if (!preset) return [];
    if (model) {
      const out: { key: string; label: string; required: boolean }[] = [];
      if (firstSlotKey) {
        out.push({
          key: firstSlotKey,
          label: "First frame",
          required: !model.modes.t2v,
        });
      }
      if (lastSlotKey) {
        out.push({ key: lastSlotKey, label: "Last frame", required: false });
      }
      return out;
    }
    return preset.inputs.map((i) => ({
      key: i.key,
      label: i.label,
      required: i.required,
    }));
  }, [model, preset, firstSlotKey, lastSlotKey]);

  // Live mode resolution: filled frames pick i2v/flf2v/t2v.
  const modeRes =
    model && preset
      ? resolveVideoMode(
          Object.keys(model.modes) as ModeKey[],
          !!(firstSlotKey && s.uploads[firstSlotKey]),
          !!(lastSlotKey && s.uploads[lastSlotKey]),
        )
      : null;
  const modeError = modeRes?.error ?? null;

  useEffect(() => {
    if (!model || !preset) return;
    const target = modeRes?.mode ? model.modes[modeRes.mode] : undefined;
    if (target && target !== preset.id) {
      s.selectPreset(target, { keep: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model?.id, preset?.id, modeRes?.mode, s.uploads, firstSlotKey, lastSlotKey]);

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
          {s.job ? (
            <StageResult
              key={s.job.id}
              job={s.job}
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
                    thumbUrl: preset.thumbUrl,
                    isFork: preset.isFork,
                  }
                : undefined
            }
            estimate={preset?.estimate}
            partner={preset?.partner}
            submitLabel={s.demo ? "Preview sample" : "Generate"}
            submitDisabled={!s.ready || !!modeError}
            submitting={s.submitting}
            onSubmit={() => void s.submit()}
            error={s.error ?? modeError}
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
        aspect="wide"
      />
    </div>
  );
}
