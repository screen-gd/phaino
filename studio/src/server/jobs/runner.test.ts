import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { RunResult } from "@comfyorg/sdk";
import { describe, expect, it, vi } from "vitest";
import type { StudioEnv } from "@/server/env";
import type { RouterAdapter } from "@/server/router/adapters";
import {
  JobRunner,
  NotConnected,
  subscribeJob,
  type ComfyLike,
  type JobHandleLike,
  type OutputLike,
  type RouterHandleLike,
  type RouterLike,
  type RunnerDeps,
} from "./runner";
import { openStore, type JobRecord } from "./store";

const NOW = "2026-10-19T00:00:00.000Z";
const ROUTER_RESULT: RunResult = {
  kind: "json",
  data: { image: "router-output" },
  requestId: "router-result-1",
  servingProvider: null,
  droppedParams: null,
};

function envWith(key: string | undefined): StudioEnv {
  return {
    comfyApiKey: key,
    comfyBaseUrl: undefined,
    // The runner resolves presets from the env it was given, so point at the
    // real catalog (vitest runs with cwd = studio/).
    presetsDir: path.resolve(process.cwd(), "../presets"),
    forksDir: "",
    dataDir: "",
    user: "local",
    siteUrl: "http://localhost:3000",
    ffmpegPath: "ffmpeg",
    ffprobePath: "ffprobe",
    trackerFile: "",
  };
}

function fakeOutput(name = "ComfyUI_1_.mp4", nodeId?: string): OutputLike {
  return {
    name,
    contentType: "video/mp4",
    ...(nodeId ? { nodeId } : {}),
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

function makeDeps(
  job: JobHandleLike,
  key = "test-key",
  over: Partial<
    Pick<
      RunnerDeps,
      "env" | "getClient" | "getRouter" | "adapterFor" | "targetInfo"
    >
  > = {},
) {
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
    getRouter: () => {
      throw new Error("no Router client in workflow test");
    },
    adapterFor: () => null,
    targetInfo: async () => null,
    store,
    dataDir: dir,
    now: () => NOW,
    ...over,
  });
  return { dir, store, runner, submitCalls, setInputs, client };
}

function makeUpload(dir: string): string {
  const id = `${crypto.randomUUID()}.png`;
  fs.mkdirSync(path.join(dir, "uploads"), { recursive: true });
  fs.writeFileSync(path.join(dir, "uploads", id), "png-bytes");
  return id;
}

function fakeRouterHandle(over: Partial<RouterHandleLike> = {}): RouterHandleLike {
  return {
    requestId: "router-request-1",
    events: vi.fn(async function* () {
      yield { status: "IN_QUEUE", completed: false, queuePosition: 2 };
      yield { status: "IN_PROGRESS", completed: false, queuePosition: null };
      yield { status: "COMPLETED", completed: true, queuePosition: null };
    }),
    get: vi.fn(async () => ROUTER_RESULT),
    cancelBestEffort: vi.fn(async () => {}),
    ...over,
  };
}

