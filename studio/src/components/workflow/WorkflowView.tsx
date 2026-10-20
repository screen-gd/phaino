"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { Icon, SECTION_ICONS } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { presetPreview } from "@/lib/preset-preview";
import { ForkEditor } from "./ForkEditor";
import { bindingTargets, normalizeGraph, type GNode } from "./graphModel";
import type { ListedPreset } from "@/server/presets/load";
import {
  slotColor,
  WorkflowGraph,
  type FocusRequest,
  type GraphSelection,
} from "./WorkflowGraph";

type SerializablePreset = ListedPreset;

type GraphApi = {
  openSubgraph: (node: GNode) => void;
};

const MODE_LABELS: Record<number, string> = {
  0: "Active",
  2: "Muted",
  4: "Bypassed",
};

function targetTitle(
  workflow: unknown,
  path: number[],
): string {
  const top = normalizeGraph(workflow);
  const topNode = top?.nodes.find((n) => n.id === path[0]);
  if (!topNode) return `node ${path[0]}`;
  if (path.length < 2 || path[1] === undefined) {
    return topNode.title ?? topNode.type;
  }
  const inner = normalizeGraph(workflow, topNode.subgraph);
  const node = inner?.nodes.find((n) => n.id === path[1]);
  return node ? (node.title ?? node.type) : `node ${path[1]}`;
}

