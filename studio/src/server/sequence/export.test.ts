import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { StudioEnv } from "@/server/env";
import { openStore } from "@/server/jobs/store";
import { subscribeJob } from "@/server/jobs/runner";
import { emptySequence, type Sequence } from "./model";
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

/**
 * Two clips: "a" 3s at 24fps (72 frames, full length),
 * "b" 2s (48 frames) trimmed 4-28 so its 12-frame head clamps to 4.
 */
function seq(): Sequence {
  return {
    ...emptySequence(),
    clips: [
      {
        id: "a",
        path: "test/a.mp4",
        name: "Orbit.mp4",
        srcFps: 24,
        width: 1920,
        height: 1080,
        durationSec: 3,
        in: 0,
        out: 48,
      },
      {
        id: "b",
        path: "test/b.mp4",
        name: "Dive.mp4",
        srcFps: 24,
        width: 1920,
        height: 1080,
        durationSec: 2,
        in: 4,
        out: 28,
      },
    ],
  };
}

function fakeSequences(sequence: Sequence): SequenceStore {
  return {
    getSequence: async () => sequence,
    updateSequence: async () => sequence,
    appendClip: async () => sequence,
    removeClip: async () => sequence,
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
        { codec: "h264" },
        { env: e, jobs, sequences: fakeSequences(emptySequence()), runFfmpeg: fakeRunFfmpeg([]) },
      ),
    ).rejects.toThrow("empty");
  });

  it("conforms media, renders the movie and writes fcpxml/edl/summary", async () => {
    const e = env();
    const jobs = openStore(path.join(e.dataDir, "phaino.db"));
    const files: string[] = [];
    const progresses: number[] = [];
    const job = await startExport(
      { codec: "h264" },
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

    // 3 ffmpeg invocations: 2 media + 1 sequence render
    expect(files).toHaveLength(3);
    expect(files[2]).toBe(path.join(dir, "phaino_sequence.mp4"));
  });
});