function makeRouterDeps(
  handle = fakeRouterHandle(),
  over: Partial<RouterAdapter> = {},
  env = envWith("test-key"),
) {
  const router = {
    submit: vi.fn<RouterLike["submit"]>(async () => handle),
    handle: vi.fn<RouterLike["handle"]>(() => handle),
  } satisfies RouterLike;
  const adapter: RouterAdapter = {
    presetId: "dolly-in",
    model: "test/image-model",
    buildInput: vi.fn<RouterAdapter["buildInput"]>(({ params, images }) => ({
      ...params,
      ...images,
    })),
    readOutputs: vi.fn<RouterAdapter["readOutputs"]>(() => [{
      kind: "base64",
      data: Buffer.from("router-png-bytes").toString("base64"),
      mimeType: "image/png",
    }]),
    ...over,
  };
  const deps = makeDeps(fakeJob(), "test-key", {
    env,
    getClient: () => {
      throw new Error("no workflow client in Router test");
    },
    getRouter: () => router,
    adapterFor: (presetId) => presetId === adapter.presetId ? adapter : null,
  });
  return { ...deps, router, adapter, handle };
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

  it("fails a job whose graph drifts from the target", async () => {
    const { dir, store, runner, submitCalls } = makeDeps(fakeJob(), "test-key", {
      targetInfo: async () => ({
        nodes: {
          LoadImage: {},
        },
        comfyuiVersion: "0.42.1",
      }),
    });
    const row = runner.startJob({
      presetId: "dolly-in",
      params: {},
      inputs: { image: makeUpload(dir) },
    });
    await vi.waitFor(() =>
      expect(store.get(row.id)?.status).toBe("failed"),
    );
    expect(store.get(row.id)?.error).toContain("Not available on");
    expect(submitCalls).toHaveLength(0);
  });

  it("passes apiKey for partner presets, not for open", async () => {
    const { dir, store, runner, submitCalls } = makeDeps(fakeJob(), "test-key");
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

  it("saves only outputs from the preset's output nodes", async () => {
    const job = fakeJob({
      events: vi.fn(async function* () {
        // dolly-in's output node is "75"; "999" is an extra Save node.
        yield {
          kind: "outputReady",
          output: fakeOutput("segment.mp4", "999"),
        };
        yield {
          kind: "outputReady",
          output: fakeOutput("final.mp4", "75"),
        };
      }),
    });
    const { dir, store, runner } = makeDeps(job);
    const row = runner.startJob({
      presetId: "dolly-in",
      params: {},
      inputs: { image: makeUpload(dir) },
    });
    await vi.waitFor(() =>
      expect(store.get(row.id)?.status).toBe("succeeded"),
    );
    const done = store.get(row.id)!;
    expect(done.outputs).toHaveLength(1);
    expect(done.outputs[0]).toMatch(/^dolly-in\/.+\.mp4$/);
    expect(
      fs.readFileSync(path.join(dir, "outputs", done.outputs[0]), "utf8"),
    ).toBe("video-bytes");
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
      getRouter: () => {
        throw new Error("no Router client in workflow test");
      },
      adapterFor: () => null,
      targetInfo: async () => null,
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

describe("Router job runner", () => {
  it.each([
    { creditsUsed: "12.5", replayed: false, expected: "12.5" },
    { creditsUsed: "12.5", replayed: true, expected: null },
    { creditsUsed: "0", replayed: undefined, expected: "0" },
    { creditsUsed: "0.4, 0.4", replayed: false, expected: null },
    { creditsUsed: "", replayed: false, expected: null },
    { creditsUsed: null, replayed: false, expected: null },
    { creditsUsed: undefined, replayed: false, expected: null },
  ])("records creditsUsed $creditsUsed with replayed $replayed as $expected", async ({ creditsUsed, replayed, expected }) => {
    const handle = fakeRouterHandle({
      get: vi.fn(async () => ({ ...ROUTER_RESULT, creditsUsed, replayed })),
    });
    const { dir, store, runner, adapter } = makeRouterDeps(handle);
    const row = runner.startJob({
      presetId: adapter.presetId,
      params: {},
      inputs: { image: makeUpload(dir) },
    });
    await vi.waitFor(() => expect(store.get(row.id)?.status).toBe("succeeded"));
    expect(store.get(row.id)?.creditsUsed).toBe(expected);
  });

  it("submits images as data URLs, follows the queue and saves outputs", async () => {
    const { dir, store, runner, router, adapter, handle } = makeRouterDeps();
    const params = { prompt: "drift in" };
    const row = runner.startJob({
      presetId: adapter.presetId,
      params,
      inputs: { image: makeUpload(dir) },
    });
    const updates: JobRecord[] = [];
    const unsubscribe = subscribeJob(row.id, (update) => updates.push(update));
    try {
      await vi.waitFor(() => expect(store.get(row.id)?.status).toBe("succeeded"));
    } finally {
      unsubscribe();
    }
    const images = {
      image: `data:image/png;base64,${Buffer.from("png-bytes").toString("base64")}`,
    };
    expect(adapter.buildInput).toHaveBeenCalledWith({ params, images });
    expect(router.submit).toHaveBeenCalledExactlyOnceWith(
      adapter.model,
      { ...params, ...images },
      { idempotencyKey: row.id },
    );
    expect(handle.get).toHaveBeenCalledOnce();
    expect(adapter.readOutputs).toHaveBeenCalledExactlyOnceWith(ROUTER_RESULT);
    expect(updates.filter((update) => update.status === "running").map((update) => ({
      message: update.message,
      progress: update.progress,
    }))).toEqual([
      { message: "Submitting", progress: 0 },
      { message: "Submitting", progress: 0 },
      { message: "Queued (#2)", progress: 0 },
      { message: "Running", progress: 0 },
      { message: "Running", progress: 0 },
    ]);
    const done = store.get(row.id)!;
    expect(done.comfyJobId).toBe(handle.requestId);
    expect(done.progress).toBe(1);
    expect(done.message).toBe("Done");
    expect(done.outputs).toEqual([`${adapter.presetId}/${row.id}-0.png`]);
    const output = path.join(dir, "outputs", done.outputs[0]);
    expect(fs.existsSync(output)).toBe(true);
    expect(fs.readFileSync(output, "utf8")).toBe("router-png-bytes");
  });

  it("uploads inputs to Comfy storage when the adapter sets mediaAsUrl", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      calls.push({ url: u, init });
      if (u === "https://api.comfy.org/customers/storage") {
        return new Response(JSON.stringify({
          upload_url: "https://put.example/clip",
          download_url: "https://cdn.example/clip.mp4",
        }));
      }
      return new Response("ok");
    });
    try {
      const { dir, store, runner, adapter } = makeRouterDeps(
        fakeRouterHandle(),
        { mediaAsUrl: true },
      );
      const row = runner.startJob({
        presetId: adapter.presetId,
        params: {},
        inputs: { image: makeUpload(dir) },
      });
      await vi.waitFor(() => expect(store.get(row.id)?.status).toBe("succeeded"));
      expect(calls.map((c) => c.init?.method ?? "GET")).toEqual(["POST", "PUT"]);
      expect(adapter.buildInput).toHaveBeenCalledWith(
        expect.objectContaining({
          images: { image: "https://cdn.example/clip.mp4" },
        }),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("fails when the adapter returns no outputs", async () => {
    const { dir, store, runner, adapter } = makeRouterDeps(fakeRouterHandle(), {
      readOutputs: () => [],
    });
    const row = runner.startJob({
      presetId: adapter.presetId,
      params: {},
      inputs: { image: makeUpload(dir) },
    });
    await vi.waitFor(() => expect(store.get(row.id)?.status).toBe("failed"));
    expect(store.get(row.id)?.error).toBe("Router returned no outputs");
    expect(store.get(row.id)?.outputs).toEqual([]);
  });

  it("fails when get() rejects", async () => {
    const handle = fakeRouterHandle({
      get: vi.fn(async () => {
        throw new Error("Router execution exploded");
      }),
    });
    const { dir, store, runner, adapter } = makeRouterDeps(handle);
    const row = runner.startJob({
      presetId: adapter.presetId,
      params: {},
      inputs: { image: makeUpload(dir) },
    });
    await vi.waitFor(() => expect(store.get(row.id)?.status).toBe("failed"));
    expect(store.get(row.id)?.error).toBe("Router execution exploded");
    expect(adapter.readOutputs).not.toHaveBeenCalled();
  });

  it.each([undefined, "http://localhost:8188"])(
    "requires an API key even with base URL %s",
    (comfyBaseUrl) => {
      const { dir, store, runner, router, adapter } = makeRouterDeps(
        fakeRouterHandle(),
        {},
        { ...envWith(undefined), comfyBaseUrl },
      );
      expect(() => runner.startJob({
        presetId: adapter.presetId,
        params: {},
        inputs: { image: makeUpload(dir) },
      })).toThrow(NotConnected);
      expect(store.list()).toHaveLength(0);
      expect(router.submit).not.toHaveBeenCalled();
    },
  );

  it("cancels a running request through a rebuilt handle", async () => {
    let finishEvents: () => void = () => {};
    const waiting = new Promise<void>((resolve) => { finishEvents = resolve; });
    const eventsFinished = vi.fn();
    const handle = fakeRouterHandle({
      events: vi.fn(async function* () {
        try {
          yield { status: "IN_PROGRESS", completed: false, queuePosition: null };
          await waiting;
          yield { status: "COMPLETED", completed: true, queuePosition: null };
        } finally {
          eventsFinished();
        }
      }),
    });
    const { dir, store, runner, router, adapter } = makeRouterDeps(handle);
    const row = runner.startJob({
      presetId: adapter.presetId,
      params: {},
      inputs: { image: makeUpload(dir) },
    });
    try {
      await vi.waitFor(() => expect(store.get(row.id)?.message).toBe("Running"));
      const updated = await runner.cancelJob(row.id);
      expect(router.handle).toHaveBeenCalledExactlyOnceWith(adapter.model, handle.requestId);
      expect(handle.cancelBestEffort).toHaveBeenCalledOnce();
      expect(updated?.status).toBe("cancelled");
    } finally {
      finishEvents();
    }
    await vi.waitFor(() => expect(eventsFinished).toHaveBeenCalledOnce());
    expect(store.get(row.id)?.status).toBe("cancelled");
    expect(store.get(row.id)?.outputs).toEqual([]);
    expect(handle.get).not.toHaveBeenCalled();
  });

  it("resumes a running Router request and saves its outputs", async () => {
    const { dir, store, runner, router, adapter, handle } = makeRouterDeps();
    const row = store.create({
      id: "router-resume-1",
      presetId: adapter.presetId,
      category: "camera",
    }, NOW);
    store.update(row.id, { status: "running", comfyJobId: handle.requestId }, NOW);
    await runner.resume();
    await vi.waitFor(() => expect(store.get(row.id)?.status).toBe("succeeded"));
    expect(router.handle).toHaveBeenCalledExactlyOnceWith(adapter.model, handle.requestId);
    expect(router.submit).not.toHaveBeenCalled();
    const done = store.get(row.id)!;
    expect(done.progress).toBe(1);
    expect(done.message).toBe("Done");
    expect(done.outputs).toEqual([`${adapter.presetId}/${row.id}-0.png`]);
    expect(fs.existsSync(path.join(dir, "outputs", done.outputs[0]))).toBe(true);
  });
});

