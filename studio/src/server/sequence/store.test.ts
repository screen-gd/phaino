import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { StudioEnv } from "@/server/env";
import { emptySequence, type Media, type Sequence } from "./model";
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
    trackerFile: "",
  };
}

function videoMedia(id: string, durationSec = 3): Media {
  return {
    id,
    path: `test/${id}.mp4`,
    name: `${id}.mp4`,
    kind: "video",
    srcFps: 24,
    width: 1920,
    height: 1080,
    durationSec,
    hasAudio: true,
  };
}

function seedSequence(e: StudioEnv): Sequence {
  fs.mkdirSync(e.dataDir, { recursive: true });
  const seq: Sequence = {
    ...emptySequence(),
    media: [videoMedia("a"), videoMedia("b", 2)],
    clips: [
      {
        id: "ca",
        mediaId: "a",
        in: 0,
        out: 72,
        volume: 1,
        muted: false,
        fadeIn: 0,
        fadeOut: 0,
        transition: { type: "cut", frames: 0 },
      },
      {
        id: "cb",
        mediaId: "b",
        in: 0,
        out: 48,
        volume: 1,
        muted: false,
        fadeIn: 0,
        fadeOut: 0,
        transition: { type: "cut", frames: 0 },
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
        { id: "cb", mediaId: "b", in: 4, out: 20 },
        { id: "ca", mediaId: "a", in: 0, out: 72 },
      ],
    });
    expect(seq.clips.map((c) => c.id)).toEqual(["cb", "ca"]);
    expect(seq.clips[0].in).toBe(4);
    expect(seq.clips[0].out).toBe(20);
    const again = await store.getSequence();
    expect(again.clips[0].id).toBe("cb");
  });

  it("allows new clip ids (split/duplicate) and rejects unknown media", async () => {
    const e = env();
    seedSequence(e);
    const store = openSequenceStore(e);
    // A brand new clip id sharing media "a" is fine.
    const seq = await store.updateSequence({
      clips: [
        { id: "ca", mediaId: "a", in: 0, out: 36 },
        { id: "ca2", mediaId: "a", in: 36, out: 72 },
        { id: "cb", mediaId: "b", in: 0, out: 48 },
      ],
    });
    expect(seq.clips.map((c) => c.id)).toEqual(["ca", "ca2", "cb"]);

    await expect(
      store.updateSequence({
        clips: [{ id: "x", mediaId: "zzz", in: 0, out: 10 }],
      }),
    ).rejects.toThrow("Unknown media");
  });

  it("rejects audio media on the video lane and images on the audio lane", async () => {
    const e = env();
    fs.mkdirSync(e.dataDir, { recursive: true });
    const seq: Sequence = {
      ...emptySequence(),
      media: [
        videoMedia("a"),
        { ...videoMedia("s"), kind: "audio", width: 0, height: 0 },
        { ...videoMedia("i"), kind: "image", durationSec: 60 },
      ],
    };
    fs.writeFileSync(path.join(e.dataDir, "sequence.json"), JSON.stringify(seq));
    const store = openSequenceStore(e);
    await expect(
      store.updateSequence({
        clips: [{ id: "x", mediaId: "s", in: 0, out: 10 }],
      }),
    ).rejects.toThrow("video track");
    await expect(
      store.updateSequence({
        audio: [{ id: "x", mediaId: "i", start: 0, in: 0, out: 10 }],
      }),
    ).rejects.toThrow("audio track");
  });

  it("rescales every frame field on an fps change and touches settings", async () => {
    const e = env();
    seedSequence(e);
    const store = openSequenceStore(e);
    const seq = await store.updateSequence({ fps: 30 });
    expect(seq.fps).toBe(30);
    expect(seq.settingsTouched).toBe(true);
    // a was 0-72 (3s at 24) -> 0-90 (3s at 30); b 0-48 -> 0-60.
    expect(seq.clips[0].out).toBe(90);
    expect(seq.clips[1].out).toBe(60);
  });

  it("removeClip drops the clip", async () => {
    const e = env();
    seedSequence(e);
    const store = openSequenceStore(e);
    const seq = await store.removeClip("ca");
    expect(seq.clips.map((c) => c.id)).toEqual(["cb"]);
    await expect(store.removeClip("zzz")).rejects.toThrow("Unknown clip");
  });

  it("removeMedia drops the media and every clip using it", async () => {
    const e = env();
    fs.mkdirSync(e.dataDir, { recursive: true });
    const seq: Sequence = {
      ...emptySequence(),
      media: [videoMedia("a"), { ...videoMedia("s"), kind: "audio" }],
      clips: [
        {
          id: "ca",
          mediaId: "a",
          in: 0,
          out: 72,
          volume: 1,
          muted: false,
          fadeIn: 0,
          fadeOut: 0,
          transition: { type: "cut", frames: 0 },
        },
      ],
      audio: [
        {
          id: "sa",
          mediaId: "s",
          start: 0,
          in: 0,
          out: 24,
          volume: 1,
          fadeIn: 0,
          fadeOut: 0,
        },
      ],
    };
    fs.writeFileSync(path.join(e.dataDir, "sequence.json"), JSON.stringify(seq));
    const store = openSequenceStore(e);
    const next = await store.removeMedia("s");
    expect(next.media.map((m) => m.id)).toEqual(["a"]);
    expect(next.audio).toHaveLength(0);
    expect(next.clips).toHaveLength(1);
  });
});
