import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { StudioEnv } from "@/server/env";
import { prepareEditJob, type EditDeps } from "../edits/prepare";
import { bindsOf } from "../presets/schema";
import { detectSwapPreset } from "./bindings";
import {
  modelById,
  modeForPresetId,
  modePresetId,
  type ModelEntry,
} from "./registry";

const scail2 = modelById("scail2")!;

type SwapNode = {
  class_type?: string;
  inputs?: Record<string, unknown>;
  _meta?: { title?: string };
};

/**
 * A minimal swap graph: one LoadVideo, one consumed LoadImage, positive text
 * encodes in two flattened subgraphs, a shared negative, and two SaveVideo
 * nodes where only "Final output" is the real output.
 */
function fixtureApi(): Record<string, SwapNode> {
  return {
    "1": { class_type: "LoadVideo", inputs: { file: "clip.mp4" } },
    "2": { class_type: "LoadImage", inputs: { image: "char.png" } },
    "3": {
      class_type: "SwapStage",
      inputs: {
        video: ["1", 0],
        image: ["2", 0],
        positive: ["4", 0],
        negative: ["5", 0],
        seed: 42,
      },
    },
    "4": { class_type: "CLIPTextEncode", inputs: { text: "base prompt" } },
    "5": { class_type: "CLIPTextEncode", inputs: { text: "bad quality" } },
    "213:3": {
      class_type: "CLIPTextEncode",
      inputs: { text: "extend prompt" },
    },
    "262:258": {
      class_type: "SwapExtend",
      inputs: { positive: ["213:3", 0], negative: ["5", 0], noise_seed: 7 },
    },
    "8": {
      class_type: "CreateVideo",
      inputs: { images: ["262:258", 0], fps: 16 },
    },
    "9": {
      class_type: "SaveVideo",
      inputs: { video: ["3", 0] },
      _meta: { title: "first segment" },
    },
    "10": {
      class_type: "SaveVideo",
      inputs: { video: ["8", 0] },
      _meta: { title: "Final output" },
    },
  };
}

const ui = { nodes: [] };
const objectInfo = { nodes: {} };

describe("swap preset ids", () => {
  it("mode `id` overrides the synthetic preset id and round-trips", () => {
    expect(modePresetId(scail2, "swap")).toBe("kawarimi");
    expect(modeForPresetId("kawarimi")).toEqual({ model: scail2, mode: "swap" });
    expect(modeForPresetId("scail2-swap")).toBeNull();
  });
});

