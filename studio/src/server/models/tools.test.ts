import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getEnv } from "@/server/env";
import { loadObjectInfo } from "../presets/validate";
import { detectToolPreset } from "./bindings";
import {
  cacheFiles,
  loadModelsManifest,
  syntheticToolPreset,
  listTools,
  type ModelsManifest,
} from "./resolve";
import { EDIT_TOOLS, outpaintPads, toolForPresetId, toolPresetId } from "./tools";
import type { StudioEnv } from "@/server/env";

const env = getEnv();
const manifest = loadModelsManifest(env);

function loadGraphs(template: string) {
  const files = cacheFiles(template, env);
  return {
    api: JSON.parse(fs.readFileSync(files.apiFile, "utf8")),
    ui: JSON.parse(fs.readFileSync(files.uiFile, "utf8")),
  };
}

describe("tool ids", () => {
  it("edit-* ids are slugs and round-trip to the tool", () => {
    for (const tool of EDIT_TOOLS) {
      const id = toolPresetId(tool);
      expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(id).toBe(`edit-${tool.id}`);
      expect(toolForPresetId(id)?.id).toBe(tool.id);
    }
    expect(toolForPresetId("edit")).toBeNull();
    expect(toolForPresetId("wan22-t2v")).toBeNull();
  });
});

describe("outpaintPads", () => {
  it("16:9 source to 9:16 pads top and bottom", () => {
    const p = outpaintPads(1920, 1080, "9:16");
    // pad itself rounds to 16: r16((3408-1080)/2) = r16(1164) = 1168
    expect(p).toEqual({ left: 0, right: 0, top: 1168, bottom: 1168 });
    expect((p.top + p.bottom + 1080) / 1920).toBeCloseTo(16 / 9, 1);
  });

  it("9:16 source to 16:9 pads left and right", () => {
    const p = outpaintPads(1080, 1920, "16:9");
    expect(p.top).toBe(0);
    expect(p.bottom).toBe(0);
    expect(p.left).toBe(p.right);
    expect(p.left).toBeGreaterThan(0);
    expect(p.left % 16).toBe(0);
  });

  it("16:9 source to 1:1 pads vertically in multiples of 16", () => {
    const p = outpaintPads(1920, 1080, "1:1");
    expect(p.top).toBe(p.bottom);
    expect(p.top % 16).toBe(0);
    expect(p.top).toBeGreaterThanOrEqual(400);
  });

  it("same aspect gives zero pads", () => {
    const p = outpaintPads(1280, 720, "16:9");
    expect(p).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
  });
});

describe.skipIf(!manifest?.tools)("tool detection (real cache)", () => {
  const man = manifest as ModelsManifest;

  it("covers every template-backed tool", () => {
    for (const tool of EDIT_TOOLS) {
      if (!tool.template) continue;
      expect(man.tools![`edit-${tool.id}`], `edit-${tool.id}`).toBeTruthy();
    }
  });

  for (const tool of EDIT_TOOLS) {
    if (!tool.template) continue;
    const id = `edit-${tool.id}`;
    const entry = man.tools?.[id];
    const isPass = entry?.gate === "pass";

    it.skipIf(!isPass)(`${id} detects a video input, video output, schema`, () => {
      const { api, ui } = loadGraphs(entry!.template);
      const d = detectToolPreset(tool, api, ui, loadObjectInfo());
      expect(d.problems).toEqual([]);
      const preset = d.preset!;
      expect(preset.category).toBe("edit");
      const videos = preset.inputs.filter((i) => i.type === "video");
      expect(videos).toHaveLength(1);
      expect(preset.outputs).toEqual([
        { node: expect.any(String), kind: "video" },
      ]);
      if (tool.prompt) {
        expect(preset.params.some((p) => p.type === "text")).toBe(true);
      }
    });
  }

  it("reframe derives an aspect choice plus the pad node", () => {
    const entry = man.tools?.["edit-reframe"];
    expect(entry?.gate).toBe("pass");
    const { api, ui } = loadGraphs(entry!.template);
    const tool = EDIT_TOOLS.find((t) => t.id === "reframe")!;
    const d = detectToolPreset(tool, api, ui, loadObjectInfo());
    expect(d.padsNode).toBeTruthy();
    const aspect = d.preset!.params.find((p) => p.key === "aspect");
    expect(aspect?.type).toBe("choice");
  });

  it("fps-boost binds the multiplier primitive as a 2x/4x choice", () => {
    const entry = man.tools?.["edit-fps-boost"];
    expect(entry?.gate).toBe("pass");
    const { api, ui } = loadGraphs(entry!.template);
    const tool = EDIT_TOOLS.find((t) => t.id === "fps-boost")!;
    const d = detectToolPreset(tool, api, ui, loadObjectInfo());
    const mult = d.preset!.params.find((p) => p.key === "multiplier");
    expect(mult).toBeTruthy();
    expect(mult && "options" in mult ? mult.options.map((o) => o.value) : []).toEqual([2, 4]);
  });

  it("remove labels its prompt as the object to erase", () => {
    const entry = man.tools?.["edit-remove"];
    expect(entry?.gate).toBe("pass");
    const { api, ui } = loadGraphs(entry!.template);
    const tool = EDIT_TOOLS.find((t) => t.id === "remove")!;
    const d = detectToolPreset(tool, api, ui, loadObjectInfo());
    const prompt = d.preset!.params.find((p) => p.key === "prompt");
    expect(prompt && "label" in prompt ? prompt.label : "").toBe(
      "What to remove",
    );
  });
});

describe("hidden tools", () => {
  function isolatedEnv(): StudioEnv {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "phaino-tools-"));
    fs.mkdirSync(path.join(root, "presets"), { recursive: true });
    fs.mkdirSync(path.join(root, "models"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "models", "manifest.json"),
      JSON.stringify({ ref: "test", modes: {}, tools: {} }),
    );
    return {
      comfyApiKey: undefined,
      comfyBaseUrl: undefined,
      presetsDir: path.join(root, "presets"),
      forksDir: "",
      dataDir: path.join(root, "data"),
      user: "local",
      siteUrl: "http://localhost:3000",
      ffmpegPath: "ffmpeg",
      ffprobePath: "ffprobe",
      partnerModels: false,
      trackerFile: "",
    };
  }

  it("a tool missing from the manifest never surfaces", () => {
    const e = isolatedEnv();
    expect(syntheticToolPreset("edit-upscale", e)).toBeNull();
    const listed = listTools(e);
    expect(listed.find((t) => t.tool.id === "upscale")?.presetId).toBeNull();
    // The app-level extend tool stays visible without a manifest entry.
    expect(listed.some((t) => t.tool.id === "extend")).toBe(true);
  });

  it("a failed gate hides the preset id too", () => {
    const e = isolatedEnv();
    const man = loadModelsManifest(e)!;
    (man.tools as Record<string, unknown>)["edit-depth"] = {
      template: "utility_depth_anything3_video_depth_estimation",
      gate: "fail",
      reasons: ["gated repo"],
      licenses: [],
    };
    fs.writeFileSync(
      path.join(path.dirname(e.presetsDir), "models", "manifest.json"),
      JSON.stringify(man),
    );
    expect(syntheticToolPreset("edit-depth", e)).toBeNull();
  });
});
