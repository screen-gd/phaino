import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { StudioEnv } from "@/server/env";
import type { JobRecord } from "@/server/jobs/store";
import type { SequenceStore } from "@/server/sequence/store";
import type { Clip, Media, Sequence } from "@/server/sequence/model";
import { emptySequence } from "@/server/sequence/model";
import { extendVideo, joinInEditor, type ExtendDeps } from "./extend";

function env(): StudioEnv {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "phaino-extend-"));
  return {
    comfyApiKey: undefined,
    comfyBaseUrl: undefined,
    // Real preset catalog so getPreset resolves the model's i2v mode.
    presetsDir: path.resolve(process.cwd(), "../presets"),
    forksDir: "",
    dataDir,
    user: "local",
    siteUrl: "http://localhost:3000",
    ffmpegPath: "ffmpeg",
    ffprobePath: "ffprobe",
    partnerModels: false,
    trackerFile: "",
  };
}

function putVideo(dataDir: string): string {
  const id = `${crypto.randomUUID()}.mp4`;
  const dir = path.join(dataDir, "uploads");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, id), "video-bytes");
  return id;
}

function fakeJob(): JobRecord {
  return {
    id: "job-1",
    presetId: "wan22-i2v",
    category: "edit",
    status: "queued",
    progress: 0,
    params: {},
    inputs: {},
    createdAt: "",
    updatedAt: "",
  } as JobRecord;
}

describe("extendVideo", () => {
  it("extracts the last frame then starts the model's i2v job", async () => {
    const e = env();
    const uploadId = putVideo(e.dataDir);
    const ffmpegCalls: string[][] = [];
    const startJob = vi.fn((input: Parameters<ExtendDeps["startJob"]>[0]) => {
      expect(input.presetId).toBe("wan22-i2v");
      expect(input.category).toBe("edit");
      expect(input.params.prompt).toBe("keep walking");
      expect(Object.keys(input.params)).toEqual(["prompt"]);
      const frame = input.inputs.image;
      expect(frame).toMatch(/^[0-9a-f-]{36}\.png$/);
      expect(
        fs.existsSync(path.join(e.dataDir, "uploads", frame)),
      ).toBe(true);
      return fakeJob();
    });
    const deps: ExtendDeps = {
      startJob,
      ffmpeg: async (args) => {
        ffmpegCalls.push(args);
        fs.writeFileSync(args[args.length - 1], "png-bytes");
      },
    };
    const job = await extendVideo(
      e,
      { uploadId, modelId: "wan22", prompt: "keep walking" },
      deps,
    );
    expect(job.id).toBe("job-1");
    // -sseof near the end, one frame out.
    const args = ffmpegCalls[0];
    expect(args).toContain("-sseof");
    expect(args).toContain("-frames:v");
    expect(args[args.length - 1]).toMatch(/\.png$/);
  });

  it("rejects an image upload and models without i2v", async () => {
    const e = env();
    const img = `${crypto.randomUUID()}.png`;
    const dir = path.join(e.dataDir, "uploads");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, img), "png-bytes");
    const deps: ExtendDeps = {
      startJob: () => fakeJob(),
      ffmpeg: async () => {},
    };
    await expect(
      extendVideo(e, { uploadId: img, modelId: "wan22" }, deps),
    ).rejects.toThrow(/video/);
    await expect(
      extendVideo(e, { uploadId: putVideo(e.dataDir), modelId: "flux3-klein" }, deps),
    ).rejects.toThrow(/image-to-video|i2v/i);
  });

  it("omits the prompt param entirely when blank", async () => {
    const e = env();
    const uploadId = putVideo(e.dataDir);
    const seen: Parameters<ExtendDeps["startJob"]>[0][] = [];
    const deps: ExtendDeps = {
      startJob: (input) => {
        seen.push(input);
        return fakeJob();
      },
      ffmpeg: async (args) => {
        fs.writeFileSync(args[args.length - 1], "png-bytes");
      },
    };
    await extendVideo(e, { uploadId, modelId: "wan22", prompt: "   " }, deps);
    expect(seen[0].params).toEqual({});
    // The template default stays: no key means applyPreset writes nothing.
  });
});

describe("joinInEditor", () => {
  it("appends source then result and trims the duplicated first frame", async () => {
    const e = env();
    const uploadId = putVideo(e.dataDir);
    const media = (id: string, name: string): Media => ({
      id,
      path: `uploads/editor/${name}`,
      name,
      kind: "video",
      srcFps: 24,
      width: 1920,
      height: 1080,
      durationSec: 5,
      hasAudio: true,
    });
    const clip = (id: string, mediaId: string): Clip => ({
      id,
      mediaId,
      in: 0,
      out: 120,
      volume: 1,
      muted: false,
      fadeIn: 0,
      fadeOut: 0,
      transition: { type: "cut", frames: 0 },
    });
    const seq: Sequence = {
      ...emptySequence(),
      media: [media("ms", "source.mp4"), media("mr", "result.mp4")],
      clips: [clip("cs", "ms"), clip("cr", "mr")],
    };
    const patched: Clip[][] = [];
    const store = {
      appendClip: async () => seq,
      updateSequence: async (p: { clips?: Clip[] }) => {
        if (p.clips) patched.push(p.clips);
        return seq;
      },
    } as unknown as SequenceStore;

    await joinInEditor(
      e,
      { uploadId, result: "wan22-i2v/ComfyUI_0001.mp4" },
      { store },
    );
    // The editor-upload copy landed where the store can read it.
    const editorFiles = fs.readdirSync(
      path.join(e.dataDir, "uploads", "editor"),
    );
    expect(editorFiles).toHaveLength(1);
    expect(editorFiles[0]).toMatch(/\.mp4$/);
    // Result clip starts one frame in; the source clip is untouched.
    expect(patched).toHaveLength(1);
    const byId = Object.fromEntries(
      patched[0].map((c) => [c.id, c]),
    );
    expect(byId.cr.in).toBe(1);
    expect(byId.cs.in).toBe(0);
  });
});
