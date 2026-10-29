import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { StudioEnv } from "@/server/env";
import type { ResolvedTool } from "@/server/models/resolve";
import { EDIT_TOOLS, type EditTool } from "@/server/models/tools";
import type { Preset } from "@/server/presets/schema";
import {
  conformUpload,
  deriveWrites,
  prepareEditJob,
  prepareToolJob,
  type EditDeps,
} from "./prepare";

function env(): StudioEnv {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "phaino-edit-"));
  return {
    comfyApiKey: undefined,
    comfyBaseUrl: undefined,
    presetsDir: "",
    forksDir: "",
    dataDir,
    user: "local",
    siteUrl: "http://localhost:3000",
    ffmpegPath: "ffmpeg",
    ffprobePath: "ffprobe",
    trackerFile: "",
  };
}

const videoInputPreset = {
  inputs: [
    {
      key: "video",
      type: "video" as const,
      label: "Source video",
      required: true,
      bind: { node: "1", field: "file" },
    },
  ],
} as unknown as Preset;

function tool(over: Partial<EditTool>): EditTool {
  return {
    id: "x",
    label: "X",
    description: "x",
    icon: "pencil",
    template: "tpl",
    prompt: false,
    ...over,
  };
}

/** ffmpeg fake: writes an empty file at the last arg. */
function fakeDeps(probeResult: {
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  hasAudio: boolean;
}): EditDeps & { calls: string[][] } {
  const calls: string[][] = [];
  return {
    calls,
    probe: async () => probeResult,
    ffmpeg: async (args) => {
      calls.push(args);
      fs.writeFileSync(args[args.length - 1], "trimmed");
    },
  };
}

function putUpload(dataDir: string, name = `${crypto.randomUUID()}.mp4`) {
  const dir = path.join(dataDir, "uploads");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), "video-bytes");
  return name;
}

describe("conformUpload", () => {
  it("re-encodes the first N seconds and registers the new upload", async () => {
    const e = env();
    const src = putUpload(e.dataDir);
    const deps = fakeDeps({
      width: 1920, height: 1080, fps: 24, durationSec: 12, hasAudio: true,
    });
    const out = await conformUpload(
      e.dataDir,
      path.join(e.dataDir, "uploads", src),
      { seconds: 5 },
      e,
      deps,
      true,
    );
    expect(out).toMatch(/^[0-9a-f-]{36}\.mp4$/);
    expect(fs.existsSync(path.join(e.dataDir, "uploads", out))).toBe(true);
    const args = deps.calls[0];
    expect(args).toContain("-t");
    expect(args[args.indexOf("-t") + 1]).toBe("5");
    expect(args).toContain("libx264");
    expect(args).toContain("18");
    // temp file is cleaned up
    expect(
      fs.readdirSync(path.join(e.dataDir, "uploads")).filter((f) =>
        f.startsWith("trim-"),
      ),
    ).toHaveLength(0);
  });

  it("drops audio for silent sources and conforms fps when asked", async () => {
    const e = env();
    const src = putUpload(e.dataDir);
    const deps = fakeDeps({
      width: 1920, height: 1080, fps: 24, durationSec: 12, hasAudio: false,
    });
    await conformUpload(
      e.dataDir,
      path.join(e.dataDir, "uploads", src),
      { seconds: 5, fps: 16 },
      e,
      deps,
      false,
    );
    expect(deps.calls[0]).toContain("-an");
    const args = deps.calls[0];
    expect(args[args.indexOf("-r") + 1]).toBe("16");
  });
});

describe("prepareToolJob", () => {
  const resolved: ResolvedTool = {
    preset: videoInputPreset,
    frames: [{ node: "306:289", field: "length", cap: 81 }],
  };

  it("keeps short clips and derives the frame count", async () => {
    const e = env();
    const uploadId = putUpload(e.dataDir);
    const deps = fakeDeps({
      width: 1280, height: 720, fps: 24, durationSec: 4, hasAudio: true,
    });
    const out = await prepareToolJob(
      tool({ maxSeconds: 5 }),
      resolved,
      { video: uploadId },
      {},
      e,
      deps,
    );
    expect(out.trimmed).toBe(false);
    expect(out.inputs.video).toBe(uploadId);
    expect(deps.calls).toHaveLength(0);
    // 4s * 24fps = 96 frames, capped at the template default 81.
    expect(out.derived).toEqual([
      { node: "306:289", field: "length", value: 81 },
    ]);
  });

  it("trims past maxSeconds and writes the new upload into inputs", async () => {
    const e = env();
    const uploadId = putUpload(e.dataDir);
    const deps = fakeDeps({
      width: 1280, height: 720, fps: 30, durationSec: 12, hasAudio: true,
    });
    const out = await prepareToolJob(
      tool({ maxSeconds: 5 }),
      resolved,
      { video: uploadId },
      {},
      e,
      deps,
    );
    expect(out.trimmed).toBe(true);
    expect(out.inputs.video).not.toBe(uploadId);
    expect(out.inputs.video).toMatch(/\.mp4$/);
    expect(deps.calls).toHaveLength(1);
    // 5s * 30 = 150 capped to 81
    expect(out.derived[0].value).toBe(81);
  });

  it("conforms to a literal CreateVideo fps so the clip fits the frame cap", async () => {
    const e = env();
    const uploadId = putUpload(e.dataDir);
    const deps = fakeDeps({
      width: 1280, height: 720, fps: 24, durationSec: 5, hasAudio: true,
    });
    const out = await prepareToolJob(
      tool({ maxSeconds: 5 }),
      { ...resolved, inputFps: 16 },
      { video: uploadId },
      {},
      e,
      deps,
    );
    expect(deps.calls).toHaveLength(1);
    const args = deps.calls[0];
    expect(args[args.indexOf("-r") + 1]).toBe("16");
    expect(args).not.toContain("-t");
    // 5s conformed to 16fps = 80 frames, snapped to 4n+1 under cap 81 -> 77.
    expect(out.derived[0].value).toBe(77);
  });

  it("skips the re-encode when the source already runs at the template fps", async () => {
    const e = env();
    const uploadId = putUpload(e.dataDir);
    const deps = fakeDeps({
      width: 1280, height: 720, fps: 16, durationSec: 4, hasAudio: true,
    });
    const out = await prepareToolJob(
      tool({ maxSeconds: 5 }),
      { ...resolved, inputFps: 16 },
      { video: uploadId },
      {},
      e,
      deps,
    );
    expect(deps.calls).toHaveLength(0);
    expect(out.inputs.video).toBe(uploadId);
    // 4s * 16 = 64 -> 61 (4n+1 under 81)
    expect(out.derived[0].value).toBe(61);
  });
});

