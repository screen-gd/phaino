"use client";

import Link from "next/link";
import { useState } from "react";
import type { GraphModel } from "@/components/workflow/graphModel";
import { GraphPreview } from "./GraphPreview";

export type ControlSpec = {
  key: string;
  label: string;
  /** Displayed value in mono (preset defaults resolved server-side). */
  value: string;
  /** Style the value like a placeholder, e.g. the empty prompt. */
  dimValue?: boolean;
  /** Render a small empty image tile instead of a value. */
  tile?: boolean;
  /** Node id inside the subgraph; null maps to the Inputs pseudo node. */
  innerId: number | null;
  /** Node class text shown under the row while it is active. */
  classText: string;
};

/**
 * Section 3: the composer controls on the left, the subgraph they drive on
 * the right. Hovering or focusing a row lights its node.
 */
export function ControlsToGraph({
  controls,
  graph,
}: {
  controls: ControlSpec[];
  graph: GraphModel;
}) {
  const [active, setActive] = useState(0);
  const current = controls[active];
  const highlight = current ? [current.innerId ?? -10] : [];

  return (
    <div>
      <p className="mb-8 max-w-xl text-body text-t3">
        Phaino&apos;s UI is just a view of the graph. Change the graph, the UI
        follows.{" "}
        <Link
          href="/workflows/orbit"
          className="text-t2 underline underline-offset-2 hover:text-t1"
        >
          Open the Orbit workflow
        </Link>
      </p>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <ul className="grid content-start gap-px self-start overflow-hidden rounded-lg border border-line bg-line">
          {controls.map((c, i) => (
            <li key={c.key} className="bg-s1">
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                className={`block w-full px-4 py-3 text-left ${
                  i === active ? "bg-s2" : "hover:bg-s2/60"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-body text-t2">{c.label}</span>
                  {c.tile ? (
                    <span className="block h-8 w-12 rounded border border-dashed border-line bg-s2" />
                  ) : (
                    <span
                      className={`font-mono text-caption ${
                        c.dimValue ? "text-t3" : "text-t1"
                      }`}
                    >
                      {c.value}
                    </span>
                  )}
                </span>
                {i === active && (
                  <span className="mt-1 block font-mono text-caption text-ac">
                    {c.classText}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <div className="aspect-[16/10] overflow-hidden border border-line bg-black">
          <GraphPreview
            model={graph}
            highlight={highlight}
            label="Inside the Orbit image-to-video subgraph"
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}
