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
  /** Family heading this row sits under, e.g. "FLUX". */
  group?: string;
  /** Short mode labels shown next to the name, e.g. ["T2V","I2V"]. */
  modes?: string[];
  /** Brand logo shown when the row has no preview render. */
  logoUrl?: string;
};
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@/components/ui/popover";

type Level1Item =
  | { kind: "family"; name: string; rows: PickerRow[] }
  | { kind: "row"; row: PickerRow };

const SECTION_HEAD = "px-2.5 pt-2 pb-1 text-caption text-t3 first:pt-1";
const ROW_CLS =
  "flex h-11 w-full items-center gap-2.5 rounded-xl px-2.5 text-left hover:bg-s3 data-[active]:bg-s3";

function SectionHead({ children }: { children: string }) {
  return <p className={SECTION_HEAD}>{children}</p>;
}

/** Row thumbnail; models without a preview get their brand logo or a letter. */
function Thumb({ src, name, logo }: { src: string; name: string; logo?: string }) {
  const [failed, setFailed] = useState(false);
  if ((!src || failed) && logo) {
    return (
      <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-s3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" className="h-4 w-4" />
      </span>
    );
  }
  if (!src || failed) {
    return (
      <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-s3 text-caption font-semibold text-t2">
        {name.charAt(0)}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className="h-7 w-7 flex-none rounded-lg object-cover"
    />
  );
}

function ModeChips({ modes }: { modes?: string[] }) {
  if (!modes || modes.length === 0) return null;
  return (
    <span className="flex flex-none gap-1">
      {modes.map((m) => (
        <span key={m} className="rounded border border-line px-1.5 text-caption text-t2">
          {m}
        </span>
      ))}
    </span>
  );
}

function ModelRow({
  row,
  selected,
  active,
  caption,
  onHover,
  onPick,
}: {
  row: PickerRow;
  selected: boolean;
  active: boolean;
  caption?: string;
  onHover: () => void;
  onPick: (id: string) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      data-active={active || undefined}
      onClick={() => onPick(row.id)}
      onMouseEnter={onHover}
      className={ROW_CLS}
    >
      <Thumb src={row.thumbUrl} name={row.name} logo={row.logoUrl} />
      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-body font-medium text-t1">
        <span className="truncate">{row.name}</span>
        {row.isFork && (
          <span className="rounded bg-s3 px-1 py-px text-caption font-bold uppercase text-t2">
            Fork
          </span>
        )}
        {caption && (
          <span className="truncate font-normal text-caption text-t3">
            {caption}
          </span>
        )}
      </span>
      <ModeChips modes={row.modes} />
      {/* Fixed slot so chips line up whether or not the row is selected. */}
      <span className="h-4 w-4 flex-none">
        {selected && <Icon d={SECTION_ICONS.check} className="h-4 w-4 text-ac" />}
      </span>
    </button>
  );
}

/** Searchable model popover: a family opens its models in a side flyout. */
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
  const [family, setFamily] = useState<string | null>(null);
  // Keyboard focus: the main list or the flyout.
  const [pane, setPane] = useState<"main" | "sub">("main");
  const [active, setActive] = useState(0);
  const [subActive, setSubActive] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Multi-model families open a flyout; single-model families and
  // ungrouped rows (forks, standalone presets) stay as direct rows.
  const families = new Map<string, PickerRow[]>();
  const direct: PickerRow[] = [];
  for (const r of presets) {
    if (r.group) {
      const rows = families.get(r.group) ?? [];
      rows.push(r);
      families.set(r.group, rows);
    } else {
      direct.push(r);
    }
  }
  const multi = [...families.entries()].filter(([, rows]) => rows.length > 1);
  const singles = [...families.values()]
    .filter((rows) => rows.length === 1)
    .map((rows) => rows[0]);

  const level1: Level1Item[] = [
    ...multi.map(([name, rows]) => ({ kind: "family" as const, name, rows })),
    ...singles.map((row) => ({ kind: "row" as const, row })),
    ...direct.map((row) => ({ kind: "row" as const, row })),
  ];

  const searching = query.trim().length > 0;
  const filtered = searching ? filterPresets(presets, query) : [];
  const subRows = family ? families.get(family) ?? [] : [];
  const flyout = family !== null && !searching;

  const pick = (id: string) => {
    onSelect(id);
    setOpen(false);
  };
  /** Highlight a main-list item; families preview in the flyout. */
  const focusMain = (i: number) => {
    setActive(i);
    setPane("main");
    setSubActive(-1);
    const item = level1[i];
    setFamily(item?.kind === "family" ? item.name : null);
  };
  const enterFlyout = (name: string) => {
    setFamily(name);
    setPane("sub");
    setSubActive(0);
  };
  const scrollTo = (el: HTMLDivElement | null, i: number) =>
    el?.querySelectorAll("[role=option]")[i]?.scrollIntoView({ block: "nearest" });

  const onKeyDown = (e: React.KeyboardEvent) => {
    // List keys only apply from the search input.
    if (e.target !== inputRef.current) return;
    const vertical = e.key === "ArrowDown" || e.key === "ArrowUp";
    const step = e.key === "ArrowDown" ? 1 : -1;
    if (searching) {
      if (vertical) {
        e.preventDefault();
        const next = Math.max(0, Math.min(active + step, filtered.length - 1));
        setActive(next);
        scrollTo(listRef.current, next);
      } else if (e.key === "Enter" && filtered[active]) {
        e.preventDefault();
        pick(filtered[active].id);
      }
      return;
    }
    if (pane === "sub") {
      if (vertical) {
        e.preventDefault();
        const next = Math.max(0, Math.min(subActive + step, subRows.length - 1));
        setSubActive(next);
        scrollTo(subRef.current, next);
      } else if (e.key === "Enter" && subRows[subActive]) {
        e.preventDefault();
        pick(subRows[subActive].id);
      } else if (
        e.key === "ArrowLeft" ||
        e.key === "Escape" ||
        (e.key === "Backspace" && query === "")
      ) {
        e.preventDefault();
        setPane("main");
        setSubActive(-1);
      }
      return;
    }
    const item = level1[active];
    if (vertical) {
      e.preventDefault();
      const next = Math.max(0, Math.min(active + step, level1.length - 1));
      focusMain(next);
      scrollTo(listRef.current, next);
    } else if (e.key === "ArrowRight" && item?.kind === "family") {
      e.preventDefault();
      enterFlyout(item.name);
    } else if (e.key === "Enter" && item) {
      e.preventDefault();
      if (item.kind === "family") enterFlyout(item.name);
      else pick(item.row.id);
    } else if (e.key === "Escape" && family) {
      e.preventDefault();
      setFamily(null);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setQuery("");
          setFamily(null);
          setPane("main");
          setSubActive(-1);
          const idx = level1.findIndex((item) =>
            item.kind === "family"
              ? item.rows.some((r) => r.id === selectedId)
              : item.row.id === selectedId,
          );
          setActive(idx >= 0 ? idx : 0);
        }
      }}
    >
      <PopoverTrigger render={trigger} />
      <PopoverPopup
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={`max-h-[480px] rounded-2xl border-line bg-s2 p-0 shadow-xl shadow-black/50 duration-200 ease-out [&_[data-slot=popover-viewport]]:p-0 ${
          flyout ? "w-[680px]" : "w-[340px]"
        }`}
        onKeyDown={onKeyDown}
      >
        <div className="flex">
          <div className="w-[338px] flex-none">
            <div className="flex items-center gap-2 border-b border-line px-3">
              <Icon d={SECTION_ICONS.search} className="h-4 w-4 flex-none text-t3" />
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                  setPane("main");
                }}
                placeholder="Search models"
                className="h-10 min-w-0 flex-1 bg-transparent text-body text-t1 outline-none placeholder:text-t3"
              />
            </div>
            <div ref={listRef} className="max-h-[420px] overflow-y-auto p-1.5">
              {searching ? (
                filtered.length === 0 ? (
                  <p className="px-2.5 py-6 text-center text-caption text-t3">
                    No models match
                  </p>
                ) : (
                  filtered.map((r, i) => (
                    <ModelRow
                      key={r.id}
                      row={r}
                      selected={r.id === selectedId}
                      active={i === active}
                      caption={r.group}
                      onHover={() => setActive(i)}
                      onPick={pick}
                    />
                  ))
                )
              ) : (
                <>
                  {multi.length > 0 && <SectionHead>Models</SectionHead>}
                  {multi.map(([name, rows], i) => {
                    const hasSelected = rows.some((r) => r.id === selectedId);
                    const isOpen = family === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        role="option"
                        aria-selected={false}
                        data-active={i === active || isOpen ? true : undefined}
                        onClick={() => enterFlyout(name)}
                        onMouseEnter={() => focusMain(i)}
                        className={ROW_CLS}
                      >
                        <Thumb
                          src={rows.find((r) => r.thumbUrl)?.thumbUrl ?? ""}
                          name={name}
                          logo={rows.find((r) => r.logoUrl)?.logoUrl}
                        />
                        <span className="min-w-0 flex-1 text-body font-medium text-t1">
                          {name}
                        </span>
                        {hasSelected && (
                          <span className="h-1.5 w-1.5 flex-none rounded-full bg-ac" />
                        )}
                        <span className="flex-none text-caption text-t3">
                          {rows.length}
                        </span>
                        <Icon
                          d={SECTION_ICONS.chevronRight}
                          className={`h-4 w-4 flex-none transition-colors ${isOpen ? "text-t1" : "text-t3"}`}
                        />
                      </button>
                    );
                  })}
                  {singles.length > 0 && <SectionHead>More</SectionHead>}
                  {singles.map((row, i) => {
                    const idx = multi.length + i;
                    return (
                      <ModelRow
                        key={row.id}
                        row={row}
                        selected={row.id === selectedId}
                        active={idx === active}
                        onHover={() => focusMain(idx)}
                        onPick={pick}
                      />
                    );
                  })}
                  {direct.length > 0 && <SectionHead>Presets</SectionHead>}
                  {direct.map((row, i) => {
                    const idx = multi.length + singles.length + i;
                    return (
                      <ModelRow
                        key={row.id}
                        row={row}
                        selected={row.id === selectedId}
                        active={idx === active}
                        onHover={() => focusMain(idx)}
                        onPick={pick}
                      />
                    );
                  })}
                </>
              )}
            </div>
          </div>
          {flyout && (
            <div
              key={family}
              className="w-[340px] flex-none border-l border-line motion-safe:animate-[flyout-in_180ms_ease-out]"
            >
              <p className="flex h-10 items-center border-b border-line px-4 text-caption text-t3">
                {family}
              </p>
              <div ref={subRef} role="listbox" aria-label={family} className="max-h-[420px] overflow-y-auto p-1.5">
                {subRows.map((row, i) => (
                  <ModelRow
                    key={row.id}
                    row={row}
                    selected={row.id === selectedId}
                    active={pane === "sub" && i === subActive}
                    onHover={() => {
                      setPane("sub");
                      setSubActive(i);
                    }}
                    onPick={pick}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverPopup>
    </Popover>
  );
}
