import {
  nodeDisplayName,
  slotPosition,
  type GNode,
  type GraphBounds,
  type GraphModel,
} from "@/components/workflow/graphModel";

const NOTE_TYPES = new Set(["MarkdownNote", "Note"]);
const PAD = 28;

/** Bounds of the kept nodes only, so hidden notes never push the view out. */
function boundsOf(nodes: GNode[]): GraphBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.pos[0]);
    minY = Math.min(minY, n.pos[1] - 30);
    maxX = Math.max(maxX, n.pos[0] + Math.max(n.size[0], 40));
    maxY = Math.max(maxY, n.pos[1] + n.size[1]);
  }
  return Number.isFinite(minX)
    ? { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) }
    : { x: 0, y: 0, w: 1, h: 1 };
}

/**
 * Read-only SVG of a ComfyUI graph: thin node rects, mono titles and bezier
 * wires, sized from the graph's own bounds. Server-compatible: no hooks, no
 * measurement, viewBox is fixed at render.
 */
export function GraphPreview({
  model,
  highlight,
  className,
  label,
}: {
  model: GraphModel;
  /** Node ids drawn with the accent stroke; their wires accent too. */
  highlight?: readonly number[];
  className?: string;
  /** aria-label when the graphic is meaningful; omit for decoration. */
  label?: string;
}) {
  const nodes = model.nodes.filter((n) => !NOTE_TYPES.has(n.type));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links = model.links.filter((l) => byId.has(l.from) && byId.has(l.to));
  const b = boundsOf(nodes);
  const hl = new Set(highlight ?? []);
  const fs = Math.min(15, Math.max(9, b.h / 60));

  return (
    <svg
      viewBox={`${b.x - PAD} ${b.y - PAD} ${b.w + PAD * 2} ${b.h + PAD * 2}`}
      preserveAspectRatio="xMidYMid meet"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
    >
      {links.map((l) => {
        const from = byId.get(l.from);
        const to = byId.get(l.to);
        if (!from || !to) return null;
        const [x1, y1] = slotPosition(from, "out", l.fromSlot);
        const [x2, y2] = slotPosition(to, "in", l.toSlot);
        const dx = Math.max(40, Math.abs(x2 - x1) / 2);
        const hot = hl.has(l.from) || hl.has(l.to);
        return (
          <path
            key={l.id}
            d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
            fill="none"
            stroke={hot ? "var(--color-ac)" : "var(--color-line)"}
            strokeWidth={hot ? 2 : 1.25}
            className="transition-[stroke] duration-200 motion-reduce:transition-none"
          />
        );
      })}
      {nodes.map((n) => {
        const hot = hl.has(n.id);
        return (
          <g key={n.id}>
            <rect
              x={n.pos[0]}
              y={n.pos[1]}
              width={Math.max(n.size[0], 40)}
              height={n.size[1]}
              rx={6}
              fill={n.pseudo ? "#151515" : "var(--color-s1)"}
              stroke={hot ? "var(--color-ac)" : "var(--color-line)"}
              strokeWidth={hot ? 2 : 1}
              strokeDasharray={n.pseudo ? "6 4" : undefined}
              className="transition-[stroke] duration-200 motion-reduce:transition-none"
            />
            <text
              x={n.pos[0] + 8}
              y={n.pos[1] - 8}
              fontSize={fs}
              fill={hot ? "var(--color-ac)" : "var(--color-t3)"}
              className="font-mono"
            >
              {nodeDisplayName(n)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
