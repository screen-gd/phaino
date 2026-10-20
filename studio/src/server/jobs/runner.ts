import "server-only";

import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { comfyTarget, getComfy } from "@/server/comfy/client";
import type { StudioEnv } from "@/server/env";
import { getEnv } from "@/server/env";
import { PresetBindError, applyPreset, type WorkflowApi } from "@/server/presets/bind";
import { getPreset } from "@/server/presets/load";
import { applyDerived, prepareEditJob } from "@/server/edits/prepare";
import { resolveUpload } from "@/server/uploads";
import { getStore, type JobRecord, type JobStore } from "./store";

/** A run submitted without a reachable Comfy deployment. */
export class NotConnected extends Error {
  readonly status = 409;
  constructor() {
    super("Comfy Cloud is not connected. Add your API key in Settings.");
    this.name = "NotConnected";
  }
}

/** Bad preset id, params or inputs — maps to 400. */
export class JobInputError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "JobInputError";
  }
}

/** Narrow SDK surfaces so tests can inject a fake client. */
export interface OutputLike {
  name: string;
  contentType: string;
  toFile(path: string): Promise<unknown>;
}
export interface JobHandleLike {
  id: string;
  events(signal?: AbortSignal): AsyncGenerator<unknown, void, void>;
  result(signal?: AbortSignal): Promise<JobHandleLike>;
  cancel(signal?: AbortSignal): Promise<unknown>;
  getOutputs(nodeId: string): OutputLike[];
}
export interface WorkflowLike {
  setInput(nodeId: string, field: string, value: unknown): void;
}
export interface ComfyLike {
  workflows: { fromJson(graph: unknown): WorkflowLike };
  assets: { fromFile(path: string): unknown };
  submit(
    wf: WorkflowLike,
    opts: { idempotencyKey: string; apiKey?: string },
  ): Promise<JobHandleLike>;
  jobs: { get(id: string): Promise<JobHandleLike> };
}

export type RunnerDeps = {
  env: StudioEnv;
  getClient: () => ComfyLike;
  store: JobStore;
  dataDir: string;
  now: () => string;
};

const MAX_RUNNING = 2;
const TERMINAL: JobRecord["status"][] = ["succeeded", "failed", "cancelled"];

const g = globalThis as {
  __phainoJobEmitters?: Map<string, EventEmitter>;
  __phainoJobsResumed?: boolean;
};

function emitters(): Map<string, EventEmitter> {
  return (g.__phainoJobEmitters ??= new Map());
}

export function emitJob(row: JobRecord) {
  emitters().get(row.id)?.emit("update", row);
}

export function subscribeJob(id: string, cb: (row: JobRecord) => void) {
  const map = emitters();
  let em = map.get(id);
  if (!em) {
    em = new EventEmitter();
    em.setMaxListeners(50);
    map.set(id, em);
  }
  em.on("update", cb);
  return () => em.off("update", cb);
}

function extFor(output: OutputLike): string {
  const fromName = path.extname(output.name ?? "").toLowerCase();
  if (fromName) return fromName;
  const mime = (output.contentType ?? "").toLowerCase();
  if (mime === "image/png") return ".png";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/webp") return ".webp";
  if (mime === "video/mp4") return ".mp4";
  if (mime === "video/quicktime") return ".mov";
  return ".bin";
}

export class JobRunner {
  private running = 0;
  private pending: string[] = [];

  constructor(private readonly deps: RunnerDeps) {}

  /** Rows that outlived a restart: re-attach to the remote job, or fail. */
  async resume(): Promise<void> {
    for (const row of this.deps.store.listActive()) {
      if (row.status === "running" && row.comfyJobId) {
        const watch = async () => {
          try {
            const remote = await this.deps.getClient().jobs.get(row.comfyJobId!);
            this.acquire();
            try {
              await this.watch(row, remote);
            } finally {
              this.release();
            }
          } catch (err) {
            this.fail(row.id, err);
          }
        };
        void watch();
      } else {
        this.finish(row.id, {
          status: "failed",
          error: "Interrupted by restart",
        });
      }
    }
  }

