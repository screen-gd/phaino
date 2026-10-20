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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

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
      <span className="truncate">{formatted}</span>
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
  const cls =
    variant === "panel"
      ? "h-10 w-full rounded-lg bg-s2 text-body font-medium text-t1"
      : "h-8 shrink-0 rounded-lg bg-white/5 text-sm font-medium text-t1 hover:bg-white/10";

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
                  className="flex h-9 w-full items-center justify-between rounded-lg px-2.5 text-left text-body text-t1 hover:bg-white/5"
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
    if (param.type === "seed") {
      return (
        <div className="grid w-[260px] gap-3 p-3.5">
          <label className="flex items-center justify-between text-body text-t1">
            <span>Random</span>
            <Switch
              checked={randomSeed}
              onCheckedChange={(v) => onRandomSeed?.(v === true)}
            />
          </label>
          <Input
            type="number"
            disabled={randomSeed}
            value={randomSeed ? "" : Number(value ?? 0)}
            placeholder="Random"
            onChange={(e) => onChange(Number(e.target.value))}
          />
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
        <ChipBody param={param} formatted={formatted} variant={variant} />
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
