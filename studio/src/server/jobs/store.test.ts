import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type { StudioEnv } from "@/server/env";
import { JobRunner } from "./runner";
import { JobStore, openStore } from "./store";

const NOW = "2026-10-19T00:00:00.000Z";

function tmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "phaino-jobs-"));
  return { dir, file: path.join(dir, "phaino.db") };
}

describe("jobs store", () => {
  it("creates, gets and updates rows", () => {
    const { file } = tmp();
    const store = openStore(file);
    const row = store.create(
      {
        id: "j1",
        presetId: "dolly-in",
        category: "camera",
        params: { prompt: "a" },
        inputs: { image: "u1.png" },
      },
      NOW,
    );
    expect(row.status).toBe("queued");
    expect(row.params.prompt).toBe("a");
    expect(row.progress).toBe(0);
    expect(store.get("missing")).toBeNull();

    const updated = store.update(
      "j1",
      { status: "running", progress: 0.5, message: "Sampling 15/30" },
      NOW,
    );
    expect(updated.status).toBe("running");
    expect(updated.progress).toBe(0.5);
    expect(store.get("j1")?.message).toBe("Sampling 15/30");
  });

  it("lists newest first and filters by category", () => {
    const { file } = tmp();
    const store = openStore(file);
    store.create({ id: "a", presetId: "dolly-in", category: "camera" }, "2026-10-19T00:00:00.000Z");
    store.create({ id: "b", presetId: "qwen-image", category: "image" }, "2026-10-19T01:00:00.000Z");
    store.create({ id: "c", presetId: "orbit", category: "camera" }, "2026-10-19T02:00:00.000Z");
    expect(store.list({ category: "camera" }).map((r) => r.id)).toEqual([
      "c",
      "a",
    ]);
    expect(store.list()).toHaveLength(3);
  });

  it("round-trips reported credits through update and reads", () => {
    const store = new JobStore(new DatabaseSync(":memory:"));
    const row = store.create({ id: "priced", presetId: "nano-banana-2", category: "image" }, NOW);
    expect(row.creditsUsed).toBeNull();
    expect(store.update(row.id, { creditsUsed: "12.5" }, NOW).creditsUsed).toBe("12.5");
    expect(store.get(row.id)?.creditsUsed).toBe("12.5");
    expect(store.list()[0].creditsUsed).toBe("12.5");
    expect(store.listActive()[0].creditsUsed).toBe("12.5");
    store.update(row.id, { creditsUsed: null }, NOW);
    expect(store.get(row.id)?.creditsUsed).toBeNull();
  });

  it("migrates credits_used on an old database and reads existing rows", () => {
    const db = new DatabaseSync(":memory:");
    try {
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
        updated_at TEXT NOT NULL,
        started_at TEXT,
        finished_at TEXT
      )`);
      db.prepare(
        `INSERT INTO jobs (id, preset_id, category, status, params, inputs, created_at, updated_at)
         VALUES ('old', 'nano-banana-2', 'image', 'succeeded', '{}', '{}', ?, ?)`,
      ).run(NOW, NOW);
      const store = new JobStore(db);
      expect(store.get("old")?.creditsUsed).toBeNull();
      store.update("old", { creditsUsed: "4.5" }, NOW);
      expect(store.get("old")?.creditsUsed).toBe("4.5");
    } finally {
      db.close();
    }
  });

  it("resume fails queued rows that never submitted", async () => {
    const { dir, file } = tmp();
    const store = openStore(file);
    store.create({ id: "q1", presetId: "dolly-in", category: "camera" }, NOW);
    const runner = new JobRunner({
      env: {} as StudioEnv,
      getClient: () => {
        throw new Error("no client in test");
      },
      getRouter: () => {
        throw new Error("no Router client in test");
      },
      adapterFor: () => null,
      targetInfo: async () => null,
      store,
      dataDir: dir,
      now: () => NOW,
    });
    await runner.resume();
    const row = store.get("q1");
    expect(row?.status).toBe("failed");
    expect(row?.error).toBe("Interrupted by restart");
  });
});

describe("routerCreditStats", () => {
  it("takes the median of successful reported prices for the preset", () => {
    const store = new JobStore(new DatabaseSync(":memory:"));
    expect(store.routerCreditStats("nano-banana-2")).toEqual({ count: 0, medianCredits: null });
    for (const [index, creditsUsed] of ["2", "10", "4.5"].entries()) {
      const id = `priced-${index}`;
      store.create({ id, presetId: "nano-banana-2", category: "image" }, NOW);
      store.update(id, { status: "succeeded", creditsUsed }, NOW);
    }
    store.create({ id: "failed", presetId: "nano-banana-2", category: "image" }, NOW);
    store.update("failed", { status: "failed", creditsUsed: "100" }, NOW);
    store.create({ id: "unreported", presetId: "nano-banana-2", category: "image" }, NOW);
    store.update("unreported", { status: "succeeded" }, NOW);
    expect(store.routerCreditStats("nano-banana-2")).toEqual({ count: 3, medianCredits: 4.5 });
    expect(store.routerCreditStats("orbit")).toEqual({ count: 0, medianCredits: null });
  });

  it("limits by newest reported successful rows before filtering invalid values", () => {
    const store = new JobStore(new DatabaseSync(":memory:"));
    for (const [index, creditsUsed] of ["100", "2", "0", "Infinity", "-1", "invalid"].entries()) {
      const id = `priced-${index}`;
      const now = new Date(Date.parse(NOW) + index * 1000).toISOString();
      store.create({ id, presetId: "nano-banana-2", category: "image" }, now);
      store.update(id, { status: "succeeded", creditsUsed }, now);
    }
    expect(store.routerCreditStats("nano-banana-2")).toEqual({ count: 2, medianCredits: 1 });
    expect(store.routerCreditStats("nano-banana-2", 3)).toEqual({ count: 0, medianCredits: null });
    expect(store.routerCreditStats("nano-banana-2", 4)).toEqual({ count: 1, medianCredits: 0 });
  });
});
