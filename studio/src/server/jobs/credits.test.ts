import { mkdtempSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  estimateTitle,
  formatEstimate,
  GPU_CREDITS_PER_SECOND,
} from "@/lib/credits";
import { JobStore } from "./store";
import * as stores from "./store";
import { presetEstimates } from "./credits";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function memStore(): JobStore {
  return new JobStore(new DatabaseSync(":memory:"));
}

/** Create a job, run it from start to end, and mark it succeeded. */
function finishJob(store: JobStore, id: string, presetId: string, start: string, end: string) {
  store.create({ id, presetId, category: "video" }, start);
  store.update(id, { status: "running" }, start);
  store.update(id, { status: "succeeded", outputs: ["a.mp4"] }, end);
}

describe("started_at", () => {
  it("is set the first time a job enters running", () => {
    const store = memStore();
    store.create({ id: "j1", presetId: "orbit", category: "camera" }, "2026-01-01T00:00:00.000Z");
    expect(store.get("j1")!.startedAt).toBeNull();
    store.update("j1", { status: "running" }, "2026-01-01T00:00:10.000Z");
    expect(store.get("j1")!.startedAt).toBe("2026-01-01T00:00:10.000Z");
    // later updates keep the first timestamp
    store.update("j1", { status: "succeeded" }, "2026-01-01T00:01:00.000Z");
    expect(store.get("j1")!.startedAt).toBe("2026-01-01T00:00:10.000Z");
  });
});

describe("finished_at", () => {
  it("is set when a job reaches a terminal state", () => {
    const store = memStore();
    store.create({ id: "j3", presetId: "orbit", category: "camera" }, "2026-01-01T00:00:00.000Z");
    store.update("j3", { status: "running" }, "2026-01-01T00:00:05.000Z");
    expect(store.get("j3")!.finishedAt).toBeNull();
    store.update("j3", { status: "succeeded" }, "2026-01-01T00:01:00.000Z");
    expect(store.get("j3")!.finishedAt).toBe("2026-01-01T00:01:00.000Z");
  });
});