describe("prepareEditJob partner engines", () => {
  it("keeps a clip at or under the engine maxSeconds untouched", async () => {
    const e = env();
    const uploadId = putUpload(e.dataDir);
    const deps = fakeDeps({
      width: 1280, height: 720, fps: 24, durationSec: 8, hasAudio: true,
    });
    const out = await prepareEditJob(
      "kawarimi-h3",
      { video: uploadId, character: "c.png" },
      {},
      e,
      deps,
    );
    expect(out?.trimmed).toBe(false);
    expect(out?.derived).toEqual([]);
    expect(out?.inputs.video).toBe(uploadId);
    expect(out?.source).toEqual({
      uploadId,
      seconds: 8,
      hasAudio: true,
    });
    expect(deps.calls).toHaveLength(0);
  });

  it("trims past the engine maxSeconds with no fps conform or derived writes", async () => {
    const e = env();
    const uploadId = putUpload(e.dataDir);
    const deps = fakeDeps({
      width: 1280, height: 720, fps: 30, durationSec: 20, hasAudio: true,
    });
    const out = await prepareEditJob(
      "kawarimi-h3",
      { video: uploadId, character: "c.png" },
      {},
      e,
      deps,
    );
    expect(out?.trimmed).toBe(true);
    expect(out?.derived).toEqual([]);
    expect(out?.inputs.video).not.toBe(uploadId);
    expect(out?.source?.seconds).toBe(15);
    expect(deps.calls).toHaveLength(1);
    const args = deps.calls[0];
    expect(args[args.indexOf("-t") + 1]).toBe("15");
    expect(args).not.toContain("-r");
  });
});

describe("deriveWrites", () => {
  it("writes reframe pads from the probe and chosen aspect", () => {
    const resolved: ResolvedTool = {
      preset: videoInputPreset,
      padsNode: "110",
    };
    const reframe = EDIT_TOOLS.find((t) => t.id === "reframe")!;
    const out = deriveWrites(
      resolved,
      reframe,
      { width: 1920, height: 1080, fps: 24 },
      4,
      24,
      { aspect: "9:16" },
    );
    expect(out).toContainEqual({ node: "110", field: "top", value: 1168 });
    expect(out).toContainEqual({ node: "110", field: "bottom", value: 1168 });
    // Zero pads are written too, overriding the template defaults.
    expect(out).toContainEqual({ node: "110", field: "left", value: 0 });
    expect(out).toContainEqual({ node: "110", field: "right", value: 0 });
  });

  it("snaps Wan 4n+1 lengths down without touching other caps", () => {
    const resolved: ResolvedTool = {
      preset: videoInputPreset,
      frames: [
        { node: "a", field: "length", cap: 81 },
        { node: "b", field: "length", cap: 1 },
      ],
    };
    const out = deriveWrites(
      resolved,
      tool({}),
      { width: 1280, height: 720, fps: 24 },
      2.5,
      24,
      {},
    );
    // 2.5s * 24 = 60 frames -> 57 (4n+1 under 81); the cap-1 bind stays 1.
    expect(out).toContainEqual({ node: "a", field: "length", value: 57 });
    expect(out).toContainEqual({ node: "b", field: "length", value: 1 });
  });

  it("derives output size at the template budget, 16-multiples", () => {
    const resolved: ResolvedTool = {
      preset: videoInputPreset,
      size: {
        width: { node: "49", field: "width", value: 720 },
        height: { node: "49", field: "height", value: 720 },
      },
    };
    const reframe = EDIT_TOOLS.find((t) => t.id === "reframe")!;
    const out = deriveWrites(
      resolved,
      reframe,
      { width: 1920, height: 1080, fps: 24 },
      4,
      16,
      { aspect: "9:16" },
    );
    const w = out.find((x) => x.field === "width")!.value;
    const h = out.find((x) => x.field === "height")!.value;
    expect(w % 16).toBe(0);
    expect(h % 16).toBe(0);
    expect(w / h).toBeCloseTo(9 / 16, 1);
    expect(w * h).toBeGreaterThan(400_000);
  });
});
