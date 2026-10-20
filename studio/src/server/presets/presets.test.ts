import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getEnv } from "@/server/env";
import { listPresets, getPreset } from "./load";
import type { PresetBind } from "./schema";

type ObjectInfoSpec = [unknown, ...unknown[]];
type ObjectInfoNode = {
  input?: { required?: Record<string, ObjectInfoSpec>; optional?: Record<string, ObjectInfoSpec> };
};
type Snapshot = { meta: Record<string, unknown>; nodes: Record<string, ObjectInfoNode> };
type ApiNode = { class_type: string; inputs?: Record<string, unknown> };
type WorkflowApiGraph = Record<string, ApiNode>;

const snapshot = JSON.parse(
  fs.readFileSync(
    path.resolve(import.meta.dirname, "../comfy/object_info.snapshot.json"),
    "utf8",
  ),
) as Snapshot;

type ComboOption = {
  key?: string;
  inputs?: { required?: Record<string, ObjectInfoSpec>; optional?: Record<string, ObjectInfoSpec> };
};

function inputSpec(node: ApiNode, field: string): ObjectInfoSpec | null {
  const info = snapshot.nodes[node.class_type];
  if (!info?.input) return null;
  const direct = info.input.required?.[field] ?? info.input.optional?.[field];
  if (direct) return direct;
  // COMFY_DYNAMICCOMBO fields serialize sub-inputs as "<combo>.<name>"; resolve
  // the sub-input spec inside the option matching the node's current value.
  const dot = field.indexOf(".");
  if (dot < 0) return null;
  const parentName = field.slice(0, dot);
  const sub = field.slice(dot + 1);
  const parent =
    info.input.required?.[parentName] ?? info.input.optional?.[parentName];
  const options = (parent?.[1] as { options?: ComboOption[] } | undefined)
    ?.options;
  const opt = options?.find((o) => o.key === node.inputs?.[parentName]);
  return opt?.inputs?.required?.[sub] ?? opt?.inputs?.optional?.[sub] ?? null;
}

function comboOptions(spec: ObjectInfoSpec): unknown[] | null {
  if (Array.isArray(spec[0])) return spec[0] as unknown[];
  const cfg = spec[1] as { options?: unknown[] } | undefined;
  if (spec[0] === "COMBO" && Array.isArray(cfg?.options)) return cfg.options;
  return null;
}

function checkBind(graph: WorkflowApiGraph, bind: PresetBind, ctx: string) {
  const node = graph[bind.node];
  expect(node, `${ctx}: node "${bind.node}" missing from workflow_api.json`).toBeTruthy();
  const value = node.inputs?.[bind.field];
  expect(
    value !== undefined && !Array.isArray(value),
    `${ctx}: ${bind.node}.${bind.field} is not a literal widget value`,
  ).toBe(true);
  expect(
    inputSpec(node, bind.field),
    `${ctx}: ${node.class_type}.${bind.field} not in object_info snapshot`,
  ).toBeTruthy();
}

function checkBindValue(graph: WorkflowApiGraph, bind: PresetBind, value: unknown, ctx: string) {
  checkBind(graph, bind, ctx);
  const node = graph[bind.node];
  const spec = inputSpec(node, bind.field);
  if (!spec) return;
  const options = comboOptions(spec);
  if (options) {
    expect(
      options.includes(value),
      `${ctx}: value ${JSON.stringify(value)} not in ${node.class_type}.${bind.field} options`,
    ).toBe(true);
  }
  const type = spec[0];
  const config = (spec[1] ?? {}) as Record<string, unknown>;
  if (type === "INT" && typeof value === "number") {
    if (typeof config.min === "number") expect(value).toBeGreaterThanOrEqual(config.min);
    if (typeof config.max === "number") expect(value).toBeLessThanOrEqual(config.max);
  }
}

describe("presets on disk", () => {
  // partnerModels on: the full catalog, including the partner presets.
  // forksDir points at nothing so local forks can't skew the count.
  const env = {
    ...getEnv(),
    partnerModels: true,
    forksDir: path.join(getEnv().presetsDir, "__no_forks__"),
  };
  const presets = listPresets(env);

  it("loads all nine presets, folder name equals id", () => {
    expect(presets).toHaveLength(15);
    const dir = getEnv().presetsDir;
    for (const p of presets) {
      expect(fs.existsSync(path.join(dir, p.id, "preset.json"))).toBe(true);
    }
  });

  for (const preset of presets) {
    describe(preset.id, () => {
      const loaded = getPreset(preset.id, env);
      it("returns preset plus both graphs", () => {
        expect(loaded).not.toBeNull();
        expect(loaded!.preset.id).toBe(preset.id);
      });

      it("workflow.json is UI format (nodes + links)", () => {
        const ui = loaded!.workflowUi as { nodes?: unknown[]; links?: unknown[] };
        expect(Array.isArray(ui.nodes)).toBe(true);
        expect(Array.isArray(ui.links)).toBe(true);
      });

      it("uses only node classes in the object_info snapshot", () => {
        for (const [nodeId, node] of Object.entries(loaded!.workflowApi as WorkflowApiGraph)) {
          expect(
            snapshot.nodes[node.class_type],
            `node ${nodeId} (${node.class_type}) not in snapshot`,
          ).toBeTruthy();
        }
      });

      it("every bind points at a literal input that exists in the snapshot", () => {
        const graph = loaded!.workflowApi as WorkflowApiGraph;
        for (const input of preset.inputs) {
          checkBind(graph, input.bind, `input ${input.key}`);
        }
        for (const param of preset.params) {
          if ("bind" in param && param.bind) {
            checkBind(graph, param.bind, `param ${param.key}`);
          }
          if (param.type === "choice") {
            for (const option of param.options) {
              if (param.bind) {
                checkBindValue(graph, param.bind, option.value, `param ${param.key}`);
              }
              for (const set of option.set ?? []) {
                checkBindValue(graph, set, set.value, `param ${param.key} set`);
              }
            }
          }
        }
      });

      it("output nodes exist and are Save* nodes", () => {
        const graph = loaded!.workflowApi as WorkflowApiGraph;
        for (const out of preset.outputs) {
          const node = graph[out.node];
          expect(node, `output node ${out.node} missing`).toBeTruthy();
          expect(["SaveVideo", "SaveImage"]).toContain(node.class_type);
        }
      });
    });
  }
});

describe("partner preset visibility", () => {
  const noForks = path.join(getEnv().presetsDir, "__no_forks__");
  const off = { ...getEnv(), partnerModels: false, forksDir: noForks };
  const on = { ...getEnv(), partnerModels: true, forksDir: noForks };

  it("hides partner presets by default", () => {
    const ids = listPresets(off).map((p) => p.id);
    expect(listPresets(off).every((p) => p.model.license === "open")).toBe(true);
    expect(ids).not.toContain("kling3-video");
    expect(ids).not.toContain("seedance25-i2v");
    expect(ids).not.toContain("nano-banana-2");
  });

  it("shows them when PHAINO_PARTNER_MODELS is on", () => {
    const ids = listPresets(on).map((p) => p.id);
    expect(ids).toContain("kling3-video");
    expect(ids).toContain("seedance25-i2v");
    expect(ids).toContain("nano-banana-2");
  });

  it("getPreset treats a hidden partner id as not found", () => {
    expect(getPreset("kling3-video", off)).toBeNull();
    expect(getPreset("kling3-video", on)?.preset.id).toBe("kling3-video");
  });
});
