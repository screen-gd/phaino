"use client";

import { useRef, useState, type ReactElement } from "react";
import { Icon, SECTION_ICONS } from "../icons";
import { filterPresets } from "./studioUtils";

/** A picker row: a model (one row per model) or a standalone preset/fork. */
export type PickerRow = {
  id: string;
  name: string;
  description: string;
  thumbUrl: string;
  isFork?: boolean;
  model?: { label?: string };
};
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@/components/ui/popover";

function ModelList({
  presets,
  rows,
  selectedId,
  active,
  onHover,
  onPick,
}: {
  presets: PickerRow[];
  rows: PickerRow[];
  selectedId: string;
  active: number;
  onHover: (idx: number) => void;
  onPick: (id: string) => void;
}) {
  if (presets.length === 0) return null;
  return (
    <ul className="grid gap-1">
      {presets.map((p) => {
        const idx = rows.indexOf(p);
        const selected = p.id === selectedId;
        return (
          <li key={p.id}>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              data-active={idx === active || undefined}
              onClick={() => onPick(p.id)}
              onMouseEnter={() => onHover(idx)}
              className="flex h-[52px] w-full items-center gap-3 rounded-xl px-2.5 text-left hover:bg-white/5 data-[active]:bg-white/5"
            >
              <img
                src={p.thumbUrl}
                alt=""
                className="h-9 w-9 flex-none rounded-lg object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-t1">
                  {p.name}
                  {p.isFork && (
                    <span className="rounded bg-white/10 px-1 py-px text-[10px] font-bold uppercase text-t2">
                      Fork
                    </span>
                  )}
                </span>
                <span className="block truncate text-[11px] text-t3">
                  {p.description}
                </span>
              </span>
              {selected && (
                <Icon d={SECTION_ICONS.check} className="h-4 w-4 flex-none text-ac" />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Searchable model popover: arrows + Enter select. */
export function ModelPicker({
  presets,
  selectedId,
  onSelect,
  side = "bottom",
  align = "start",
  sideOffset = 8,
  trigger,
}: {
  presets: PickerRow[];
  selectedId: string;
  onSelect: (id: string) => void;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  /** The rendered trigger element (e.g. the Model row or a chip). */
  trigger: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const rows = filterPresets(presets, query);

  const pick = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => {
        const next =
          e.key === "ArrowDown"
            ? Math.min(a + 1, rows.length - 1)
            : Math.max(a - 1, 0);
        listRef.current
          ?.querySelectorAll("[role=option]")
          [next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const p = rows[active];
      if (p) pick(p.id);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setQuery("");
          const idx = presets.findIndex((p) => p.id === selectedId);
          setActive(idx >= 0 ? idx : 0);
        }
      }}
    >
      <PopoverTrigger render={trigger} />
      <PopoverPopup
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="max-h-[560px] w-[400px] rounded-2xl border-line bg-s2 p-0 shadow-xl shadow-black/50"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Icon d={SECTION_ICONS.search} className="h-4 w-4 flex-none text-t3" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Search models"
            className="h-10 min-w-0 flex-1 bg-transparent text-body text-t1 outline-none placeholder:text-t3"
          />
        </div>
        <div ref={listRef} className="max-h-[500px] overflow-y-auto p-1.5">
          {rows.length === 0 ? (
            <p className="px-2.5 py-6 text-center text-caption text-t3">
              No models match
            </p>
          ) : (
            <ModelList
              presets={rows}
              rows={rows}
              selectedId={selectedId}
              active={active}
              onHover={setActive}
              onPick={pick}
            />
          )}
        </div>
      </PopoverPopup>
    </Popover>
  );
}
