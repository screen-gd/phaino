"use client";

import { useState } from "react";
import { Icon, SECTION_ICONS } from "../icons";
import { formatParamValue, paramKind, type ParamKind } from "./studioUtils";
import type { StudioParam } from "@/components/toolStudioData";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const KIND_ICON: Record<ParamKind, keyof typeof SECTION_ICONS> = {
  duration: "clock",
  aspect: "frame",
  resolution: "gem",
  seed: "dice",
  other: "sliders",
};

function ChipBody({
  param,
  formatted,
  variant,
}: {
  param: StudioParam;
  formatted: string;
  variant: "panel" | "bar";
}) {
  return (
    <span className="flex h-full items-center justify-center gap-1.5 px-2.5">
      <Icon
        d={SECTION_ICONS[KIND_ICON[paramKind(param)]]}
        className={variant === "panel" ? "h-4 w-4 text-t3" : "h-3.5 w-3.5 text-t3"}
      />
      {param.type === "seed" ? (
        <span className="whitespace-nowrap">
          Seed <span className="text-t3">· {formatted}</span>
        </span>
      ) : (
        <span className="whitespace-nowrap">{formatted}</span>
      )}
    </span>
  );
}

/** A param chip (icon + value only) opening a typed popover. */
export function ParamChip({
  param,
  value,
  randomSeed,
  onChange,
  onRandomSeed,
  variant = "panel",
  side = "top",
}: {
  param: StudioParam;
  value: string | number | boolean | undefined;
  /** For seed params: "random" sentinel or the number. */
  randomSeed: boolean;
  onChange: (v: string | number | boolean) => void;
  onRandomSeed?: (on: boolean) => void;
  variant?: "panel" | "bar";
  side?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const formatted = formatParamValue(param, value);
  // Chips never truncate: choice labels drop any parenthetical qualifier
  // (the popover list keeps the full label).
  const chipLabel =
    param.type === "choice" ? formatted.split(" (")[0] : formatted;
  const cls =
    variant === "panel"
      ? "h-12 w-full rounded-xl bg-s2 text-body font-medium text-t1"
      : "h-8 shrink-0 rounded-lg bg-s3 text-caption font-medium text-t1 hover:bg-[#2e2e2e]";

  const popover = (() => {
    if (param.type === "choice") {
      const current = value ?? param.default;
      return (
        <div className="w-[200px] p-1.5">
          <h5 className="px-2.5 pt-1.5 pb-1 text-caption text-t3">
            {param.label}
          </h5>
          <ul className="grid">
            {param.options.map((o) => (
              <li key={String(o.value)}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className="flex h-9 w-full items-center justify-between rounded-lg px-2.5 text-left text-body text-t1 hover:bg-s3"
                >
                  {o.label}
                  {current === o.value && (
                    <Icon d={SECTION_ICONS.check} className="h-4 w-4 text-ac" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    if (param.type === "int") {
      const current = Number(value ?? param.default);
      return (
        <div className="grid w-[300px] gap-3 p-3.5">
          <div className="flex items-center justify-between">
            <h5 className="text-caption text-t3">
              Choose {param.label.toLowerCase()}
            </h5>
            <span className="text-body font-semibold text-t1">{current}</span>
          </div>
          <Slider
            min={param.min}
            max={param.max}
            step={1}
            value={current}
            onValueChange={(v) =>
              onChange(Array.isArray(v) ? Number(v[0]) : Number(v))
            }
          />
        </div>
      );
    }
    if (param.type === "float") {
      const current = Number(value ?? param.default);
      return (
        <div className="grid w-[300px] gap-3 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-caption text-t3">
              Choose {param.label.toLowerCase()}
            </h5>
            <Input
              type="number"
              min={param.min}
              max={param.max}
              step={param.step}
              value={current}
              onChange={(e) => onChange(Number(e.target.value))}
              className="h-8 w-20"
            />
          </div>
          <Slider
            min={param.min}
            max={param.max}
            step={param.step}
            value={current}
            onValueChange={(v) =>
              onChange(Array.isArray(v) ? Number(v[0]) : Number(v))
            }
          />
        </div>
      );
    }
    if (param.type === "seed") {
      return (
        <div className="w-[260px] p-3">
          <div className="flex items-center justify-between">
            <h5 className="text-body text-t1">Seed</h5>
            <label className="flex items-center gap-2 text-caption text-t3">
              Random
              <Switch
                checked={randomSeed}
                onCheckedChange={(v) => {
                  const on = v === true;
                  if (!on && !Number(value)) {
                    onChange(
                      Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
                    );
                  }
                  onRandomSeed?.(on);
                }}
              />
            </label>
          </div>
          {!randomSeed && (
            <div className="mt-3 flex items-center gap-1.5">
              <Input
                type="number"
                inputMode="numeric"
                value={Number(value ?? 0)}
                placeholder="Any whole number"
                onChange={(e) => onChange(Number(e.target.value))}
                className="min-w-0 flex-1"
              />
              <button
                type="button"
                aria-label="New random seed"
                title="New random seed"
                onClick={() => {
                  onChange(
                    Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
                  );
                  onRandomSeed?.(false);
                }}
                className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-s3 text-t2 hover:bg-[#2e2e2e] hover:text-t1"
              >
                <Icon d={SECTION_ICONS.dice} className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      );
    }
    // text params fall back to an input inside the popover
    const current = String(value ?? param.default);
    return (
      <div className="grid w-[260px] gap-2 p-3.5">
        <h5 className="text-caption text-t3">{param.label}</h5>
        <Input
          value={current}
          placeholder={param.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  })();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`${param.label}: ${formatted}`}
            className={cls}
          />
        }
      >
        <ChipBody param={param} formatted={chipLabel} variant={variant} />
      </PopoverTrigger>
      <PopoverPopup
        side={side}
        align="center"
        sideOffset={8}
        className="rounded-xl border-line bg-s2 p-0 shadow-xl shadow-black/50"
      >
        {popover}
      </PopoverPopup>
    </Popover>
  );
}

type AdvancedProps = {
  params: StudioParam[];
  values: Record<string, string | number | boolean>;
  randomSeed: boolean;
  onChange: (key: string, v: string | number | boolean) => void;
  onRandomSeed?: (on: boolean) => void;
};

function AdvancedField({ param, value, randomSeed, onChange, onRandomSeed }: {
  param: StudioParam;
  value: string | number | boolean | undefined;
  randomSeed: boolean;
  onChange: (v: string | number | boolean) => void;
  onRandomSeed?: (on: boolean) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="flex items-center justify-between text-caption text-t3">
        {param.label}
        {param.type === "int" && (
          <span className="font-mono text-t1">{Number(value ?? param.default)}</span>
        )}
        {param.type === "float" && (
          <Input
            type="number"
            min={param.min}
            max={param.max}
            step={param.step}
            value={Number(value ?? param.default)}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-8 w-20"
          />
        )}
      </span>
      {param.type === "choice" ? (
        <Select
          value={String(value ?? param.default)}
          onValueChange={(v) => {
            const opt = param.options.find((o) => String(o.value) === String(v));
            onChange(opt ? opt.value : String(v));
          }}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {param.options.map((o) => (
              <SelectItem key={String(o.value)} value={String(o.value)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      ) : param.type === "int" ? (
        <Slider
          min={param.min}
          max={param.max}
          step={1}
          value={Number(value ?? param.default)}
          onValueChange={(v) => onChange(Array.isArray(v) ? Number(v[0]) : Number(v))}
        />
      ) : param.type === "float" ? (
        <Slider
          min={param.min}
          max={param.max}
          step={param.step}
          value={Number(value ?? param.default)}
          onValueChange={(v) => onChange(Array.isArray(v) ? Number(v[0]) : Number(v))}
        />
      ) : param.type === "seed" ? (
        <div className="grid gap-2">
          <span className="flex items-center justify-between text-caption text-t2">
            Random
            <Switch
              checked={randomSeed}
              onCheckedChange={(v) => onRandomSeed?.(v === true)}
            />
          </span>
          <Input
            type="number"
            disabled={randomSeed}
            value={randomSeed ? "" : Number(value ?? 0)}
            placeholder="Random"
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      ) : (
        <Textarea
          value={String(value ?? param.default)}
          placeholder={param.placeholder}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

/** Rows of advanced controls, for the collapsed panel and the popover. */
export function AdvancedRows({
  params,
  values,
  randomSeed,
  onChange,
  onRandomSeed,
}: AdvancedProps) {
  return (
    <div className="grid gap-3">
      {params.map((param) => (
        <AdvancedField
          key={param.key}
          param={param}
          value={param.type === "seed"
            ? randomSeed
              ? "random"
              : Number(values[param.key] ?? 0)
            : values[param.key]}
          randomSeed={randomSeed}
          onChange={(v) => onChange(param.key, v)}
          onRandomSeed={onRandomSeed}
        />
      ))}
    </div>
  );
}

/** Collapsed "Advanced" block at the bottom of the Video/Camera form. */
export function AdvancedDisclosure(props: AdvancedProps) {
  const [open, setOpen] = useState(false);
  if (props.params.length === 0) return null;
  return (
    <div className="rounded-xl bg-s2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-full items-center justify-between px-3 text-body font-medium text-t1"
      >
        <span className="flex items-center gap-1.5">
          <Icon d={SECTION_ICONS.sliders} className="h-4 w-4 text-t3" />
          Advanced
        </span>
        <Icon
          d={SECTION_ICONS.chevronDown}
          className={`h-3.5 w-3.5 text-t3 transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && <div className="px-3 pb-3"><AdvancedRows {...props} /></div>}
    </div>
  );
}

/** An "Advanced" chip in the Image prompt bar. */
export function AdvancedChip(props: AdvancedProps) {
  if (props.params.length === 0) return null;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Advanced options"
            className="h-8 shrink-0 rounded-lg bg-s3 text-caption font-medium text-t1 hover:bg-[#2e2e2e]"
          />
        }
      >
        <span className="flex h-full items-center justify-center gap-1.5 px-2.5">
          <Icon d={SECTION_ICONS.sliders} className="h-3.5 w-3.5 text-t3" />
          <span className="truncate">Advanced</span>
        </span>
      </PopoverTrigger>
      <PopoverPopup
        side="top"
        align="center"
        sideOffset={8}
        className="w-[300px] rounded-xl border-line bg-s2 p-3.5 shadow-xl shadow-black/50"
      >
        <AdvancedRows {...props} />
      </PopoverPopup>
    </Popover>
  );
}
