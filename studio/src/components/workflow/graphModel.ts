/**
 * Pure graph model for the workflow viewer. Normalizes ComfyUI's UI-format
 * workflow.json (top level or one subgraph) into flat node/link lists with
 * a single link shape, subgraph input/output pseudo-nodes and graph bounds.
 */

export type GSlot = { name: string; label?: string; type: string };

export type GWidget = { name: string; value: unknown };

export type GNode = {
  /** UI-graph node id; pseudo nodes use -10 (inputs) / -20 (outputs). */
  id: number;
  type: string;
  title?: string;
  pos: [number, number];
  size: [number, number];
  inputs: GSlot[];
  outputs: GSlot[];
  widgets: GWidget[];
  mode: number;
  collapsed: boolean;
  /** Subgraph id when this node is a subgraph instance. */
  subgraph?: string;
  /** Definition name for subgraph instances (their type is the UUID). */
  subgraphName?: string;
  /** Set on the Inputs/Outputs pseudo-nodes inside a subgraph view. */
  pseudo?: "inputs" | "outputs";
};

export type GLink = {
  id: number;
  from: number;
  fromSlot: number;
  to: number;
  toSlot: number;
  type: string;
};

export type GGroup = {
  title: string;
  bounding: [number, number, number, number];
  color?: string;
};

/** What a user should read for a node: title, subgraph name, then class. */
export function nodeDisplayName(n: GNode): string {
  if (n.title) return n.title;
  if (n.subgraph) return n.subgraphName ?? "Subgraph";
  return n.type;
}

export type GraphBounds = { x: number; y: number; w: number; h: number };

export type GraphModel = {
  nodes: GNode[];
  links: GLink[];
  groups: GGroup[];
  bounds: GraphBounds;
};

type RawNode = {
  id?: number;
  type?: string;
  pos?: number[] | { 0: number; 1: number };
  size?: number[] | Record<string, number>;
  title?: string;
  inputs?: unknown[];
  outputs?: unknown[];
  widgets_values_named?: Record<string, unknown>;
  mode?: number;
  flags?: { collapsed?: boolean };
};

const asPair = (v: unknown): [number, number] => {
  if (Array.isArray(v)) return [Number(v[0]) || 0, Number(v[1]) || 0];
  if (v && typeof v === "object") {
    const o = v as Record<string, number>;
    return [Number(o["0"] ?? o.x ?? 0) || 0, Number(o["1"] ?? o.y ?? 0) || 0];
  }
  return [0, 0];
};

const asSlot = (v: unknown): GSlot | null => {
  if (!v || typeof v !== "object") return null;
  const s = v as Record<string, unknown>;
  if (typeof s.name !== "string") return null;
  return {
    name: s.name,
    label: typeof s.label === "string" ? s.label
      : typeof s.localized_name === "string" ? s.localized_name
      : undefined,
    type: typeof s.type === "string" ? s.type : "*",
  };
};

function asNode(raw: RawNode, subgraphs?: Record<string, unknown>[]): GNode | null {
  if (typeof raw.id !== "number" || typeof raw.type !== "string") return null;
  const widgets = Object.entries(raw.widgets_values_named ?? {}).map(
    ([name, value]) => ({ name, value }),
  );
  const def = subgraphs?.find((s) => s.id === raw.type);
  const sub = def?.id as string | undefined;
  return {
    id: raw.id,
    type: raw.type,
    title: typeof raw.title === "string" ? raw.title : undefined,
    subgraphName:
      sub && typeof def?.name === "string" ? def.name : undefined,
    pos: asPair(raw.pos),
    size: asPair(raw.size),
    inputs: (raw.inputs ?? []).map(asSlot).filter((s): s is GSlot => s !== null),
    outputs: (raw.outputs ?? []).map(asSlot).filter((s): s is GSlot => s !== null),
    widgets,
    mode: typeof raw.mode === "number" ? raw.mode : 0,
    collapsed: raw.flags?.collapsed === true,
    subgraph: sub,
  };
}

