import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { StudioEnv } from "@/server/env";
import { JobRunner } from "./runner";
import { openStore } from "./store";

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
