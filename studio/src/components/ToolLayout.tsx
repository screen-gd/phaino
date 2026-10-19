"use client";

import { useState, type ReactNode } from "react";
import { Icon, SECTION_ICONS, type IconName } from "./icons";

export type ToolStep = { title: string; body: string };

type Pane = "hist" | "comm" | "how";

const PANES = [
  { id: "hist", label: "History" },
  { id: "comm", label: "Community" },
  { id: "how", label: "How it works" },
] as const;

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-xs uppercase tracking-[0.06em] text-t3">
      {children}
    </span>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="grid flex-1 place-items-center rounded-panel border border-line bg-s1 py-24">
      <p className="text-t3">{children}</p>
    </div>
  );
}

/**
 * Two-column tool page: settings panel on the left (tool card on top,
 * Generate pinned to the bottom), tabbed content area on the right.
 * Upload slots, prompt and settings land inside the panel in later milestones.
 */
export function ToolLayout({
  title,
  icon,
  steps,
  children,
}: {
  title: string;
  icon: IconName;
  steps: readonly ToolStep[];
  children?: ReactNode;
}) {
  const [pane, setPane] = useState<Pane>("hist");

  return (
    <div className="grid h-full grid-cols-[340px_minmax(0,1fr)] gap-4 p-4">
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-panel border border-line bg-s1">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3.5">
          <div className="flex items-center gap-3 rounded-[14px] border border-line bg-s2 p-2">
            <div className="grid h-14 w-14 flex-none place-items-center rounded-[10px] bg-s3 text-t3">
              <Icon d={SECTION_ICONS[icon]} />
            </div>
            <div className="min-w-0 flex-1">
              <Label>{title}</Label>
              <b className="block truncate font-semibold">{title}</b>
            </div>
          </div>
          {children}
        </div>
        <div className="border-t border-line px-3.5 pt-3 pb-3.5">
          <button
            type="button"
            disabled
            className="flex h-[50px] w-full items-center justify-center rounded-full bg-ac text-[15px] font-semibold text-on disabled:cursor-not-allowed disabled:opacity-60"
          >
            Generate
          </button>
        </div>
      </aside>

      <section className="flex min-h-0 flex-col gap-3.5 overflow-y-auto pr-1">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-bg pb-1.5">
          <div role="tablist" className="flex rounded-full border border-line bg-s2 p-0.5">
            {PANES.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={pane === p.id}
                onClick={() => setPane(p.id)}
                className={`h-9 rounded-full px-3 font-mono text-xs whitespace-nowrap ${
                  pane === p.id ? "bg-t1 font-semibold text-black" : "text-t3"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {pane === "hist" && <Empty>No shots yet.</Empty>}

        {pane === "comm" && <Empty>Nothing from the community yet.</Empty>}

        {pane === "how" && (
          <ol className="grid grid-cols-3 gap-2.5">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-panel border border-line bg-s1 p-[18px]">
                <b className="mb-2.5 block font-mono text-[28px] font-normal text-ac">
                  {String(i + 1).padStart(2, "0")}
                </b>
                <h4 className="mb-1.5 text-base font-semibold">{s.title}</h4>
                <p className="text-t3">{s.body}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
