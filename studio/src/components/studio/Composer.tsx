"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Icon, SECTION_ICONS } from "../icons";
import { EstimateCaption } from "./CreditEstimate";
import { ModelPicker, type PickerRow } from "./ModelPicker";
import { AdvancedChip, ParamChip } from "./ParamControls";
import { UploadCard } from "./UploadCard";
import type { Uploaded } from "./useStudio";
import type { EstimateUnit, RuntimeStats } from "@/lib/credits";
import type { StudioParam } from "@/components/toolStudioData";
import { mainPromptKey } from "./studioUtils";
import { Button } from "@/components/ui/button";

export type ComposerSlot = {
  key: string;
  label: string;
  required: boolean;
};

export type ComposerPicker = {
  rows: PickerRow[];
  selectedId: string;
  onSelect: (id: string) => void;
  label: string;
  modeLabel?: string;
  thumbUrl: string;
  isFork?: boolean;
};

export type ComposerModes = {
  options: { key: string; label: string }[];
  value?: string;
  onChange: (key: string) => void;
};

const MAX_TEXTAREA_HEIGHT = 126; // ~6 lines of text-body

/** One text param row: autosizing 1-6 line textarea. */
function ComposerTextarea({
  param,
  value,
  onChange,
  fallbackPlaceholder,
}: {
  param: Extract<StudioParam, { type: "text" }>;
  value: string;
  onChange: (v: string) => void;
  fallbackPlaceholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [value, param.key]);
  return (
    <textarea
      ref={ref}
      rows={1}
      aria-label={param.label}
      value={value}
      placeholder={param.placeholder ?? fallbackPlaceholder}
      onChange={(e) => onChange(e.target.value)}
      className="max-h-[126px] w-full resize-none bg-transparent text-body text-t1 outline-none placeholder:text-t3"
    />
  );
}

/** The bottom composer dock shared by the video, camera and image studios. */
export function Composer({
  slots,
  uploads,
  onUploaded,
  onClearSlot,
  textParams,
  values,
  onValue,
  randomSeed,
  onRandomSeed,
  chipParams,
  advancedParams,
  picker,
  modes,
  estimate,
  unit,
  partner,
  submitLabel,
  submitDisabled,
  submitting,
  onSubmit,
  error,
  workflowHref,
  promptPlaceholder,
}: {
  slots: ComposerSlot[];
  uploads: Record<string, Uploaded>;
  onUploaded: (key: string, u: Uploaded) => void;
  onClearSlot: (key: string) => void;
  textParams: Extract<StudioParam, { type: "text" }>[];
  values: Record<string, string | number | boolean>;
  onValue: (key: string, v: string | number | boolean) => void;
  randomSeed: boolean;
  onRandomSeed: (on: boolean) => void;
  chipParams: StudioParam[];
  advancedParams: StudioParam[];
  /** Model chip; omit on camera where the MoveStrip switches presets. */
  picker?: ComposerPicker;
  /** Explicit mode switcher shown above the upload slots. */
  modes?: ComposerModes;
  estimate?: RuntimeStats;
  /** Billing unit for the estimate caption. */
  unit: EstimateUnit;
  partner?: boolean;
  submitLabel: string;
  submitDisabled: boolean;
  submitting: boolean;
  onSubmit: () => void;
  error?: string | null;
  workflowHref?: string;
  /** Fallback placeholder for the main prompt textarea. */
  promptPlaceholder?: string;
}) {
  const promptKey = mainPromptKey(textParams);
  return (
    <div className="rounded-panel border border-[#444] bg-s2 p-2 has-[textarea:focus-visible]:border-ac/70">
      {modes && modes.options.length > 1 && (
        <div className="mb-2 flex w-max items-center gap-0.5 rounded-lg bg-s3 p-0.5">
          {modes.options.map((o) => (
            <button
              key={o.key}
              type="button"
              aria-pressed={o.key === modes.value}
              onClick={() => modes.onChange(o.key)}
              className={`rounded-[6px] px-2.5 py-1 text-caption font-medium whitespace-nowrap ${
                o.key === modes.value
                  ? "bg-s2 text-t1"
                  : "text-t3 hover:text-t1"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-start gap-2">
        {slots.length > 0 && (
          <div className="flex flex-none gap-1.5">
            {slots.map((slot) => (
              <UploadCard
                key={slot.key}
                compact
                label={slot.label}
                required={slot.required}
                uploaded={uploads[slot.key]}
                onUploaded={(u) => onUploaded(slot.key, u)}
                onClear={() => onClearSlot(slot.key)}
              />
            ))}
          </div>
        )}
        {textParams.length > 0 && (
          <div className="grid min-w-0 flex-1 gap-1.5 py-1">
            {textParams.map((param) => (
              <ComposerTextarea
                key={param.key}
                param={param}
                value={
                  param.key === promptKey
                    ? String(values[param.key] ?? "")
                    : String(values[param.key] ?? param.default)
                }
                fallbackPlaceholder={
                  param.key === promptKey ? promptPlaceholder : undefined
                }
                onChange={(v) => onValue(param.key, v)}
              />
            ))}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-line pt-2">
        <div className="flex w-full min-w-0 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] sm:w-auto sm:flex-1 [&::-webkit-scrollbar]:hidden">
          {picker && (
            <ModelPicker
              presets={picker.rows}
              selectedId={picker.selectedId}
              onSelect={picker.onSelect}
              side="top"
              align="start"
              sideOffset={12}
              trigger={
                <button
                  type="button"
                  aria-label={`Model: ${picker.label}`}
                  className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-s3 px-2 text-caption font-medium text-t1 hover:bg-[#2e2e2e]"
                >
                  <img
                    src={picker.thumbUrl}
                    alt=""
                    className="h-5 w-5 rounded object-cover"
                  />
                  <span className="whitespace-nowrap">{picker.label}</span>
                  {picker.isFork && (
                    <span className="rounded bg-s3 px-1 py-px text-caption font-bold uppercase text-t2">
                      Fork
                    </span>
                  )}
                  {picker.modeLabel && (
                    <span className="whitespace-nowrap font-normal text-t3">
                      {picker.modeLabel}
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
          {workflowHref && (
            <Link
              href={workflowHref}
              aria-label="Open workflow"
              title="Workflow"
              className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-s3 text-t2 hover:bg-[#2e2e2e] hover:text-t1"
            >
              <Icon d={SECTION_ICONS.workflows} className="h-4 w-4" />
            </Link>
          )}
          {chipParams.map((param) => (
            <ParamChip
              key={param.key}
              param={param}
              value={
                param.type === "seed"
                  ? randomSeed
                    ? "random"
                    : Number(values[param.key] ?? 0)
                  : values[param.key]
              }
              randomSeed={randomSeed}
              onChange={(v) => onValue(param.key, v)}
              onRandomSeed={onRandomSeed}
              variant="bar"
              side="top"
            />
          ))}
          <AdvancedChip
            params={advancedParams}
            values={values}
            randomSeed={randomSeed}
            onChange={onValue}
            onRandomSeed={onRandomSeed}
          />
        </div>
        <div className="flex w-full items-center gap-1.5 sm:w-auto sm:flex-none">
          <EstimateCaption stats={estimate} unit={unit} partner={partner} />
          <Button
            className="h-9 flex-1 rounded-lg px-5 sm:flex-none"
            loading={submitting}
            disabled={submitDisabled || submitting}
            onClick={onSubmit}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
      {error && (
        <p className="mt-1.5 text-caption text-destructive">{error}</p>
      )}
    </div>
  );
}
