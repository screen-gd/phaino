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

function ModeChips({ modes }: { modes?: string[] }) {
  if (!modes || modes.length === 0) return null;
  return (
    <span className="flex flex-none gap-1">
      {modes.map((m) => (
        <span key={m} className="rounded bg-s3 px-1.5 text-caption text-t2">
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
      <img
        src={row.thumbUrl}
        alt=""
        className="h-7 w-7 flex-none rounded-lg object-cover"
      />
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
      {selected && (
        <Icon d={SECTION_ICONS.check} className="h-4 w-4 flex-none text-ac" />
      )}
    </button>
  );
}

/** Searchable model popover: clicking a family drills into its models. */
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
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Multi-model families get a drilled-in view; single-model families and
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
  const items = searching ? filtered : family ? subRows : level1;

  const pick = (id: string) => {
    onSelect(id);
    setOpen(false);
  };
  const goBack = () => {
    setFamily(null);
    setActive(0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // List keys only apply from the search input; focused buttons
    // (e.g. the back row) keep their native Enter/Space behaviour.
    if (e.target !== inputRef.current) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next =
        e.key === "ArrowDown"
          ? Math.min(active + 1, items.length - 1)
          : Math.max(active - 1, 0);
      setActive(next);
      listRef.current
        ?.querySelectorAll("[role=option]")
        [next]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowRight") {
      const item = level1[active];
      if (!searching && !family && item?.kind === "family") {
        e.preventDefault();
        setFamily(item.name);
        setActive(0);
      }
    } else if (e.key === "ArrowLeft") {
      if (family && !searching) {
        e.preventDefault();
        goBack();
      }
    } else if (e.key === "Backspace") {
      if (family && query === "") {
        e.preventDefault();
        goBack();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[active];
      if (!item) return;
      if (searching) {
        pick((item as PickerRow).id);
      } else if (!family && (item as Level1Item).kind === "family") {
        setFamily((item as { kind: "family"; name: string }).name);
        setActive(0);
      } else {
        pick(
          family
            ? (item as PickerRow).id
            : (item as { kind: "row"; row: PickerRow }).row.id,
        );
      }
    } else if (e.key === "Escape") {
      if (family) {
        e.preventDefault();
        goBack();
      }
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
        className="max-h-[480px] w-[340px] rounded-2xl border-line bg-s2 p-0 shadow-xl shadow-black/50"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Icon d={SECTION_ICONS.search} className="h-4 w-4 flex-none text-t3" />
          <input
            ref={inputRef}
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
        {family && !searching && (
          <div className="border-b border-line bg-s2 px-1.5 py-1">
            <button
              type="button"
              onClick={goBack}
              className="flex w-full items-center gap-1 rounded-lg px-2.5 py-1.5 text-caption text-t3 hover:bg-s3 hover:text-t1"
            >
              <Icon d={SECTION_ICONS.chevronLeft} className="h-3.5 w-3.5" />
              {family}
            </button>
          </div>
        )}
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
          ) : family ? (
            <>
              {subRows.map((row, i) => (
                <ModelRow
                  key={row.id}
                  row={row}
                  selected={row.id === selectedId}
                  active={i === active}
                  onHover={() => setActive(i)}
                  onPick={pick}
                />
              ))}
            </>
          ) : (
            <>
              {multi.length > 0 && <SectionHead>Models</SectionHead>}
              {multi.map(([name, rows], i) => {
                const hasSelected = rows.some((r) => r.id === selectedId);
                return (
                  <button
                    key={name}
                    type="button"
                    role="option"
                    aria-selected={false}
                    data-active={i === active ? true : undefined}
                    onClick={() => {
                      setFamily(name);
                      setActive(0);
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={ROW_CLS}
                  >
                    <img
                      src={rows[0].thumbUrl}
                      alt=""
                      className="h-7 w-7 flex-none rounded-lg object-cover"
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
                      className="h-4 w-4 flex-none text-t3"
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
                    onHover={() => setActive(idx)}
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
                    onHover={() => setActive(idx)}
                    onPick={pick}
                  />
                );
              })}
            </>
          )}
        </div>
      </PopoverPopup>
    </Popover>
  );
}
