import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  bindingTargets,
  bindingMatchesHover,
  fitView,
  nodeDisplayName,
  nodeIdForPath,
  nodeIsVisible,
  normalizeGraph,
  slotPosition,
} from "./graphModel";
import { presetSchema } from "@/server/presets/schema";

const dir = path.resolve(process.cwd(), "../presets/orbit");
const workflow = JSON.parse(fs.readFileSync(path.join(dir, "workflow.json"), "utf8"));
const preset = presetSchema.parse(
  JSON.parse(fs.readFileSync(path.join(dir, "preset.json"), "utf8")),
);
const subgraphId = workflow.definitions.subgraphs[0].id as string;

describe("normalizeGraph", () => {
  it("normalizes the top level of orbit", () => {
    const g = normalizeGraph(workflow);
    expect(g).not.toBeNull();
    expect(g!.nodes.length).toBe(workflow.nodes.length);
    expect(g!.links.length).toBe(workflow.links.length);
    // Array links become unified objects.
    const [id, from, fromSlot, to, toSlot] = workflow.links[0];
    expect(g!.links[0]).toMatchObject({ id, from, fromSlot, to, toSlot });
    // Subgraph instances are flagged.
    const inst = g!.nodes.find((n) => n.subgraph);
    expect(inst?.subgraph).toBe(subgraphId);
    // Bounds cover every node.
    for (const n of g!.nodes) {
      expect(n.pos[0]).toBeGreaterThanOrEqual(g!.bounds.x);
      expect(n.pos[1] - 30).toBeGreaterThanOrEqual(g!.bounds.y);
      expect(n.pos[0] + n.size[0]).toBeLessThanOrEqual(g!.bounds.x + g!.bounds.w);
    }
  });

  it("normalizes a subgraph with object links and pseudo nodes", () => {
    const g = normalizeGraph(workflow, subgraphId);
    expect(g).not.toBeNull();
    const names = g!.nodes.map((n) => n.pseudo).filter(Boolean);
    expect(names).toContain("inputs");
    expect(names).toContain("outputs");
    // Object links unify to {from, to}.
    expect(g!.links.length).toBe(workflow.definitions.subgraphs[0].links.length);
    for (const l of g!.links) {
      expect(typeof l.from).toBe("number");
      expect(typeof l.to).toBe("number");
    }
  });

  it("returns null for an unknown subgraph id", () => {
    expect(normalizeGraph(workflow, "nope")).toBeNull();
  });

  it("names subgraph instances after their definition, not the UUID", () => {
    const g = normalizeGraph(workflow);
    const inst = g!.nodes.find((n) => n.subgraph);
    expect(inst).toBeDefined();
    const defName = workflow.definitions.subgraphs[0].name as string;
    expect(inst!.subgraphName).toBe(defName);
    expect(nodeDisplayName(inst!)).not.toBe(inst!.type);
    expect(nodeDisplayName(inst!)).not.toContain(subgraphId);
  });
});

describe("slotPosition", () => {
  it("places inputs on the left edge and outputs on the right", () => {
    const node = { pos: [100, 200] as [number, number], size: [300, 100] as [number, number] };
    expect(slotPosition(node, "in", 0)).toEqual([100, 210]);
    expect(slotPosition(node, "in", 2)).toEqual([100, 250]);
    expect(slotPosition(node, "out", 1)).toEqual([400, 230]);
  });
});

describe("fitView", () => {
  it("centres and scales the bounds into the viewport", () => {
    const v = fitView({ x: 0, y: 0, w: 1000, h: 500 }, { w: 800, h: 400 }, 40);
    expect(v.scale).toBeCloseTo(Math.min(800 / 1080, 400 / 580));
    // bounds centre maps to viewport centre
    const cx = 500 * v.scale + v.x;
    const cy = 250 * v.scale + v.y;
    expect(cx).toBeCloseTo(400);
    expect(cy).toBeCloseTo(200);
  });
});

describe("bindingTargets", () => {
  it("maps orbit's preset bindings to node paths", () => {
    const targets = bindingTargets(preset);
    const byKey = new Map(targets.map((t) => [t.key, t]));
    expect(byKey.get("image")?.path).toEqual([395]);
    expect(byKey.get("prompt")?.path).toEqual([398, 376]);
    expect(byKey.get("seed")?.path).toEqual([398, 339]);
    expect(byKey.get("aspect")?.path).toEqual([403]);
    const out = targets.find((t) => t.kind === "output");
    expect(out?.path).toEqual([75]);
  });
});

describe("nodeIsVisible", () => {
  const node = { pos: [100, 100], size: [200, 100] } satisfies Parameters<typeof nodeIsVisible>[0];
  const viewport = { w: 800, h: 600 };

  it("keeps fully visible nodes in place at the current zoom", () => {
    expect(nodeIsVisible(node, { x: 0, y: 0, scale: 1 }, viewport)).toBe(true);
    expect(nodeIsVisible(node, { x: 500, y: 300, scale: 0.5 }, viewport)).toBe(true);
  });

  it("includes the title bar when checking the viewport", () => {
    expect(nodeIsVisible(node, { x: 0, y: -80, scale: 1 }, viewport)).toBe(false);
    expect(nodeIsVisible(node, { x: 0, y: -70, scale: 1 }, viewport)).toBe(true);
  });

  it.each([
    { x: -101, y: 0, scale: 1 },
    { x: 501, y: 0, scale: 1 },
    { x: 0, y: 401, scale: 1 },
    { x: 0, y: 0, scale: 4 },
  ])("detects clipped nodes with transform %o", (view) => {
    expect(nodeIsVisible(node, view, viewport)).toBe(false);
  });
});

describe("nodeIdForPath", () => {
  it("maps inner bindings to their instance at the top level", () => {
    expect(nodeIdForPath([398, 376], null)).toBe(398);
    expect(nodeIdForPath([395], null)).toBe(395);
  });

  it("only maps inner nodes inside the matching instance", () => {
    expect(nodeIdForPath([398, 376], 398)).toBe(376);
    expect(nodeIdForPath([399, 376], 398)).toBeUndefined();
    expect(nodeIdForPath([376], 398)).toBeUndefined();
    expect(nodeIdForPath([398], 398)).toBeUndefined();
    expect(nodeIdForPath([], null)).toBeUndefined();
  });
});

describe("bindingMatchesHover", () => {
  it("links all controls inside a hovered top-level instance", () => {
    expect(bindingMatchesHover([398, 376], [398])).toBe(true);
    expect(bindingMatchesHover([398, 339], [398])).toBe(true);
    expect(bindingMatchesHover([395], [398])).toBe(false);
  });

  it("distinguishes identical inner ids in different instances", () => {
    expect(bindingMatchesHover([398, 376], [398, 376])).toBe(true);
    expect(bindingMatchesHover([399, 376], [398, 376])).toBe(false);
    expect(bindingMatchesHover([376], [398, 376])).toBe(false);
    expect(bindingMatchesHover([398], [398, 376])).toBe(false);
  });

  it("clears linked rows when canvas hover ends", () => {
    expect(bindingMatchesHover([398, 376], null)).toBe(false);
    expect(bindingMatchesHover([398, 376], [])).toBe(false);
  });
});