/** Unifies the top-level array links and the subgraph object links. */
function asLinks(raw: unknown): GLink[] {
  if (!Array.isArray(raw)) return [];
  const out: GLink[] = [];
  for (const l of raw) {
    if (Array.isArray(l)) {
      const [id, from, fromSlot, to, toSlot, type] = l as unknown[];
      if (typeof from === "number" && typeof to === "number") {
        out.push({
          id: typeof id === "number" ? id : out.length,
          from,
          fromSlot: Number(fromSlot) || 0,
          to,
          toSlot: Number(toSlot) || 0,
          type: typeof type === "string" ? type : "*",
        });
      }
    } else if (l && typeof l === "object") {
      const o = l as Record<string, unknown>;
      if (typeof o.origin_id === "number" && typeof o.target_id === "number") {
        out.push({
          id: typeof o.id === "number" ? o.id : out.length,
          from: o.origin_id,
          fromSlot: Number(o.origin_slot) || 0,
          to: o.target_id,
          toSlot: Number(o.target_slot) || 0,
          type: typeof o.type === "string" ? o.type : "*",
        });
      }
    }
  }
  return out;
}

function asGroups(raw: unknown): GGroup[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((g): g is Record<string, unknown> => !!g && typeof g === "object")
    .map((g) => ({
      title: typeof g.title === "string" ? g.title : "",
      bounding: [
        Number((g.bounding as number[])?.[0]) || 0,
        Number((g.bounding as number[])?.[1]) || 0,
        Number((g.bounding as number[])?.[2]) || 0,
        Number((g.bounding as number[])?.[3]) || 0,
      ],
      color: typeof g.color === "string" ? g.color : undefined,
    }));
}

/** A pseudo-node for a subgraph's inputNode/outputNode bounding box. */
function pseudoNode(
  kind: "inputs" | "outputs",
  bounding: unknown,
  slots: unknown[],
): GNode | null {
  const b = asPair4(bounding);
  if (!b) return null;
  const isIn = kind === "inputs";
  const parsed = slots.map(asSlot).filter((s): s is GSlot => s !== null);
  return {
    id: isIn ? -10 : -20,
    type: isIn ? "SUBGRAPH_INPUTS" : "SUBGRAPH_OUTPUTS",
    title: isIn ? "Inputs" : "Outputs",
    pos: [b[0], b[1]],
    size: [b[2], b[3]],
    inputs: isIn ? [] : parsed,
    outputs: isIn ? parsed : [],
    widgets: [],
    mode: 0,
    collapsed: false,
    pseudo: kind,
  };
}

function asPair4(v: unknown): [number, number, number, number] | null {
  if (!Array.isArray(v) || v.length < 4) return null;
  return [Number(v[0]) || 0, Number(v[1]) || 0, Number(v[2]) || 0, Number(v[3]) || 0];
}

/**
 * Normalize workflow.json at the top level, or inside `subgraphId` (a
 * definitions.subgraphs entry). Unknown subgraphId returns null.
 */
export function normalizeGraph(
  workflowUi: unknown,
  subgraphId?: string,
): GraphModel | null {
  const root = (workflowUi ?? {}) as Record<string, unknown>;
  const subgraphs = Array.isArray((root.definitions as Record<string, unknown> | undefined)?.subgraphs)
    ? ((root.definitions as { subgraphs: unknown[] }).subgraphs as Record<string, unknown>[])
    : [];

  let nodeList: RawNode[];
  let linksRaw: unknown;
  let groupsRaw: unknown;
  let extra: GNode[] = [];

  if (subgraphId === undefined) {
    nodeList = Array.isArray(root.nodes) ? (root.nodes as RawNode[]) : [];
    linksRaw = root.links;
    groupsRaw = root.groups;
  } else {
    const sg = subgraphs.find((s) => s.id === subgraphId);
    if (!sg) return null;
    nodeList = Array.isArray(sg.nodes) ? (sg.nodes as RawNode[]) : [];
    linksRaw = sg.links;
    groupsRaw = sg.groups;
    extra = [
      pseudoNode("inputs", (sg.inputNode as Record<string, unknown> | undefined)?.bounding, Array.isArray(sg.inputs) ? sg.inputs : []),
      pseudoNode("outputs", (sg.outputNode as Record<string, unknown> | undefined)?.bounding, Array.isArray(sg.outputs) ? sg.outputs : []),
    ].filter((n): n is GNode => n !== null);
  }

  const nodes = [
    ...extra,
    ...nodeList.map((n) => asNode(n, subgraphs)).filter((n): n is GNode => n !== null),
  ];
  const links = asLinks(linksRaw);
  const groups = asGroups(groupsRaw);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const grow = (x: number, y: number, w: number, h: number) => {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
  };
  for (const n of nodes) grow(n.pos[0], n.pos[1] - 30, Math.max(n.size[0], 40), n.size[1] + 30);
  for (const g of groups) grow(g.bounding[0], g.bounding[1], g.bounding[2], g.bounding[3]);
  const bounds = Number.isFinite(minX)
    ? { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) }
    : { x: 0, y: 0, w: 1, h: 1 };

  return { nodes, links, groups, bounds };
}

