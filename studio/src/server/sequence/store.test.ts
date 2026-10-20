import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { StudioEnv } from "@/server/env";
import { emptySequence } from "./model";
import { openSequenceStore } from "./store";

function env(): StudioEnv {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "phaino-seq-"));
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
    partnerModels: false,
    trackerFile: "",
  };
}

function seedSequence(e: StudioEnv) {
  fs.mkdirSync(e.dataDir, { recursive: true });
  const seq = {
    ...emptySequence(),
    clips: [
      {
        id: "a",
        path: "test/a.mp4",
        name: "a.mp4",
        srcFps: 24,
        width: 1920,
        height: 1080,
        durationSec: 3,
        in: 0,
        out: 72,
      },
      {
        id: "b",
        path: "test/b.mp4",
        name: "b.mp4",
        srcFps: 24,
        width: 1920,
        height: 1080,
        durationSec: 2,
        in: 0,
        out: 48,
      },
    ],
  };
  fs.writeFileSync(
    path.join(e.dataDir, "sequence.json"),
    JSON.stringify(seq),
  );
  return seq;
}

describe("sequence store", () => {
  it("reads the default empty sequence", async () => {
    const store = openSequenceStore(env());
    const seq = await store.getSequence();
    expect(seq).toEqual(emptySequence());
  });

  it("reorders and trims clips via updateSequence", async () => {
    const e = env();
    seedSequence(e);
    const store = openSequenceStore(e);
    const seq = await store.updateSequence({
      clips: [
        { id: "b", in: 4, out: 20 },
        { id: "a", in: 0, out: 72 },
      ],
    });
    expect(seq.clips.map((c) => c.id)).toEqual(["b", "a"]);
    expect(seq.clips[0].in).toBe(4);
    expect(seq.clips[0].out).toBe(20);
    // Persisted
    const again = await store.getSequence();
    expect(again.clips[0].id).toBe("b");
  });

  it("rejects a clips patch with mismatched ids", async () => {
    const e = env();
    seedSequence(e);
    const store = openSequenceStore(e);
    await expect(
      store.updateSequence({ clips: [{ id: "a", in: 0, out: 10 }] }),
    ).rejects.toThrow("every clip id");
    await expect(
      store.updateSequence({
        clips: [
          { id: "a", in: 0, out: 10 },
          { id: "zzz", in: 0, out: 10 },
        ],
      }),
    ).rejects.toThrow("every clip id");
  });

  it("rescales in/out on an fps change and touches settings", async () => {
    const e = env();
    seedSequence(e);
    const store = openSequenceStore(e);
    const seq = await store.updateSequence({
      fps: 30,
      clips: [
        { id: "a", in: 0, out: 48 },
        { id: "b", in: 0, out: 48 },
      ],
    });
    expect(seq.fps).toBe(30);
    expect(seq.settingsTouched).toBe(true);
    // 24->30 rescale first: a was 0-72 -> 0-90 (90 = full 3s at 30fps),
    // then the incoming trim is applied after rescale.
    // a's total at 30fps is 90, so 0-48 stays.
    expect(seq.clips[0].out).toBe(48);
    // b: 2s at 30fps = 60 frames
    expect(seq.clips[1].out).toBe(48);
  });

  it("removeClip drops the clip", async () => {
    const e = env();
    seedSequence(e);
    const store = openSequenceStore(e);
    const seq = await store.removeClip("a");
    expect(seq.clips.map((c) => c.id)).toEqual(["b"]);
    await expect(store.removeClip("zzz")).rejects.toThrow("Unknown clip");
  });
});