describe("runtimeStats", () => {
  it("returns a null median with no completed runs", () => {
    const store = memStore();
    expect(store.runtimeStats("orbit")).toEqual({ kind: "gpu", count: 0, medianSeconds: null });
    // a failed run does not count
    store.create({ id: "j2", presetId: "orbit", category: "camera" }, "2026-01-01T00:00:00.000Z");
    store.update("j2", { status: "running" }, "2026-01-01T00:00:05.000Z");
    store.update("j2", { status: "failed" }, "2026-01-01T00:00:30.000Z");
    expect(store.runtimeStats("orbit")).toEqual({ kind: "gpu", count: 0, medianSeconds: null });
  });

  it("takes the median duration over recent runs", () => {
    const store = memStore();
    // durations: 30s, 60s, 120s -> median 60s
    finishJob(store, "a", "orbit", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:30.000Z");
    finishJob(store, "b", "orbit", "2026-01-01T00:01:00.000Z", "2026-01-01T00:02:00.000Z");
    finishJob(store, "c", "orbit", "2026-01-01T00:02:00.000Z", "2026-01-01T00:04:00.000Z");
    expect(store.runtimeStats("orbit")).toEqual({ kind: "gpu", count: 3, medianSeconds: 60 });
  });

  it("scopes the stats to the preset", () => {
    const store = memStore();
    finishJob(store, "a", "orbit", "2026-01-01T00:00:00.000Z", "2026-01-01T00:01:00.000Z");
    expect(store.runtimeStats("whip-pan")).toEqual({ kind: "gpu", count: 0, medianSeconds: null });
  });
});

describe("formatEstimate", () => {
  it("shows the rate with no runs and the estimate with runs", () => {
    expect(formatEstimate(undefined)).toBe("0.27 credits/s");
    expect(formatEstimate({ kind: "gpu", count: 0, medianSeconds: null })).toBe("0.27 credits/s");
    expect(formatEstimate({ kind: "gpu", count: 3, medianSeconds: 60 })).toBe(
      `≈ ${Math.round(60 * GPU_CREDITS_PER_SECOND)} credits`,
    );
    expect(estimateTitle({ kind: "gpu", count: 3, medianSeconds: 60 })).toContain("3 runs");
  });

  it("shows Router prices without converting them from GPU seconds", () => {
    expect(formatEstimate({ kind: "router", count: 0, medianCredits: null })).toBe("Priced per run");
    expect(formatEstimate({ kind: "router", count: 3, medianCredits: 4.5 })).toBe("≈ 5 credits");
    expect(formatEstimate({ kind: "router", count: 1, medianCredits: 0 })).toBe("≈ 0 credits");
  });
});

describe("estimateTitle", () => {
  it("describes Router history with singular and plural run counts", () => {
    expect(estimateTitle({ kind: "router", count: 0, medianCredits: null })).toBe("Router reports the price after each run");
    expect(estimateTitle({ kind: "router", count: 1, medianCredits: 4.5 })).toBe("Router price of your last 1 run");
    expect(estimateTitle({ kind: "router", count: 3, medianCredits: 4.5 })).toBe("Router price of your last 3 runs");
  });

  it("keeps GPU and missing-history titles unchanged", () => {
    expect(estimateTitle(undefined)).toBe(`Median GPU time of your last 0 runs at ${GPU_CREDITS_PER_SECOND} credits/s`);
    expect(estimateTitle({ kind: "gpu", count: 1, medianSeconds: 60 })).toBe(`Median GPU time of your last 1 run at ${GPU_CREDITS_PER_SECOND} credits/s`);
  });
});

describe("presetEstimates", () => {
  it("uses reported credits for Router adapters and GPU time for open presets", () => {
    vi.stubEnv("PHAINO_DEMO", "off");
    const store = memStore();
    vi.spyOn(stores, "getStore").mockReturnValue(store);
    finishJob(store, "gpu", "orbit", "2026-01-01T00:00:00.000Z", "2026-01-01T00:01:00.000Z");
    finishJob(store, "router", "nano-banana-2", "2026-01-01T00:00:00.000Z", "2026-01-01T00:01:00.000Z");
    store.update("router", { creditsUsed: "4.5" }, "2026-01-01T00:01:00.000Z");
    expect(presetEstimates(["orbit", "nano-banana-2", "seedance25-i2v", "kling3-video"])).toEqual({
      orbit: { kind: "gpu", count: 1, medianSeconds: 60 },
      "nano-banana-2": { kind: "router", count: 1, medianCredits: 4.5 },
      "seedance25-i2v": { kind: "router", count: 0, medianCredits: null },
      "kling3-video": { kind: "router", count: 0, medianCredits: null },
    });
  });
});

describe("migration", () => {
  it("adds started_at and finished_at to an old-schema database", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "phaino-jobs-"));
    const file = path.join(dir, "old.db");
    try {
      const db = new DatabaseSync(file);
      db.exec(`CREATE TABLE jobs (
        id TEXT PRIMARY KEY,
        preset_id TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL,
        params TEXT NOT NULL,
        inputs TEXT NOT NULL,
        comfy_job_id TEXT,
        progress REAL NOT NULL DEFAULT 0,
        message TEXT,
        error TEXT,
        outputs TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`);
      db.prepare(
        `INSERT INTO jobs (id, preset_id, category, status, params, inputs, created_at, updated_at)
         VALUES ('old1', 'orbit', 'camera', 'succeeded', '{}', '{}', 't0', 't1')`,
      ).run();
      db.close();

      const migratedDb = new DatabaseSync(file);
      const migrated = new JobStore(migratedDb);
      const row = migrated.get("old1");
      expect(row?.startedAt).toBeNull();
      expect(row?.finishedAt).toBeNull();
      const cols = migratedDb.prepare("SELECT name FROM pragma_table_info('jobs')").all();
      expect(cols.map((c) => (c as { name: string }).name)).toEqual(
        expect.arrayContaining(["started_at", "finished_at"]),
      );
      migratedDb.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
