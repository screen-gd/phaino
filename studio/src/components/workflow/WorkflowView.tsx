"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { Icon, SECTION_ICONS } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/components/DemoProvider";
import { forkChanges } from "@/lib/forkChanges";
import { presetPreview } from "@/lib/preset-preview";
import { ForkEditor } from "./ForkEditor";
import {
  bindingTargets,
  bindingMatchesHover,
  nodeDisplayName,
  normalizeGraph,
  type GNode,
  type GraphModel,
} from "./graphModel";
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

type GraphCache = {
  top: GraphModel | null;
  /** Subgraph models keyed by definition id, filled once per workflow. */
  inner: Map<string, GraphModel | null>;
};

function targetNode(cache: GraphCache, path: number[]): GNode | null {
  const topNode = cache.top?.nodes.find((n) => n.id === path[0]);
  if (!topNode) return null;
  if (path.length < 2 || path[1] === undefined || !topNode.subgraph) {
    return topNode;
  }
  return (
    cache.inner.get(topNode.subgraph)?.nodes.find((n) => n.id === path[1]) ??
    null
  );
}

/** The class label under a control name: node type, or Subgraph + name. */
function targetClassText(node: GNode | null, path: number[]): string {
  if (!node) return `node ${path.join(":")}`;
  if (node.subgraph) return `Subgraph · ${node.subgraphName ?? "Subgraph"}`;
  return node.type;
}

const actionClass = "w-full min-w-0 border-line text-t2 hover:border-t3 hover:text-t1 hover:no-underline data-pressed:no-underline";

