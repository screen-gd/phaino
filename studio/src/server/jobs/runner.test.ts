import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { StudioEnv } from "@/server/env";
import {
  JobRunner,
  NotConnected,
  type ComfyLike,
  type JobHandleLike,
  type OutputLike,
} from "./runner";
import { openStore } from "./store";

const NOW = "2026-10-19T00:00:00.000Z";

function envWith(key?: string): StudioEnv {
  return {
    comfyApiKey: key,
    comfyBaseUrl: undefined,
    presetsDir: "",
    forksDir: "",
    dataDir: "",
    user: "local",
    siteUrl: "http://localhost:3000",
    trackerFile: "",
  };
}

function fakeOutput(name = "ComfyUI_1_.mp4"): OutputLike {
  return {
    name,
    contentType: "video/mp4",
    toFile: vi.fn(async (p: string) => {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, "video-bytes");
      return p;
    }),
  };
}

function fakeJob(over: Partial<JobHandleLike> = {}): JobHandleLike {
  const job: JobHandleLike = {
    id: "comfy-job-1",
    cancel: vi.fn(async () => job),
    result: vi.fn(async () => job),
    getOutputs: vi.fn(() => []),
    events: vi.fn(async function* () {
      yield { kind: "statusChange", status: "running", queuePosition: null };
      yield { kind: "progress", value: 0.5, step: 15, steps: 30 };
      yield { kind: "outputReady", output: fakeOutput() };
    }),
    ...over,
  };
  return job;
}

type SubmitOpts = { idempotencyKey: string; apiKey?: string };

function makeDeps(job: JobHandleLike, key = "test-key") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "phaino-run-"));
  const store = openStore(path.join(dir, "phaino.db"));
  const submitCalls: SubmitOpts[] = [];
  const setInputs: Array<[string, string]> = [];
  const client: ComfyLike = {
    workflows: {
      fromJson: () => ({
        setInput: (node: string, field: string) => {
          setInputs.push([node, field]);
        },
      }),
    },
    assets: { fromFile: (p: string) => ({ assetPath: p }) },
    submit: async (_wf, opts) => {
      submitCalls.push(opts);
      return job;
    },
    jobs: { get: async () => job },
  };
  const runner = new JobRunner({
    env: envWith(key),
    getClient: () => client,
    store,
    dataDir: dir,
    now: () => NOW,
  });
  return { dir, store, runner, submitCalls, setInputs, client };
}

function makeUpload(dir: string): string {
  const id = `${crypto.randomUUID()}.png`;
  fs.mkdirSync(path.join(dir, "uploads"), { recursive: true });
  fs.writeFileSync(path.join(dir, "uploads", id), "png-bytes");
  return id;
}

describe("job runner", () => {
  it("runs a job to succeeded, saving outputs", async () => {
    const { dir, store, runner } = makeDeps(fakeJob());
    const uploadId = makeUpload(dir);
    const row = runner.startJob({
      presetId: "dolly-in",
      params: { prompt: "drift in" },
      inputs: { image: uploadId },
    });
    expect(row.status).toBe("queued");
    await vi.waitFor(() =>
      expect(store.get(row.id)?.status).toBe("succeeded"),
    );
    const done = store.get(row.id)!;
    expect(done.progress).toBe(1);
    expect(done.comfyJobId).toBe("comfy-job-1");
    expect(done.outputs).toHaveLength(1);
    const out = path.join(dir, "outputs", done.outputs[0]);
    expect(fs.existsSync(out)).toBe(true);
    expect(done.outputs[0]).toMatch(/^dolly-in\/.+\.mp4$/);
  });

  it("passes apiKey for partner presets, not for open", async () => {
    const { dir, store, runner, submitCalls } = makeDeps(fakeJob());
    const open = runner.startJob({
      presetId: "dolly-in",
      params: {},
      inputs: { image: makeUpload(dir) },
    });
    const partner = runner.startJob({
      presetId: "kling3-video",
      params: {},
      inputs: { image: makeUpload(dir) },
    });
    await vi.waitFor(() => {
      expect(store.get(open.id)?.status).toBe("succeeded");
      expect(store.get(partner.id)?.status).toBe("succeeded");
    });
    expect(submitCalls[0].idempotencyKey).toBe(open.id);
    expect(submitCalls[0].apiKey).toBeUndefined();
    expect(submitCalls[1].apiKey).toBe("test-key");
  });

  it("marks the job failed when result() rejects", async () => {
    const job = fakeJob({
      result: vi.fn(async () => {
        throw new Error("execution exploded");
      }),
    });
    const { dir, store, runner } = makeDeps(job);
    const row = runner.startJob({
      presetId: "dolly-in",
      params: {},
      inputs: { image: makeUpload(dir) },
    });
    await vi.waitFor(() => expect(store.get(row.id)?.status).toBe("failed"));
    expect(store.get(row.id)?.error).toBe("execution exploded");
  });

  it("throws NotConnected and creates no row when unconfigured", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "phaino-run-"));
    const store = openStore(path.join(dir, "phaino.db"));
    const runner = new JobRunner({
      env: envWith(undefined),
      getClient: () => {
        throw new Error("no client");
      },
      store,
      dataDir: dir,
      now: () => NOW,
    });
    expect(() =>
      runner.startJob({ presetId: "dolly-in", params: {}, inputs: {} }),
    ).toThrow(NotConnected);
    expect(store.list()).toHaveLength(0);
  });

  it("cancel calls job.cancel and marks the row cancelled", async () => {
    const job = fakeJob({
      events: vi.fn(async function* () {
        yield { kind: "progress", value: 0.1 };
        await new Promise(() => {}); // stays running
      }),
    });
    const { dir, store, runner } = makeDeps(job);
    const row = runner.startJob({
      presetId: "dolly-in",
      params: {},
      inputs: { image: makeUpload(dir) },
    });
    await vi.waitFor(() =>
      expect(store.get(row.id)?.comfyJobId).toBe("comfy-job-1"),
    );
    const updated = await runner.cancelJob(row.id);
    expect(job.cancel).toHaveBeenCalled();
    expect(updated?.status).toBe("cancelled");
    expect(store.get(row.id)?.status).toBe("cancelled");
  });
});
