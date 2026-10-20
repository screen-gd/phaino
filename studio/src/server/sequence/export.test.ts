import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { StudioEnv } from "@/server/env";
import { openStore } from "@/server/jobs/store";
import { subscribeJob } from "@/server/jobs/runner";
import { emptySequence, type Media, type Sequence } from "./model";
import { startExport, type RunFfmpeg } from "./export";
import type { SequenceStore } from "./store";

function env(): StudioEnv {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "phaino-export-"));
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

function videoMedia(id: string, name: string, durationSec: number): Media {
  return {
    id,
    path: `test/${name}`,
    name,
    kind: "video",
    srcFps: 24,
    width: 1920,
    height: 1080,
    durationSec,
    hasAudio: true,
  };
}

const CUT = { type: "cut" as const, frames: 0 };

/**
 * Two clips: "a" 3s at 24fps (72 frames, full length),
 * "b" 2s (48 frames) trimmed 4-28 so its 12-frame head clamps to 4.
 */
function seq(): Sequence {
  return {
    ...emptySequence(),
    media: [videoMedia("ma", "Orbit.mp4", 3), videoMedia("mb", "Dive.mp4", 2)],
    clips: [
      {
        id: "a",
        mediaId: "ma",
        in: 0,
        out: 48,
        volume: 1,
        muted: false,
        fadeIn: 0,
        fadeOut: 0,
        transition: CUT,
      },
      {
        id: "b",
        mediaId: "mb",
        in: 4,
        out: 28,
        volume: 1,
        muted: false,
        fadeIn: 0,
        fadeOut: 0,
        transition: CUT,
      },
    ],
  };
}

function fakeSequences(sequence: Sequence): SequenceStore {
  return {
    getSequence: async () => sequence,
    updateSequence: async () => sequence,
    importMedia: async () => sequence.media[0] as Media,
    appendClip: async () => sequence,
    removeClip: async () => sequence,
    removeMedia: async () => sequence,
  };
}

/** Writes an empty file at the last arg and reports 10 frames of progress. */
function fakeRunFfmpeg(files: string[]): RunFfmpeg {
  return async (args, onFrame) => {
    const out = args[args.length - 1];
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, "media");
    files.push(out);
    onFrame?.(10);
  };
}

