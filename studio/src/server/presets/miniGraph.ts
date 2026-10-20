import "server-only";

import {
  bindingTargets,
  normalizeGraph,
  slotPosition,
} from "@/components/workflow/graphModel";
import type { Preset } from "./schema";

const MAX_NODES = 80;

export type MiniGraphNode = {
  x: number;
  y: number;
  w: number;
  h: number;
  bound: boolean;
};

export type MiniGraph = {
  aspect: number;
  nodes: MiniGraphNode[];
  links: [number, number, number, number][];
};

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * A small fitted graph (0..1 coords, uniform scale) for the preset card
 * hover overlay. `aspect` is the graph's width/height for the viewBox.
 */
export function miniGraph(
  preset: Pick<
    Preset,
    "inputs" | "params" | "outputs"
  >,
  workflowJson: unknown,
): MiniGraph | null {
  const model = normalizeGraph(workflowJson);
  if (!model || model.nodes.length === 0) return null;

  const nodes = model.nodes.slice(0, MAX_NODES);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const boundIds = new Set(bindingTargets(preset).map((t) => t.path[0]));

  const { bounds } = model;
  const scale = 1 / Math.max(1, bounds.w);
  const nx = (x: number) => r3((x - bounds.x) * scale);
  const ny = (y: number) => r3((y - bounds.y) * scale);

  const miniNodes = nodes.map((n) => ({
    x: nx(n.pos[0]),
    y: ny(n.pos[1]),
    w: Math.max(0.005, r3(n.size[0] * scale)),
    h: Math.max(0.005, r3((n.size[1] + 30) * scale)),
    bound: boundIds.has(n.id),
  }));

  const miniLinks = model.links.flatMap((l): [number, number, number, number][] => {
    const from = byId.get(l.from);
    const to = byId.get(l.to);
    if (!from || !to) return [];
    const [x1, y1] = slotPosition(from, "out", l.fromSlot);
    const [x2, y2] = slotPosition(to, "in", l.toSlot);
    return [[nx(x1), ny(y1), nx(x2), ny(y2)]];
  });

  return {
    aspect: r3(bounds.w / Math.max(1, bounds.h)),
    nodes: miniNodes,
    links: miniLinks,
  };
}
