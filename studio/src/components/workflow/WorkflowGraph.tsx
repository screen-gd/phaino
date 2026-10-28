"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Icon, SECTION_ICONS } from "@/components/icons";
import {
  bindingTargets,
  fitView,
  nodeDisplayName,
  nodeIdForPath,
  nodeIsVisible,
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
  presetName,
  selection,
  onSelect,
  focus,
  panelHoverPath,
  onCanvasHoverPath,
  registerApi,
}: {
  workflow: unknown;
  /** The preset (or a value with inputs/params/outputs) for bindings. */
  preset: Parameters<typeof bindingTargets>[0];
  /** Root label of the graph breadcrumb. */
  presetName: string;
  selection: GraphSelection | null;
  onSelect: (sel: GraphSelection | null) => void;
  /** Set a new {seq} to centre a binding path: [topId] or [instId, innerId]. */
  focus: FocusRequest | null;
  /** Binding path hovered in the panel; highlights and pans to the node. */
  panelHoverPath?: number[] | null;
  /** Node path hovered on the canvas; highlights the matching panel rows. */
  onCanvasHoverPath?: (path: number[] | null) => void;
  /** The panel registers an opener so the inspector can drill into subgraphs. */
  registerApi?: (api: { openSubgraph: (node: GNode) => void }) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 0.2 });
  const [subgraph, setSubgraph] = useState<SubgraphFrame | null>(null);
  const [showControls, setShowControls] = useState(true);
  const drag = useRef<{ pointerId: number; px: number; py: number; x: number; y: number } | null>(null);
  const fittedFor = useRef<SubgraphFrame | null | "init">("init");
  const pendingFocus = useRef<number | null>(null);
  const seenFocus = useRef(0);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasHover = useRef<number | null>(null);

  const cancelHoverPan = useCallback(() => {
    if (hoverTimer.current !== null) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const clearCanvasHover = useCallback(() => {
    canvasHover.current = null;
    onCanvasHoverPath?.(null);
  }, [onCanvasHoverPath]);

  const targets = useMemo(() => bindingTargets(preset), [preset]);
  const topModel = useMemo(() => normalizeGraph(workflow), [workflow]);
  const model = useMemo(
    () => subgraph ? normalizeGraph(workflow, subgraph.id) : topModel,
    [workflow, subgraph, topModel],
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

  // Centre a node in the current view.
  const centreOn = useCallback(
    (m: GraphModel | null, nodeId: number, onlyIfOutside = false) => {
      const node = m?.nodes.find((n) => n.id === nodeId);
      if (!m || !node) return;
      setView((v) => {
        if (onlyIfOutside && nodeIsVisible(node, v, size)) return v;
        const scale = onlyIfOutside ? v.scale : Math.max(v.scale, 0.5);
        return {
          scale,
          x: size.w / 2 - (node.pos[0] + node.size[0] / 2) * scale,
          y: size.h / 2 - (node.pos[1] + (node.size[1] - 30) / 2) * scale,
        };
      });
    },
    [size],
  );

  // Fit on entry, unless a row click requested a specific node.
  useEffect(() => {
    if (fittedFor.current !== subgraph && model) {
      fittedFor.current = subgraph;
      if (pendingFocus.current !== null) {
        centreOn(model, pendingFocus.current);
        pendingFocus.current = null;
      } else {
        doFit(model);
      }
    }
  }, [model, subgraph, doFit, centreOn]);

  // External focus requests from the Controls list.
  useEffect(() => {
    if (!focus || focus.seq === seenFocus.current) return;
    const frame = requestAnimationFrame(() => {
      seenFocus.current = focus.seq;
      cancelHoverPan();
      clearCanvasHover();
      const [top, inner] = focus.path;
      if (top === undefined) return;
      const inst = topModel?.nodes.find((n) => n.id === top);
      if (!inst) return;
      if (inner !== undefined) {
        if (inst.subgraph) {
          const frameSg = { id: inst.subgraph, name: inst.subgraphName ?? inst.title ?? "Subgraph", instanceId: top };
          const innerModel = normalizeGraph(workflow, inst.subgraph);
          const node = innerModel?.nodes.find((n) => n.id === inner);
          if (!node) return;
          onSelect({ node, subgraph: frameSg });
          if (subgraph?.id === frameSg.id && subgraph.instanceId === top) {
            centreOn(innerModel, inner);
          } else {
            pendingFocus.current = inner;
            setSubgraph(frameSg);
          }
          return;
        }
      }
      onSelect({ node: inst, subgraph: null });
      if (subgraph) {
        pendingFocus.current = top;
        setSubgraph(null);
      } else {
        centreOn(topModel, top);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [focus, topModel, workflow, subgraph, centreOn, onSelect, cancelHoverPan, clearCanvasHover]);

  // Panel-hover pan, debounced so sweeping the list doesn't thrash. Panning
  // is instant (no animation), so reduced motion needs no special case.
  useEffect(() => {
    if (!panelHoverPath || drag.current) return;
    const nodeId = nodeIdForPath(panelHoverPath, subgraph?.instanceId ?? null);
    if (nodeId === undefined) return;
    hoverTimer.current = setTimeout(() => {
      hoverTimer.current = null;
      if (!drag.current) centreOn(model, nodeId, true);
    }, 120);
    return cancelHoverPan;
  }, [panelHoverPath, subgraph, model, centreOn, cancelHoverPan]);

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
      if (!node.subgraph) return;
      cancelHoverPan();
      clearCanvasHover();
      setSubgraph({ id: node.subgraph, name: node.subgraphName ?? node.title ?? "Subgraph", instanceId: node.id });
      onSelect(null);
    },
    [onSelect, cancelHoverPan, clearCanvasHover],
  );
  useEffect(() => {
    registerApi?.({ openSubgraph: openSubgraphCb });
  }, [registerApi, openSubgraphCb]);

  // Bound nodes for the current view.
  const bound = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const t of targets) {
      const id = nodeIdForPath(t.path, subgraph?.instanceId ?? null);
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

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelHoverPan();
      clearCanvasHover();
      if (drag.current || e.deltaY === 0) return;
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setView((v) => {
        const scale = Math.min(2, Math.max(0.1, v.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
        const k = scale / v.scale;
        return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [cancelHoverPan, clearCanvasHover]);

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 || !e.isPrimary) return;
    cancelHoverPan();
    if (e.target instanceof Element && e.target.closest("[data-node]")) return;
    clearCanvasHover();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { pointerId: e.pointerId, px: e.clientX, py: e.clientY, x: view.x, y: view.y };
  };
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const activeDrag = drag.current;
    if (activeDrag) {
      if (activeDrag.pointerId !== e.pointerId) return;
      setView((v) => ({
        ...v,
        x: activeDrag.x + e.clientX - activeDrag.px,
        y: activeDrag.y + e.clientY - activeDrag.py,
      }));
      return;
    }
    if (e.pointerType === "touch") return;
    const target = e.target instanceof Element ? e.target.closest("[data-node]") : null;
    const id = target ? Number(target.getAttribute("data-node")) : null;
    if (canvasHover.current === id) return;
    canvasHover.current = id;
    onCanvasHoverPath?.(id === null ? null : subgraph ? [subgraph.instanceId, id] : [id]);
  };
  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (drag.current?.pointerId !== e.pointerId) return;
    drag.current = null;
    clearCanvasHover();
  };

  const zoom = (factor: number) => {
    cancelHoverPan();
    clearCanvasHover();
    setView((v) => {
      const scale = Math.min(2, Math.max(0.1, v.scale * factor));
      const k = scale / v.scale;
      return { scale, x: size.w / 2 - (size.w / 2 - v.x) * k, y: size.h / 2 - (size.h / 2 - v.y) * k };
    });
  };

  const title = nodeDisplayName;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-panel border border-line bg-black">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <nav className="flex min-w-0 items-center gap-1.5 text-caption">
          <button
            type="button"
            onClick={() => {
              cancelHoverPan();
              clearCanvasHover();
              setSubgraph(null);
              onSelect(null);
            }}
            className={`truncate ${subgraph ? "text-t3 hover:text-t1" : "text-t1 font-medium"}`}
          >
            {presetName}
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
            className={`flex h-7 items-center gap-1.5 rounded-md border px-2 text-caption font-medium ${
              showControls ? "border-ac text-t1" : "border-line text-t3 hover:border-t3 hover:text-t1"
            }`}
          >
            <Icon d={SECTION_ICONS.sliders} className="h-3.5 w-3.5" />
            Show controls
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => zoom(1 / 1.2)}
            className="grid h-7 w-7 place-items-center rounded-md border border-line text-t2 hover:border-t3 hover:text-t1"
          >
            <Icon d={SECTION_ICONS.minus} className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => zoom(1.2)}
            className="grid h-7 w-7 place-items-center rounded-md border border-line text-t2 hover:border-t3 hover:text-t1"
          >
            <Icon d={SECTION_ICONS.plus} className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              cancelHoverPan();
              clearCanvasHover();
              doFit(model);
            }}
            className="flex h-7 items-center rounded-md border border-line px-2 text-caption font-medium text-t2 hover:border-t3 hover:text-t1"
          >
            Fit
          </button>
        </div>
      </div>

      <div ref={wrap} className="relative min-h-0 flex-1">
        <svg
          className="absolute inset-0 h-full w-full touch-none cursor-grab select-none active:cursor-grabbing"
          onPointerEnter={cancelHoverPan}
          onPointerLeave={clearCanvasHover}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={(e) => {
            onPointerUp(e);
            clearCanvasHover();
          }}
          onLostPointerCapture={onPointerUp}
        >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
            {model?.groups.map((g, i) => (
              <g key={`g${i}`} pointerEvents="none">
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
                  pointerEvents="none"
                />
              );
            })}

            {model?.nodes.map((n) => {
              const isSub = !!n.subgraph;
              const isSelected = selection?.node.id === n.id &&
                (selection.subgraph?.instanceId ?? null) === (subgraph?.instanceId ?? null) &&
                (selection.subgraph?.id ?? null) === (subgraph?.id ?? null);
              const boundLabels = bound.get(n.id);
              const highlighted = showControls && !!boundLabels;
              const hovered = panelHoverPath
                ? nodeIdForPath(panelHoverPath, subgraph?.instanceId ?? null) === n.id
                : false;
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
                      isSelected ? "#fff" : highlighted || hovered ? "#FF5B22" : "var(--color-line, #2a2a2a)"
                    }
                    strokeWidth={isSelected || highlighted || hovered ? 2.5 : 1}
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
                    pointerEvents="none"
                    className={!n.title && !isSub ? "font-mono" : undefined}
                    x={n.pos[0] + 10}
                    y={n.pos[1] - 10}
                    fill="#e6e6e6"
                    fontSize={14}
                    fontWeight={600}
                  >
                    {truncate(title(n), Math.max(12, Math.floor(n.size[0] / 9)))}
                  </text>
                  {isSub && (
                    <g pointerEvents="none" transform={`translate(${n.pos[0] + n.size[0] - 76} ${n.pos[1] - 25})`}>
                      <rect width={68} height={20} rx={10} fill="#000" stroke="#FF5B22" strokeOpacity={0.5} />
                      <text x={34} y={14} textAnchor="middle" fill="#FF5B22" fontSize={11}>
                        Subgraph
                      </text>
                    </g>
                  )}
                  {highlighted && boundLabels && (
                    <g pointerEvents="none" transform={`translate(${n.pos[0] + 10} ${n.pos[1] - 8})`}>
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