  startJob(input: {
    presetId: string;
    params: Record<string, string | number | boolean>;
    inputs: Record<string, string>;
    /** Overrides preset.category (the extend tool files jobs under "edit"). */
    category?: string;
  }): JobRecord {
    if (!comfyTarget(this.deps.env).configured) throw new NotConnected();

    const loaded = getPreset(input.presetId, this.deps.env);
    if (!loaded) throw new JobInputError(`Unknown preset "${input.presetId}"`);
    const { preset } = loaded;

    const values: Record<string, string> = {};
    for (const spec of preset.inputs) {
      const uploadId = input.inputs[spec.key];
      if (uploadId === undefined || uploadId === "") {
        if (spec.required) {
          throw new JobInputError(`Missing required input "${spec.label}"`);
        }
        continue;
      }
      try {
        if (!existsSync(resolveUpload(this.deps.dataDir, uploadId).absPath)) {
          throw new Error("missing");
        }
      } catch {
        throw new JobInputError(`Unknown upload for "${spec.label}"`);
      }
      values[spec.key] = uploadId;
    }
    for (const key of Object.keys(input.inputs)) {
      if (!preset.inputs.some((i) => i.key === key)) {
        throw new JobInputError(`Unknown input "${key}"`);
      }
    }

    try {
      applyPreset(
        loaded.workflowApi as WorkflowApi,
        preset,
        { inputs: values, params: input.params },
        { seed: this.freshSeed() },
      );
    } catch (err) {
      if (err instanceof PresetBindError) throw new JobInputError(err.message);
      throw err;
    }

    const row = this.deps.store.create(
      {
        id: crypto.randomUUID(),
        presetId: preset.id,
        category: input.category ?? preset.category,
        params: input.params,
        inputs: values,
      },
      this.deps.now(),
    );
    emitJob(row);
    this.schedule(row.id);
    return row;
  }

  async cancelJob(id: string): Promise<JobRecord | null> {
    const row = this.deps.store.get(id);
    if (!row || TERMINAL.includes(row.status)) return row;
    this.pending = this.pending.filter((p) => p !== id);
    const updated = this.finish(id, { status: "cancelled" });
    if (row.comfyJobId) {
      try {
        const remote = await this.deps.getClient().jobs.get(row.comfyJobId);
        await remote.cancel();
      } catch {
        // best effort: the local row is already cancelled
      }
    }
    return updated;
  }

  private schedule(jobId: string) {
    if (this.running >= MAX_RUNNING) {
      this.pending.push(jobId);
      return;
    }
    this.acquire();
    void this.run(jobId).finally(() => {
      this.release();
      const next = this.pending.shift();
      if (next) this.schedule(next);
    });
  }

  private acquire() {
    this.running += 1;
  }

  private release() {
    this.running = Math.max(0, this.running - 1);
  }

  private freshSeed() {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  }

  private update(id: string, patch: Parameters<JobStore["update"]>[1]) {
    const row = this.deps.store.update(id, patch, this.deps.now());
    emitJob(row);
    return row;
  }

  private finish(id: string, patch: Parameters<JobStore["update"]>[1]) {
    return this.update(id, { progress: 0, ...patch });
  }

  private fail(id: string, err: unknown) {
    const message =
      err instanceof Error ? shortMessage(err) : "Generation failed";
    this.update(id, { status: "failed", error: message, progress: 0 });
  }

  private async run(jobId: string) {
    const row = this.deps.store.get(jobId);
    if (!row || row.status !== "queued") return;
    try {
      const loaded = getPreset(row.presetId, this.deps.env);
      if (!loaded) throw new JobInputError(`Unknown preset "${row.presetId}"`);
      const { preset } = loaded;
      const client = this.deps.getClient();

      // Edit tools: probe the source video, trim to maxSeconds and derive
      // bind values (frame counts, reframe pads) from the probe.
      const edit =
        row.presetId.startsWith("edit-")
          ? await prepareEditJob(
              row.presetId,
              row.inputs,
              row.params,
              this.deps.env,
            )
          : null;
      const inputs = edit?.inputs ?? row.inputs;

      const bound = applyPreset(
        loaded.workflowApi as WorkflowApi,
        preset,
        { inputs, params: row.params },
        { seed: this.freshSeed() },
      );
      if (edit) applyDerived(bound, edit.derived);
      const wf = client.workflows.fromJson(bound);
      for (const spec of preset.inputs) {
        const uploadId = inputs[spec.key];
        if (uploadId === undefined) continue;
        const up = resolveUpload(this.deps.dataDir, uploadId);
        wf.setInput(spec.bind.node, spec.bind.field, client.assets.fromFile(up.absPath));
      }

      this.update(jobId, { status: "running", message: "Submitting" });
      const remote = await client.submit(wf, {
        idempotencyKey: row.id,
        ...(preset.model.license === "partner" && comfyTarget(this.deps.env).apiKey
          ? { apiKey: comfyTarget(this.deps.env).apiKey }
          : {}),
      });
      this.update(jobId, { comfyJobId: remote.id });
      await this.watch(row, remote);
    } catch (err) {
      this.fail(jobId, err);
    }
  }