/** The /workflows/[id] page body: graph canvas + right panel. */
export function WorkflowView({
  preset,
  workflow,
  stats,
}: {
  preset: SerializablePreset;
  workflow: unknown;
  stats: { nodes: number; subgraphs: number };
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<GraphSelection | null>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const focusSeq = useRef(0);

  const targets = useMemo(() => bindingTargets(preset), [preset]);

  const focusTarget = (path: number[]) => {
    focusSeq.current += 1;
    setFocus({ path, seq: focusSeq.current });
  };

  // The inspector's "Open subgraph" needs the graph's internal drill-in, so
  // WorkflowGraph registers its opener here.
  const api = useRef<GraphApi | null>(null);
  const registerApi = useCallback((a: GraphApi) => {
    api.current = a;
  }, []);

  const fork = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/forks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ presetId: preset.id }),
      });
      const body = (await res.json()) as { preset?: { id: string }; error?: string };
      if (!res.ok || !body.preset) throw new Error(body.error ?? "Fork failed");
      router.push(`/workflows/${body.preset.id}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid h-full min-h-0 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_340px]">
      <WorkflowGraph
        workflow={workflow}
        preset={preset}
        selection={selection}
        onSelect={setSelection}
        focus={focus}
        registerApi={registerApi}
      />

      <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
        <div className="rounded-panel border border-line bg-s1 p-3">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-line">
            <img
              src={presetPreview(preset)}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="mt-3 font-display text-xl font-extrabold uppercase text-t1 [font-stretch:112.5%]">
            {preset.name}
          </h1>
          <p className="mt-0.5 text-caption text-t3">
            {preset.model.label}
            {" · "}
            {stats.nodes} nodes · {stats.subgraphs} subgraphs
            {preset.forkOf ? ` · Fork of ${preset.forkOf}` : ""}
          </p>
        </div>

        <div className="grid gap-1.5 rounded-panel border border-line bg-s1 p-3">
          <Button
            render={<Link href={`/${preset.category}?preset=${preset.id}`} />}
            className="w-full"
          >
            Use in studio
          </Button>
          <div className="grid grid-cols-2 gap-1.5">
            {preset.origin === "builtin" && (
              <Button
                variant="outline"
                className="w-full"
                loading={busy}
                onClick={() => void fork()}
              >
                Fork
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full"
              render={
                <a
                  href={`/api/presets/${preset.id}/workflow?format=ui`}
                  download
                />
              }
            >
              <Icon d={SECTION_ICONS.download} className="h-4 w-4" />
              Workflow
            </Button>
            <Button
              variant="outline"
              className="w-full"
              render={
                <a
                  href={`/api/presets/${preset.id}/workflow?format=api`}
                  download
                />
              }
            >
              <Icon d={SECTION_ICONS.download} className="h-4 w-4" />
              API JSON
            </Button>
          </div>
          <p className="text-caption text-t3">
            Drag the downloaded file into ComfyUI to open it.
          </p>
        </div>

        {preset.origin === "fork" && <ForkEditor preset={preset} />}

        <div className="rounded-panel border border-line bg-s1 p-3">
          <h2 className="mb-2 text-caption font-medium text-t3">Controls</h2>
          <ul className="grid gap-0.5">
            {targets.map((t) => (
              <li key={`${t.kind}-${t.key}`}>
                <button
                  type="button"
                  onClick={() => focusTarget(t.path)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-s2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-t1">
                      {t.label}
                    </span>
                    <span className="block truncate text-[11px] text-t3">
                      {targetTitle(workflow, t.path)}
                    </span>
                  </span>
                  <span className="flex-none rounded bg-s2 px-1.5 py-0.5 text-[10px] font-medium uppercase text-t3">
                    {t.kind}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {selection && (
          <div className="rounded-panel border border-line bg-s1 p-3">
            <h2 className="mb-2 text-caption font-medium text-t3">Node</h2>
            <div className="text-[13px]">
              <b className="block text-t1">
                {selection.node.title ?? selection.node.type}
              </b>
              <dl className="mt-2 grid grid-cols-[72px_1fr] gap-y-1 text-t2">
                <dt className="text-t3">Type</dt>
                <dd className="truncate font-mono text-xs">{selection.node.type}</dd>
                <dt className="text-t3">Id</dt>
                <dd className="font-mono text-xs">
                  {selection.subgraph
                    ? `${selection.subgraph.instanceId}:${selection.node.id}`
                    : selection.node.id}
                </dd>
                <dt className="text-t3">Mode</dt>
                <dd>{MODE_LABELS[selection.node.mode] ?? selection.node.mode}</dd>
              </dl>
            </div>
            {selection.node.subgraph && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => api.current?.openSubgraph(selection.node)}
              >
                Open subgraph
              </Button>
            )}
            {selection.node.widgets.length > 0 && (
              <div className="mt-3">
                <h3 className="mb-1 text-[11px] font-medium text-t3">Widgets</h3>
                <dl className="grid gap-1">
                  {selection.node.widgets.map((w) => (
                    <div key={w.name} className="grid grid-cols-[110px_1fr] gap-2 text-[12px]">
                      <dt className="truncate text-t3">{w.name}</dt>
                      <dd className="min-w-0">
                        {typeof w.value === "string" && w.value.length > 60 ? (
                          <pre className="max-h-28 overflow-y-auto rounded-md bg-s2 p-1.5 font-mono text-[11px] whitespace-pre-wrap text-t2">
                            {w.value}
                          </pre>
                        ) : (
                          <span className="truncate font-mono text-[11px] text-t2">
                            {String(w.value)}
                          </span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {(selection.node.inputs.length > 0 || selection.node.outputs.length > 0) && (
              <div className="mt-3 grid gap-2">
                {selection.node.inputs.length > 0 && (
                  <div>
                    <h3 className="mb-1 text-[11px] font-medium text-t3">Inputs</h3>
                    <ul className="grid gap-0.5 text-[11px] text-t2">
                      {selection.node.inputs.map((s, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ background: slotColor(s.type) }}
                          />
                          {s.label ?? s.name}
                          <span className="text-t3">{s.type}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selection.node.outputs.length > 0 && (
                  <div>
                    <h3 className="mb-1 text-[11px] font-medium text-t3">Outputs</h3>
                    <ul className="grid gap-0.5 text-[11px] text-t2">
                      {selection.node.outputs.map((s, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ background: slotColor(s.type) }}
                          />
                          {s.label ?? s.name}
                          <span className="text-t3">{s.type}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