/** The /workflows/[id] page body: graph canvas + right panel. */
export function WorkflowView({
  preset,
  workflow,
  stats,
  source,
}: {
  preset: SerializablePreset;
  workflow: unknown;
  stats: { nodes: number; subgraphs: number };
  /** The fork's source preset, resolved server-side. */
  source?: { id: string; name: string; params: SerializablePreset["params"] } | null;
}) {
  const router = useRouter();
  const demo = useDemo();
  const [selection, setSelection] = useState<GraphSelection | null>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const [panelHoverPath, setPanelHoverPath] = useState<number[] | null>(null);
  const [canvasHoverPath, setCanvasHoverPath] = useState<number[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [forkError, setForkError] = useState<string | null>(null);
  const focusSeq = useRef(0);

  const targets = useMemo(() => bindingTargets(preset), [preset]);

  // The top graph plus every subgraph the controls point into, normalized
  // once per workflow so row renders and hovers only do Map lookups.
  const graphs = useMemo<GraphCache>(() => {
    const top = normalizeGraph(workflow);
    const inner = new Map<string, GraphModel | null>();
    for (const t of targets) {
      const node = top?.nodes.find((n) => n.id === t.path[0]);
      if (node?.subgraph && !inner.has(node.subgraph)) {
        inner.set(node.subgraph, normalizeGraph(workflow, node.subgraph));
      }
    }
    return { top, inner };
  }, [workflow, targets]);

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
    setForkError(null);
    try {
      const res = await fetch("/api/forks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ presetId: preset.id }),
      });
      const body = (await res.json()) as { preset?: { id: string }; error?: string; message?: string };
      if (!res.ok || !body.preset) {
        throw new Error(body.error ?? body.message ?? "Fork failed");
      }
      router.push(`/workflows/${body.preset.id}`);
      router.refresh();
    } catch (error) {
      setForkError(error instanceof Error ? error.message : "Fork failed");
    } finally {
      setBusy(false);
    }
  };

  const changes = useMemo(
    () =>
      preset.origin === "fork" && source
        ? forkChanges(preset, source)
        : [],
    [preset, source],
  );

  return (
    <div className="grid min-h-full grid-rows-[minmax(320px,55dvh)_auto] gap-4 bg-black p-3 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[minmax(0,1fr)] lg:gap-0">
      <WorkflowGraph
        workflow={workflow}
        preset={preset}
        presetName={preset.name}
        selection={selection}
        onSelect={setSelection}
        focus={focus}
        panelHoverPath={panelHoverPath}
        onCanvasHoverPath={setCanvasHoverPath}
        registerApi={registerApi}
      />

      <aside aria-label="Workflow details" className="min-h-0 min-w-0 divide-y divide-line overflow-x-hidden lg:ml-4 lg:overflow-y-auto lg:overscroll-contain lg:border-l lg:border-line lg:pl-4">
        <div className="min-w-0 pb-4">
          <div className="relative aspect-video overflow-hidden rounded-md">
            <Image
              src={presetPreview(preset)}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 1024px) 308px, 100vw"
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="mt-3 break-words text-lead font-semibold text-t1">
            {preset.name}
          </h1>
          <p className="mt-1 break-words font-mono text-caption text-t3">
            {preset.model.label}
            {" · "}
            {stats.nodes} nodes · {stats.subgraphs} subgraphs
            {preset.forkOf ? ` · Fork of ${preset.forkOf}` : ""}
          </p>
        </div>

        <div className="grid gap-2 py-4">
          <Button
            variant="link"
            render={<Link href={`/${preset.category}?preset=${preset.id}`} />}
            className="w-full border-ac text-ac hover:border-t1 hover:text-t1 hover:no-underline data-pressed:no-underline"
          >
            Use in studio
          </Button>
          <div className={`grid gap-1.5 ${preset.origin === "fork" ? "grid-cols-2" : "grid-cols-3"}`}>
            {preset.origin !== "fork" && (
              <Button
                variant="link"
                size="sm"
                className={`${actionClass} gap-1 px-1 text-caption`}
                loading={busy}
                disabled={demo.enabled}
                onClick={() => void fork()}
              >
                <Icon d={SECTION_ICONS.fork} className="size-3.5" />
                Fork
              </Button>
            )}
            <Button
              variant="link"
              size="sm"
              className={`${actionClass} gap-1 px-1 text-caption`}
              render={
                <a
                  href={`/api/presets/${preset.id}/workflow?format=ui`}
                  download
                />
              }
            >
              <Icon d={SECTION_ICONS.download} className="size-3.5" />
              Workflow
            </Button>
            <Button
              variant="link"
              size="sm"
              className={`${actionClass} gap-1 px-1 text-caption`}
              render={
                <a
                  href={`/api/presets/${preset.id}/workflow?format=api`}
                  download
                />
              }
            >
              <Icon d={SECTION_ICONS.download} className="size-3.5" />
              API JSON
            </Button>
          </div>
          <p className="text-caption text-t3">
            Drag the downloaded file into ComfyUI to open it.
          </p>
          {demo.enabled && preset.origin !== "fork" && (
            <p className="text-caption text-t3">
              Forking saves files, so it needs a local install.
            </p>
          )}
          {forkError && (
            <p className="text-caption text-destructive">{forkError}</p>
          )}
        </div>

        {preset.origin === "fork" && source && (
          <div className="min-w-0 py-4">
            <h2 className="mb-2 break-words text-body font-medium text-t2">
              Forked from{" "}
              <Link
                href={`/workflows/${source.id}`}
                className="text-t2 underline underline-offset-2 hover:text-t1"
              >
                {source.name}
              </Link>
            </h2>
            {changes.length === 0 ? (
              <p className="text-caption text-t3">
                No changes yet. Edit the defaults below.
              </p>
            ) : (
              <dl className="grid gap-1">
                {changes.map((c) => (
                  <div
                    key={c.key}
                    className="grid grid-cols-[minmax(0,110px)_minmax(0,1fr)] gap-2 text-caption"
                  >
                    <dt className="truncate text-t3">{c.label}</dt>
                    <dd className="min-w-0 truncate font-mono text-t2">
                      {String(c.from)} → {String(c.to)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}

        {preset.origin === "fork" && <ForkEditor preset={preset} />}

        <div className="min-w-0 py-4">
          <h2 className="mb-2 text-body font-semibold text-t1">Controls</h2>
          <ul className="grid min-w-0 gap-1" onMouseLeave={() => setPanelHoverPath(null)}>
            {targets.map((t) => {
              const node = targetNode(graphs, t.path);
              const classText = targetClassText(node, t.path);
              const detail =
                node?.title && node.title !== classText
                  ? ` · ${node.title}`
                  : "";
              const hovered = bindingMatchesHover(t.path, canvasHoverPath) ||
                bindingMatchesHover(t.path, panelHoverPath);
              return (
                <li key={`${t.kind}-${t.key}`} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => focusTarget(t.path)}
                    onMouseEnter={() => setPanelHoverPath(t.path)}
                    onMouseLeave={() => setPanelHoverPath(null)}
                    className={`flex w-full min-w-0 items-start gap-2 border-l py-2 pr-1 pl-2 text-left hover:border-ac focus-visible:border-ac ${
                      hovered ? "border-ac" : "border-transparent"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-body font-medium ${hovered ? "text-ac" : "text-t1"}`} title={t.label}>
                        {t.label}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-caption text-t3" title={`${classText}${detail}`}>
                        {classText}
                        {detail}
                      </span>
                    </span>
                    <span className="flex-none pt-0.5 font-mono text-caption uppercase text-t3">
                      {t.kind}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {selection && (
          <div className="min-w-0 py-4">
            <h2 className="mb-2 text-body font-semibold text-t1">Node</h2>
            <div className="text-body">
              <b className="block break-words font-semibold text-t1">
                {nodeDisplayName(selection.node)}
              </b>
              <dl className="mt-2 grid grid-cols-[72px_minmax(0,1fr)] gap-y-1 text-t2">
                <dt className="text-t3">Type</dt>
                <dd className="truncate font-mono text-caption" title={selection.node.type}>
                  {selection.node.subgraph ? "Subgraph" : selection.node.type}
                </dd>
                <dt className="text-t3">Id</dt>
                <dd className="font-mono text-caption">
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
                variant="link"
                size="sm"
                className={`${actionClass} mt-3`}
                onClick={() => api.current?.openSubgraph(selection.node)}
              >
                Open subgraph
              </Button>
            )}
            {selection.node.widgets.length > 0 && (
              <div className="mt-3">
                <h3 className="mb-1 text-caption font-medium text-t3">Widgets</h3>
                <dl className="grid gap-1">
                  {selection.node.widgets.map((w) => (
                    <div key={w.name} className="grid grid-cols-[minmax(0,110px)_minmax(0,1fr)] gap-2 text-caption">
                      <dt className="truncate font-mono text-t3" title={w.name}>{w.name}</dt>
                      <dd className="min-w-0">
                        {typeof w.value === "string" && w.value.length > 60 ? (
                          <pre className="max-h-28 overflow-y-auto font-mono text-caption whitespace-pre-wrap break-words text-t2">
                            {w.value}
                          </pre>
                        ) : (
                          <span className="block truncate font-mono text-caption text-t2" title={String(w.value)}>
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
                    <h3 className="mb-1 text-caption font-medium text-t3">Inputs</h3>
                    <ul className="grid gap-0.5 text-caption text-t2">
                      {selection.node.inputs.map((s, i) => (
                        <li key={i} className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="inline-block h-2 w-2 flex-none rounded-full"
                            style={{ background: slotColor(s.type) }}
                          />
                          <span className="min-w-0 flex-1 truncate" title={s.label ?? s.name}>{s.label ?? s.name}</span>
                          <span className="max-w-1/2 truncate font-mono text-t3" title={s.type}>{s.type}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selection.node.outputs.length > 0 && (
                  <div>
                    <h3 className="mb-1 text-caption font-medium text-t3">Outputs</h3>
                    <ul className="grid gap-0.5 text-caption text-t2">
                      {selection.node.outputs.map((s, i) => (
                        <li key={i} className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="inline-block h-2 w-2 flex-none rounded-full"
                            style={{ background: slotColor(s.type) }}
                          />
                          <span className="min-w-0 flex-1 truncate" title={s.label ?? s.name}>{s.label ?? s.name}</span>
                          <span className="max-w-1/2 truncate font-mono text-t3" title={s.type}>{s.type}</span>
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