/** litegraph layout: slot i centres at pos.y + 10 + i*20; inputs on the left edge. */
export function slotPosition(
  node: { pos: [number, number]; size: [number, number] },
  dir: "in" | "out",
  index: number,
): [number, number] {
  return [
    dir === "in" ? node.pos[0] : node.pos[0] + node.size[0],
    node.pos[1] + 10 + index * 20,
  ];
}

/** View transform fitting bounds into the viewport with padding, centred. */
export function fitView(
  bounds: GraphBounds,
  viewport: { w: number; h: number },
  padding = 40,
): { x: number; y: number; scale: number } {
  const w = Math.max(1, bounds.w + padding * 2);
  const h = Math.max(1, bounds.h + padding * 2);
  const scale = Math.min(viewport.w / w, viewport.h / h);
  return {
    scale,
    x: viewport.w / 2 - (bounds.x + bounds.w / 2) * scale,
    y: viewport.h / 2 - (bounds.y + bounds.h / 2) * scale,
  };
}

export function nodeIsVisible(
  node: Pick<GNode, "pos" | "size">,
  view: ReturnType<typeof fitView>,
  viewport: { w: number; h: number },
): boolean {
  const left = node.pos[0] * view.scale + view.x;
  const top = (node.pos[1] - 30) * view.scale + view.y;
  const right = left + node.size[0] * view.scale;
  const bottom = (node.pos[1] + node.size[1]) * view.scale + view.y;
  return left >= 0 && top >= 0 && right <= viewport.w && bottom <= viewport.h;
}

export function nodeIdForPath(
  path: readonly number[],
  instanceId: number | null,
): number | undefined {
  return instanceId === null
    ? path[0]
    : path[0] === instanceId ? path[1] : undefined;
}

export function bindingMatchesHover(
  binding: readonly number[],
  hovered: readonly number[] | null,
): boolean {
  return !!hovered?.length && hovered.length <= binding.length &&
    hovered.every((id, index) => id === binding[index]);
}

export type BindingTarget = {
  /** [topId] for top-level nodes, [topId, innerId] inside a subgraph instance. */
  path: number[];
  key: string;
  label: string;
  kind: "input" | "param" | "output";
};

function bindPath(node: string): number[] {
  return node.split(":").map((s) => Number.parseInt(s, 10)).filter((n) => Number.isFinite(n));
}

type BindLike = { node: string } | { node: string }[];

function firstNode(b: BindLike | undefined): string | null {
  if (!b) return null;
  return (Array.isArray(b) ? b[0] : b)?.node ?? null;
}

/** Every preset binding mapped to a UI-graph node path. */
export function bindingTargets(preset: {
  inputs: readonly { key: string; label: string; bind: { node: string } }[];
  params: readonly { key: string; label: string; bind?: BindLike }[];
  outputs: readonly { node: string; kind: string }[];
}): BindingTarget[] {
  const out: BindingTarget[] = [];
  for (const input of preset.inputs) {
    out.push({ path: bindPath(input.bind.node), key: input.key, label: input.label, kind: "input" });
  }
  for (const param of preset.params) {
    const node = firstNode(param.bind);
    if (node) {
      out.push({ path: bindPath(node), key: param.key, label: param.label, kind: "param" });
    }
  }
  for (const output of preset.outputs) {
    out.push({ path: bindPath(output.node), key: `out:${output.node}`, label: `${output.kind} output`, kind: "output" });
  }
  return out;
}