describe("detectSwapPreset", () => {
  it("detects inputs, the final output and the prompt bind list", () => {
    const d = detectSwapPreset(scail2, fixtureApi(), ui, objectInfo);
    expect(d.problems).toEqual([]);
    const p = d.preset!;
    expect(p.id).toBe("kawarimi");
    expect(p.name).toBe("SCAIL-2");
    expect(p.category).toBe("video");
    expect(p.model.license).toBe("open");
    expect(p.order).toBe(50);
    expect(p.inputs).toEqual([
      {
        key: "video",
        type: "video",
        label: "Source video",
        required: true,
        bind: { node: "1", field: "file" },
      },
      {
        key: "character",
        type: "image",
        label: "Character",
        required: true,
        bind: { node: "2", field: "image" },
      },
    ]);
    expect(p.outputs).toEqual([{ node: "10", kind: "video" }]);

    const prompt = p.params.find((x) => x.key === "prompt")!;
    expect(prompt.type).toBe("text");
    expect("default" in prompt && prompt.default).toBe(
      "Replace the person with the character from the reference image",
    );
    expect(bindsOf("bind" in prompt ? prompt.bind : undefined)).toEqual([
      { node: "4", field: "text" },
      { node: "213:3", field: "text" },
    ]);

    const negative = p.params.find((x) => x.key === "negative")!;
    expect(negative.type).toBe("text");
    expect(bindsOf("bind" in negative ? negative.bind : undefined)).toEqual([
      { node: "5", field: "text" },
    ]);

    const seed = p.params.find((x) => x.key === "seed")!;
    expect(bindsOf(seed.bind)).toEqual([
      { node: "3", field: "seed" },
      { node: "262:258", field: "noise_seed" },
    ]);

    // The clip is conformed to the CreateVideo fps feeding the final Save.
    expect(d.inputFps).toBe(16);
    // Swap never derives frame counts or output size.
    expect(d.frames).toBeUndefined();
    expect(d.size).toBeUndefined();
  });

  it("falls back to the traced prompt when the mode sets no override", () => {
    const model: ModelEntry = {
      id: "x-swap",
      label: "X Swap",
      kind: "video",
      modes: { swap: { template: "tpl" } },
    };
    const d = detectSwapPreset(model, fixtureApi(), ui, objectInfo);
    expect(d.problems).toEqual([]);
    const prompt = d.preset!.params.find((x) => x.key === "prompt")!;
    expect("default" in prompt && prompt.default).toBe("base prompt");
  });

  it("fails without a LoadVideo node", () => {
    const api = fixtureApi();
    delete api["1"];
    const d = detectSwapPreset(scail2, api, ui, objectInfo);
    expect(d.problems.some((p) => p.startsWith("video input:"))).toBe(true);
  });

  it("fails with two consumed LoadImage nodes", () => {
    const api = fixtureApi();
    api["6"] = { class_type: "LoadImage", inputs: { image: "other.png" } };
    api["3"].inputs!.extra = ["6", 0];
    const d = detectSwapPreset(scail2, api, ui, objectInfo);
    expect(d.problems.some((p) => p.startsWith("character:"))).toBe(true);
  });

  it("fails when no Save video node is titled final", () => {
    const api = fixtureApi();
    delete api["10"];
    api["11"] = { class_type: "SaveVideo", inputs: { video: ["8", 0] } };
    const d = detectSwapPreset(scail2, api, ui, objectInfo);
    expect(d.preset).toBeNull();
    expect(d.problems.some((p) => p.startsWith("output:"))).toBe(true);
  });
});

describe("prepareEditJob (swap)", () => {
  function swapEnv(): StudioEnv {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "phaino-swap-"));
    fs.mkdirSync(path.join(root, "presets"), { recursive: true });
    fs.mkdirSync(path.join(root, "models", "cache"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "models", "manifest.json"),
      JSON.stringify({
        ref: "test",
        modes: {
          kawarimi: {
            template: "tpl-swap",
            gate: "pass",
            reasons: [],
            licenses: [],
          },
        },
        tools: {},
      }),
    );
    fs.writeFileSync(
      path.join(root, "models", "cache", "tpl-swap.api.json"),
      JSON.stringify(fixtureApi()),
    );
    fs.writeFileSync(
      path.join(root, "models", "cache", "tpl-swap.ui.json"),
      JSON.stringify(ui),
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
      trackerFile: "",
    };
  }

  function putUpload(dataDir: string, name = `${crypto.randomUUID()}.mp4`) {
    const dir = path.join(dataDir, "uploads");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), "video-bytes");
    return name;
  }

  it("trims a source clip longer than maxSeconds and conforms the fps", async () => {
    const e = swapEnv();
    const video = putUpload(e.dataDir);
    const character = putUpload(e.dataDir, `${crypto.randomUUID()}.png`);
    const calls: string[][] = [];
    const deps: EditDeps = {
      probe: async () => ({
        width: 1280,
        height: 720,
        fps: 24,
        durationSec: 12,
        hasAudio: true,
      }),
      ffmpeg: async (args) => {
        calls.push(args);
        fs.writeFileSync(args[args.length - 1], "trimmed");
      },
    };
    const out = await prepareEditJob(
      "kawarimi",
      { video, character },
      {},
      e,
      deps,
    );
    expect(out).not.toBeNull();
    expect(out!.trimmed).toBe(true);
    expect(out!.inputs.video).not.toBe(video);
    expect(out!.inputs.character).toBe(character);
    const args = calls[0];
    expect(args[args.indexOf("-t") + 1]).toBe("5");
    expect(args[args.indexOf("-r") + 1]).toBe("16");
    // Swap derives no frame/size writes.
    expect(out!.derived).toEqual([]);
  });

  it("returns null for a non-swap, non-tool preset id", async () => {
    const e = swapEnv();
    const out = await prepareEditJob("dolly-in", {}, {}, e);
    expect(out).toBeNull();
  });
});
