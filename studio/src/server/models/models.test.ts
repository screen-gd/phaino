import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getEnv } from "@/server/env";
import { applyPreset } from "../presets/bind";
import { bindsOf, presetSchema } from "../presets/schema";
import { loadObjectInfo, validateWorkflowApi } from "../presets/validate";
import { detectPreset } from "./bindings";
import {
  MODEL_REGISTRY,
  modelById,
  modeForPresetId,
  modePresetId,
  type ModelMode,
} from "./registry";
import {
  cacheFiles,
  loadModelsManifest,
  syntheticPreset,
  type ModelsManifest,
} from "./resolve";

const env = getEnv();
const manifest = loadModelsManifest(env);
const folderIds = fs
  .readdirSync(env.presetsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

type ModeId = `${string}-${ModelMode}`;

function modeEntry(id: string) {
  return manifest?.modes?.[id];
}

function loadGraphs(template: string) {
  const files = cacheFiles(template, env);
  return {
    api: JSON.parse(fs.readFileSync(files.apiFile, "utf8")),
    ui: JSON.parse(fs.readFileSync(files.uiFile, "utf8")),
  };
}

describe("registry ids", () => {
  it("synthetic mode ids are slugs and never collide with preset folders", () => {
    const seen = new Set<string>();
    for (const model of MODEL_REGISTRY) {
      for (const mode of Object.keys(model.modes) as ModelMode[]) {
        const src = model.modes[mode];
        if (src && "template" in src) {
          const id = modePresetId(model, mode);
          expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
          expect(seen.has(id), `duplicate synthetic id ${id}`).toBe(false);
          expect(folderIds, `${id} collides with a preset folder`).not.toContain(
            id,
          );
          seen.add(id);
          expect(modeForPresetId(id)?.model.id).toBe(model.id);
        }
      }
    }
  });

  it("preset-backed modes keep the folder preset id", () => {
    const ltx = modelById("ltx25")!;
    expect(modePresetId(ltx, "i2v")).toBe("ltx25-i2v");
    expect(modeForPresetId("ltx25-i2v")).toBeNull();
  });
});

describe.skipIf(!manifest)("models manifest", () => {
  const man = manifest as ModelsManifest;

  it("covers every template-backed mode in the registry", () => {
    for (const model of MODEL_REGISTRY) {
      for (const [mode, src] of Object.entries(model.modes)) {
        if (src && "template" in src) {
          const id = modePresetId(model, mode as ModelMode);
          expect(man.modes[id], `${id} missing from manifest`).toBeTruthy();
        }
      }
    }
  });

  for (const model of MODEL_REGISTRY) {
    for (const mode of Object.keys(model.modes) as ModelMode[]) {
      const src = model.modes[mode];
      if (!src || !("template" in src)) continue;
      const id = modePresetId(model, mode) as ModeId;

      describe(id, () => {
        const entry = modeEntry(id);
        it.skipIf(!entry)("has a manifest entry", () => {
          expect(entry!.template).toBe(src.template);
          expect(["pass", "fail"]).toContain(entry!.gate);
        });

        const isPass = entry?.gate === "pass";
        it.skipIf(!isPass)("cache holds both graphs", () => {
          const files = cacheFiles(entry!.template, env);
          expect(fs.existsSync(files.apiFile)).toBe(true);
          expect(fs.existsSync(files.uiFile)).toBe(true);
        });

        it.skipIf(!isPass)("detects a valid preset", () => {
          const { api, ui } = loadGraphs(entry!.template);
          const detection = detectPreset(model, mode, api, ui, loadObjectInfo());
          expect(detection.problems).toEqual([]);
          expect(detection.preset).not.toBeNull();
          expect(() => presetSchema.parse(detection.preset)).not.toThrow();
        });

        it.skipIf(!isPass)("validates against the snapshot", () => {
          const { api } = loadGraphs(entry!.template);
          const preset = syntheticPreset(id, env)!;
          expect(preset).not.toBeNull();
          expect(validateWorkflowApi(api, preset, loadObjectInfo())).toEqual([]);
        });

        it.skipIf(!isPass)(
          "defaults reproduce the template graph apart from seeds",
          () => {
            const { api } = loadGraphs(entry!.template);
            const preset = syntheticPreset(id, env)!;
            const seedParam = preset.params.find((p) => p.type === "seed")!;
            const firstSeed = bindsOf(seedParam.bind)[0];
            const originalSeed = api[firstSeed.node]?.inputs?.[firstSeed.field];
            // Keep required image inputs at their template value.
            const inputs: Record<string, string> = {};
            for (const inp of preset.inputs) {
              const v = api[inp.bind.node]?.inputs?.[inp.bind.field];
              if (v !== undefined) inputs[inp.key] = String(v);
            }
            const applied = applyPreset(
              api,
              preset,
              { inputs },
              { seed: Number(originalSeed) },
            );
            // Every seed bind may differ; restore the template's values.
            for (const b of bindsOf(seedParam.bind)) {
              const node = applied[b.node];
              node.inputs = { ...node.inputs, [b.field]: api[b.node].inputs?.[b.field] };
            }
            expect(applied).toEqual(api);
          },
        );
      });
    }
  }
});

describe.skipIf(!manifest)("binding detection snapshots", () => {
  const cases: { modelId: string; mode: ModelMode }[] = [
    { modelId: "wan22", mode: "t2v" },
    { modelId: "flux3-klein", mode: "t2i" },
    { modelId: "hunyuan15", mode: "i2v" },
  ];
  for (const { modelId, mode } of cases) {
    const model = modelById(modelId)!;
    const id = modePresetId(model, mode);
    const entry = modeEntry(id);

    it.skipIf(!entry || entry.gate !== "pass")(
      `${id} binds`,
      () => {
        const { api, ui } = loadGraphs(entry!.template);
        const d = detectPreset(model, mode, api, ui, loadObjectInfo());
        expect(d.problems).toEqual([]);
        const preset = d.preset!;
        expect({
          params: preset.params.map((p) => ({
            key: p.key,
            binds: bindsOf(
              "bind" in p ? p.bind : undefined,
            ).map((b) => `${b.node}.${b.field}`),
          })),
          inputs: preset.inputs.map(
            (i) => `${i.key}:${i.label}@${i.bind.node}.${i.bind.field}`,
          ),
          outputs: preset.outputs,
        }).toMatchSnapshot();
      },
    );
  }
});