  /** Follow a live remote job: events, outputs, then the terminal result. */
  private async watch(row: JobRecord, remote: JobHandleLike) {
    const dir = path.join(this.deps.dataDir, "outputs", row.presetId);
    const savedNames = new Set<string>();
    let index = 0;
    const save = async (output: OutputLike) => {
      const rel = `${row.presetId}/${row.id}-${index++}${extFor(output)}`;
      await mkdir(dir, { recursive: true });
      await output.toFile(
        path.join(this.deps.dataDir, "outputs", rel),
      );
      savedNames.add(output.name);
      const current = this.deps.store.get(row.id);
      this.update(row.id, { outputs: [...(current?.outputs ?? []), rel] });
    };

    for await (const event of remote.events()) {
      if (this.isCancelled(row.id)) return;
      const ev = event as {
        kind?: string;
        value?: number;
        message?: string | null;
        step?: number | null;
        steps?: number | null;
        currentNodeClass?: string | null;
        status?: string;
        queuePosition?: number | null;
        output?: OutputLike;
      };
      if (ev.kind === "progress") {
        const msg =
          ev.step != null && ev.steps != null
            ? `Sampling ${ev.step}/${ev.steps}`
            : (ev.currentNodeClass ?? ev.message ?? "Running");
        this.update(row.id, {
          progress: typeof ev.value === "number" ? ev.value : 0,
          message: msg,
        });
      } else if (ev.kind === "statusChange") {
        this.update(row.id, {
          message:
            ev.status === "queued" && ev.queuePosition != null
              ? `Queued (#${ev.queuePosition})`
              : (ev.status ?? "Running"),
        });
      } else if (ev.kind === "outputReady" && ev.output) {
        await save(ev.output);
      }
    }

    // result() is the authoritative terminal state.
    await remote.result();
    if (this.isCancelled(row.id)) return;
    const preset = getPreset(row.presetId, this.deps.env)?.preset;
    for (const spec of preset?.outputs ?? []) {
      for (const output of remote.getOutputs(spec.node)) {
        if (savedNames.has(output.name)) continue;
        await save(output);
      }
    }
    this.update(row.id, { status: "succeeded", progress: 1, message: "Done" });
  }

  private isCancelled(id: string): boolean {
    return this.deps.store.get(id)?.status === "cancelled";
  }
}

function shortMessage(err: Error): string {
  const msg = err.message || "Generation failed";
  return msg.length > 240 ? `${msg.slice(0, 237)}...` : msg;
}

const rg = globalThis as { __phainoJobRunner?: JobRunner };

/** Shared runner for the process; resumes interrupted jobs once. */
export function getRunner(): JobRunner {
  if (!rg.__phainoJobRunner) {
    const env = getEnv();
    rg.__phainoJobRunner = new JobRunner({
      env,
      // lazy: getComfy() throws ComfyNotConfigured when unconfigured;
      // startJob already rejects unconfigured runs via NotConnected.
      getClient: () => getComfy() as unknown as ComfyLike,
      store: getStore(),
      dataDir: env.dataDir,
      now: () => new Date().toISOString(),
    });
    if (!g.__phainoJobsResumed) {
      g.__phainoJobsResumed = true;
      void rg.__phainoJobRunner.resume();
    }
  }
  return rg.__phainoJobRunner;
}


