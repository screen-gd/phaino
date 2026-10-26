"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { Icon, SECTION_ICONS } from "@/components/icons";
import {
  bindingTargets,
  fitView,
  normalizeGraph,
  slotPosition,
  type GLink,
  type GNode,
  type GraphModel,
} from "./graphModel";

const SLOT_COLORS: Record<string, string> = {
  IMAGE: "#64B5F6",
  LATENT: "#FF9CF9",
  MODEL: "#B39DDB",
  CONDITIONING: "#FFA931",
  VAE: "#FF6E6E",
  CLIP: "#FFD500",
  VIDEO: "#6CCBA0",
  STRING: "#A1C181",
  INT: "#898CE1",
  FLOAT: "#898CE1",
};

export const slotColor = (type: string) => SLOT_COLORS[type] ?? "#7a7a7a";

export type GraphSelection = {
  node: GNode;
  /** The subgraph the node lives in (null = top level). */
  subgraph: { id: string; name: string; instanceId: number } | null;
};

export type FocusRequest = { path: number[]; seq: number };

type SubgraphFrame = { id: string; name: string; instanceId: number };

type View = { x: number; y: number; scale: number };

function truncate(value: unknown, max = 40): string {
  const s =
    typeof value === "string"
      ? value
      : value === null
        ? "null"
        : JSON.stringify(value);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/**
 * An interactive SVG ComfyUI graph: pan by dragging, wheel zoom around the
 * cursor, click to select, double-click a subgraph to drill in.
 */
export function WorkflowGraph({
  workflow,
  preset,
  selection,
  onSelect,
  focus,
  registerApi,
}: {
  workflow: unknown;
  /** The preset (or a value with inputs/params/outputs) for bindings. */
  preset: Parameters<typeof bindingTargets>[0];
  selection: GraphSelection | null;
  onSelect: (sel: GraphSelection | null) => void;
  /** Set a new {seq} to centre a binding path: [topId] or [instId, innerId]. */
  focus: FocusRequest | null;
  /** The panel registers an opener so the inspector can drill into subgraphs. */
  registerApi?: (api: { openSubgraph: (node: GNode) => void }) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 0.2 });
  const [subgraph, setSubgraph] = useState<SubgraphFrame | null>(null);
  const [showControls, setShowControls] = useState(true);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const fittedFor = useRef<SubgraphFrame | null | "init">("init");
  const seenFocus = useRef(0);

  const targets = useMemo(() => bindingTargets(preset), [preset]);
  const model = useMemo(
    () => normalizeGraph(workflow, subgraph?.id),
    [workflow, subgraph],
  );
  const subgraphDefs = useMemo(
    () =>
      new Map(
        (
          ((workflow as { definitions?: { subgraphs?: unknown[] } })
            ?.definitions?.subgraphs ?? []) as { id: string; name?: string }[]
        ).map((s) => [s.id, s]),
      ),
    [workflow],
  );

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const doFit = useCallback(
    (m: GraphModel | null) => {
      if (!m) return;
      const el = wrap.current;
      const vp = { w: el?.clientWidth || size.w, h: el?.clientHeight || size.h };
      setView(fitView(m.bounds, vp, 48));
    },
    [size],
  );

  // Fit on first layout and whenever the current subgraph changes.
  useEffect(() => {
    if (fittedFor.current !== subgraph && model) {
      fittedFor.current = subgraph;
      doFit(model);
    }
  }, [model, subgraph, doFit]);

  // Centre a node in the current view.
  const centreOn = useCallback(
    (m: GraphModel | null, nodeId: number) => {
      const node = m?.nodes.find((n) => n.id === nodeId);
      if (!m || !node) return;
      setView((v) => ({
        scale: Math.max(v.scale, 0.5),
        x: size.w / 2 - (node.pos[0] + node.size[0] / 2) * Math.max(v.scale, 0.5),
        y: size.h / 2 - (node.pos[1] + node.size[1] / 2) * Math.max(v.scale, 0.5),
      }));
    },
    [size],
  );

  // External focus requests from the Controls list.
  useEffect(() => {
    if (!focus || focus.seq === seenFocus.current) return;
    seenFocus.current = focus.seq;
    const frame = requestAnimationFrame(() => {
      const [top, inner] = focus.path;
      if (top === undefined) return;
      if (inner !== undefined) {
        const inst = model?.nodes.find((n) => n.id === top);
        const def = inst?.subgraph ? subgraphDefs.get(inst.subgraph) : undefined;
        if (inst?.subgraph && def) {
          const frameSg = { id: inst.subgraph, name: def.name ?? inst.title ?? "Subgraph", instanceId: top };
          setSubgraph(frameSg);
          const innerModel = normalizeGraph(workflow, inst.subgraph);
          onSelect({ node: innerModel?.nodes.find((n) => n.id === inner) ?? inst, subgraph: frameSg });
          centreOn(innerModel, inner);
          return;
        }
      }
      setSubgraph(null);
      const node = model?.nodes.find((n) => n.id === top);
      if (node) onSelect({ node, subgraph: null });
      centreOn(model, top);
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  // Esc clears the selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSelect(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSelect]);

  const openSubgraphCb = useCallback(
    (node: GNode) => {
      const def = node.subgraph ? subgraphDefs.get(node.subgraph) : undefined;
      if (!node.subgraph || !def) return;
      setSubgraph({ id: node.subgraph, name: def.name ?? node.title ?? "Subgraph", instanceId: node.id });
      onSelect(null);
    },
    [subgraphDefs, onSelect],
  );
  useEffect(() => {
    registerApi?.({ openSubgraph: openSubgraphCb });
  }, [registerApi, openSubgraphCb]);

  // Bound nodes for the current view.
  const bound = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const t of targets) {
      const id = subgraph
        ? t.path[0] === subgraph.instanceId
          ? t.path[1]
          : undefined
        : t.path[0];
      if (id === undefined) continue;
      map.set(id, [...(map.get(id) ?? []), t.label]);
    }
    return map;
  }, [targets, subgraph]);

  const nodesById = useMemo(
    () => new Map(model?.nodes.map((n) => [n.id, n]) ?? []),
    [model],
  );

  const linkPath = (l: GLink): { d: string; color: string } | null => {
    const from = nodesById.get(l.from);
    const to = nodesById.get(l.to);
    if (!from || !to) return null;
    const [x1, y1] = slotPosition(from, "out", l.fromSlot);
    const [x2, y2] = slotPosition(to, "in", l.toSlot);
    const dx = Math.max(40, Math.abs(x2 - x1) / 2);
    return {
      d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
      color: slotColor(from.outputs[l.fromSlot]?.type ?? l.type),
    };
  };

  const onWheel = (e: ReactWheelEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    setView((v) => {
      const scale = Math.min(2, Math.max(0.1, v.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      const k = scale / v.scale;
      return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
    });
  };

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest("[data-node]")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: view.x, y: view.y };
  };
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    setView((v) => ({
      ...v,
      x: drag.current!.x + e.clientX - drag.current!.px,
      y: drag.current!.y + e.clientY - drag.current!.py,
    }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const title = (n: GNode) => n.title ?? n.type;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-panel border border-line bg-[#000] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <nav className="flex min-w-0 items-center gap-1.5 text-caption">
          <button
            type="button"
            onClick={() => {
              setSubgraph(null);
              onSelect(null);
            }}
            className={`truncate ${subgraph ? "text-t3 hover:text-t1" : "text-t1 font-medium"}`}
          >
            Workflow
          </button>
          {subgraph && (
            <>
              <span className="text-t3">/</span>
              <span className="truncate text-t1 font-medium">{subgraph.name}</span>
            </>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            role="switch"
            aria-checked={showControls}
            onClick={() => setShowControls((v) => !v)}
            className={`flex h-7 items-center gap-1.5 rounded-lg px-2 text-caption font-medium ${
              showControls ? "bg-s2 text-t1" : "text-t3 hover:text-t1"
            }`}
          >
            <Icon d={SECTION_ICONS.sliders} className="h-3.5 w-3.5" />
            Show controls
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setView((v) => ({ ...v, scale: Math.max(0.1, v.scale / 1.2) }))}
            className="grid h-7 w-7 place-items-center rounded-lg bg-s2 text-t2 hover:text-t1"
          >
            <Icon d={SECTION_ICONS.minus} className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setView((v) => ({ ...v, scale: Math.min(2, v.scale * 1.2) }))}
            className="grid h-7 w-7 place-items-center rounded-lg bg-s2 text-t2 hover:text-t1"
          >
            <Icon d={SECTION_ICONS.plus} className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => doFit(model)}
            className="flex h-7 items-center rounded-lg bg-s2 px-2 text-caption font-medium text-t2 hover:text-t1"
          >
            Fit
          </button>
        </div>
      </div>

      <div ref={wrap} className="relative min-h-0 flex-1">
        <svg
          className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
            {model?.groups.map((g, i) => (
              <g key={`g${i}`}>
                <rect
                  x={g.bounding[0]}
                  y={g.bounding[1]}
                  width={g.bounding[2]}
                  height={g.bounding[3]}
                  rx={12}
                  fill={g.color ?? "#ffffff"}
                  fillOpacity={0.05}
                  stroke={g.color ?? "#ffffff"}
                  strokeOpacity={0.12}
                />
                <text x={g.bounding[0] + 14} y={g.bounding[1] + 24} fill="#888" fontSize={20} fontWeight={600}>
                  {g.title}
                </text>
              </g>
            ))}

            {model?.links.map((l) => {
              const p = linkPath(l);
              if (!p) return null;
              return (
                <path
                  key={l.id}
                  d={p.d}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={2}
                  strokeOpacity={0.85}
                />
              );
            })}

            {model?.nodes.map((n) => {
              const isSub = !!n.subgraph;
              const isSelected = selection?.node.id === n.id;
              const boundLabels = bound.get(n.id);
              const highlighted = showControls && !!boundLabels;
              const dimmed = n.mode === 2 || n.mode === 4;
              const slotCount = Math.max(n.inputs.length, n.outputs.length);
              const widgetsY = n.pos[1] + 10 + slotCount * 20 + 10;
              return (
                <g
                  key={n.id}
                  data-node={n.id}
                  opacity={dimmed ? 0.4 : 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect({ node: n, subgraph });
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (isSub) openSubgraphCb(n);
                  }}
                  className="cursor-pointer"
                >
                  {isSub && (
                    <rect
                      x={n.pos[0] - 4}
                      y={n.pos[1] - 34}
                      width={n.size[0]}
                      height={n.size[1] + 30}
                      rx={8}
                      fill="var(--color-s3, #1c1c1c)"
                    />
                  )}
                  <rect
                    x={n.pos[0]}
                    y={n.pos[1] - 30}
                    width={n.size[0]}
                    height={n.size[1] + 30}
                    rx={8}
                    fill={n.pseudo ? "#151515" : "var(--color-s2, #161616)"}
                    stroke={
                      isSelected ? "#fff" : highlighted ? "#FF5B22" : "var(--color-line, #2a2a2a)"
                    }
                    strokeWidth={isSelected || highlighted ? 2.5 : 1}
                    strokeDasharray={n.pseudo ? "6 4" : undefined}
                  />
                  <line
                    x1={n.pos[0]}
                    x2={n.pos[0] + n.size[0]}
                    y1={n.pos[1]}
                    y2={n.pos[1]}
                    stroke="var(--color-line, #2a2a2a)"
                  />
                  <text
                    x={n.pos[0] + 10}
                    y={n.pos[1] - 10}
                    fill="#e6e6e6"
                    fontSize={14}
                    fontWeight={600}
                  >
                    {truncate(title(n), Math.max(12, Math.floor(n.size[0] / 9)))}
                  </text>
                  {isSub && (
                    <g transform={`translate(${n.pos[0] + n.size[0] - 76} ${n.pos[1] - 25})`}>
                      <rect width={68} height={20} rx={10} fill="#000" stroke="#FF5B22" strokeOpacity={0.5} />
                      <text x={34} y={14} textAnchor="middle" fill="#FF5B22" fontSize={11}>
                        Subgraph
                      </text>
                    </g>
                  )}
                  {highlighted && boundLabels && (
                    <g transform={`translate(${n.pos[0] + 10} ${n.pos[1] - 8})`}>
                      <rect
                        x={Math.min(n.size[0] - 20, 14 + Math.min(boundLabels.join(", ").length * 7, n.size[0] - 40)) - 4}
                        y={-14}
                        width={Math.min(boundLabels.join(", ").length * 7 + 12, n.size[0] - 24)}
                        height={18}
                        rx={9}
                        fill="#FF5B22"
                      />
                      <text
                        x={Math.min(n.size[0] - 20, 14 + Math.min(boundLabels.join(", ").length * 7, n.size[0] - 40)) + 2}
                        y={-1}
                        fill="#000"
                        fontSize={11}
                        fontWeight={700}
                        textAnchor="start"
                      >
                        {truncate(boundLabels.join(", "), 24)}
                      </text>
                    </g>
                  )}

                  {n.inputs.map((s, i) => {
                    const [x, y] = slotPosition(n, "in", i);
                    return (
                      <g key={`i${i}`}>
                        <circle cx={x} cy={y} r={4} fill={slotColor(s.type)} />
                        <text x={x + 10} y={y + 4} fill="#9a9a9a" fontSize={12}>
                          {truncate(s.label ?? s.name, Math.max(10, Math.floor(n.size[0] / 2 / 7)))}
                        </text>
                      </g>
                    );
                  })}
                  {n.outputs.map((s, i) => {
                    const [x, y] = slotPosition(n, "out", i);
                    return (
                      <g key={`o${i}`}>
                        <circle cx={x} cy={y} r={4} fill={slotColor(s.type)} />
                        <text x={x - 10} y={y + 4} fill="#9a9a9a" fontSize={12} textAnchor="end">
                          {truncate(s.label ?? s.name, Math.max(10, Math.floor(n.size[0] / 2 / 7)))}
                        </text>
                      </g>
                    );
                  })}

                  {n.widgets.map((wgt, i) => (
                    <g key={`w${i}`}>
                      <text
                        x={n.pos[0] + 10}
                        y={widgetsY + i * 18 + 4}
                        fill="#6f6f6f"
                        fontSize={11}
                        fontFamily="monospace"
                      >
                        {truncate(`${wgt.name}: ${truncate(wgt.value, 30)}`, Math.floor(n.size[0] / 7))}
                      </text>
                    </g>
                  ))}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