describe("startExport", () => {
  it("rejects an empty sequence", async () => {
    const e = env();
    const jobs = openStore(path.join(e.dataDir, "phaino.db"));
    await expect(
      startExport(
        { action: "render" },
        { env: e, jobs, sequences: fakeSequences(emptySequence()), runFfmpeg: fakeRunFfmpeg([]) },
      ),
    ).rejects.toThrow("empty");
  });

  it("render: one ffmpeg pass, mp4 copied into outputs for the Library", async () => {
    const e = env();
    const jobs = openStore(path.join(e.dataDir, "phaino.db"));
    const files: string[] = [];
    const job = await startExport(
      { action: "render" },
      {
        env: e,
        jobs,
        sequences: fakeSequences(seq()),
        runFfmpeg: fakeRunFfmpeg(files),
        now: () => "2026-10-19T00:00:00.000Z",
      },
    );
    expect(job.params.action).toBe("render");
    await vi.waitFor(() => {
      expect(jobs.get(job.id)?.status).toBe("succeeded");
    }, { timeout: 5000 });

    const dir = path.join(e.dataDir, "exports", job.id);
    expect(files).toHaveLength(1);
    expect(files[0]).toBe(path.join(dir, "phaino_render.mp4"));
    const libPath = `editor/render-${job.id}.mp4`;
    expect(fs.existsSync(path.join(e.dataDir, "outputs", libPath))).toBe(true);
    const finished = jobs.get(job.id)!;
    expect(finished.outputs).toEqual(["phaino_render.mp4"]);
  });

  it("package: conforms media, renders the movie and writes fcpxml/edl/summary", async () => {
    const e = env();
    const jobs = openStore(path.join(e.dataDir, "phaino.db"));
    const files: string[] = [];
    const progresses: number[] = [];
    const job = await startExport(
      { action: "package", codec: "h264" },
      {
        env: e,
        jobs,
        sequences: fakeSequences(seq()),
        runFfmpeg: fakeRunFfmpeg(files),
        now: () => "2026-10-19T00:00:00.000Z",
      },
    );
    expect(job.status).toBe("queued");
    expect(job.category).toBe("export");
    const unsub = subscribeJob(job.id, (row) => progresses.push(row.progress));

    await vi.waitFor(() => {
      expect(jobs.get(job.id)?.status).toBe("succeeded");
    }, { timeout: 5000 });
    unsub();

    const dir = path.join(e.dataDir, "exports", job.id);
    const expected = [
      "phaino_sequence.mp4",
      "phaino_sequence.fcpxml",
      "phaino_sequence.edl",
      "summary.txt",
      "media/01_orbit.mp4",
      "media/02_dive.mp4",
    ];
    for (const f of expected) {
      expect(fs.existsSync(path.join(dir, f)), f).toBe(true);
    }

    const finished = jobs.get(job.id)!;
    expect(finished.outputs?.sort()).toEqual(expected.slice().sort());
    expect(finished.progress).toBe(1);

    // Progress climbed along the way
    expect(progresses.some((p) => p > 0 && p < 1)).toBe(true);

    // Summary has the head-handle clamp note for clip 2 (in=4 < 12)
    const summary = fs.readFileSync(path.join(dir, "summary.txt"), "utf8");
    expect(summary).toContain("head handle 4 of 12 frames");
    expect(summary).toContain("01:00:00:00");
    expect(summary).toContain("01:00:03:00");
    expect(summary).toContain("Audio track and titles");

    // 3 ffmpeg invocations: 2 media + 1 sequence render
    expect(files).toHaveLength(3);
    expect(files[2]).toBe(path.join(dir, "phaino_sequence.mp4"));
  });

  it("package: a still on V1 loops in conform, music stays render-only", async () => {
    const e = env();
    const jobs = openStore(path.join(e.dataDir, "phaino.db"));
    const still: Media = {
      id: "mi",
      path: "test/Cover.png",
      name: "Cover.png",
      kind: "image",
      srcFps: 0,
      width: 1600,
      height: 1200,
      durationSec: 60,
      hasAudio: false,
    };
    const music: Media = {
      id: "mm",
      path: "uploads/editor/track.mp3",
      name: "track.mp3",
      kind: "audio",
      srcFps: 0,
      width: 0,
      height: 0,
      durationSec: 10,
      hasAudio: true,
    };
    const withStill: Sequence = {
      ...emptySequence(),
      media: [videoMedia("ma", "Orbit.mp4", 3), still, music],
      clips: [
        {
          id: "a",
          mediaId: "ma",
          in: 0,
          out: 48,
          volume: 1,
          muted: false,
          fadeIn: 0,
          fadeOut: 0,
          transition: CUT,
        },
        {
          id: "s",
          mediaId: "mi",
          in: 0,
          out: 72,
          volume: 1,
          muted: false,
          fadeIn: 0,
          fadeOut: 0,
          transition: CUT,
        },
      ],
      audio: [
        {
          id: "au",
          mediaId: "mm",
          start: 0,
          in: 0,
          out: 96,
          volume: 0.8,
          fadeIn: 0,
          fadeOut: 0,
        },
      ],
    };
    const calls: string[][] = [];
    const job = await startExport(
      { action: "package", codec: "h264" },
      {
        env: e,
        jobs,
        sequences: fakeSequences(withStill),
        runFfmpeg: async (args, onFrame) => {
          calls.push(args);
          const out = args[args.length - 1];
          fs.mkdirSync(path.dirname(out), { recursive: true });
          fs.writeFileSync(out, "media");
          onFrame?.(10);
        },
        now: () => "2026-10-19T00:00:00.000Z",
      },
    );
    await vi.waitFor(
      () => expect(jobs.get(job.id)?.status).toBe("succeeded"),
      { timeout: 5000 },
    );

    // 3 conform runs (video + still) + 1 render = music has no conform file.
    // Still conform loops the single frame; no audio mapping.
    const stillCall = calls.find(
      (c) => c.includes("-loop") && c.includes("-t"),
    );
    expect(stillCall, "still conform must loop the image").toBeTruthy();
    expect(stillCall).toContain("-an");

    const dir = path.join(e.dataDir, "exports", job.id);
    const finished = jobs.get(job.id)!;
    expect(finished.outputs).toContain("media/02_cover.mp4");
    // Music media produces no conform file and no EDL/FCPXML entry.
    expect(finished.outputs?.some((o) => o.includes("track"))).toBe(false);
    const edl = fs.readFileSync(path.join(dir, "phaino_sequence.edl"), "utf8");
    expect(edl).not.toContain("track.mp3");
    expect(edl).toContain("Cover.png");
  });
});
