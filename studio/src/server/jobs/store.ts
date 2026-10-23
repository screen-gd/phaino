import "server-only";

import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { z } from "zod";
import { getEnv } from "@/server/env";

export const jobStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

const rowSchema = z.object({
  id: z.string(),
  preset_id: z.string(),
  category: z.string(),
  status: jobStatusSchema,
  params: z.string(),
  inputs: z.string(),
  comfy_job_id: z.string().nullable(),
  progress: z.number(),
  message: z.string().nullable(),
  error: z.string().nullable(),
  outputs: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  started_at: z.string().nullable(),
  finished_at: z.string().nullable(),
  credits_used: z.string().nullable(),
});

/** One job row, with JSON columns parsed. */
export type JobRecord = {
  id: string;
  presetId: string;
  category: string;
  status: JobStatus;
  params: Record<string, string | number | boolean>;
  inputs: Record<string, string>;
  comfyJobId: string | null;
  progress: number;
  message: string | null;
  error: string | null;
  outputs: string[];
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  creditsUsed: string | null;
};

export type JobPatch = Partial<
  Pick<
    JobRecord,
    "status" | "comfyJobId" | "progress" | "message" | "error" | "outputs" | "creditsUsed"
  >
>;

const CREATE_SQL = `CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  preset_id TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  params TEXT NOT NULL,
  inputs TEXT NOT NULL,
  comfy_job_id TEXT,
  credits_used TEXT,
  progress REAL NOT NULL DEFAULT 0,
  message TEXT,
  error TEXT,
  outputs TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`;

function toRecord(row: z.infer<typeof rowSchema>): JobRecord {
  return {
    id: row.id,
    presetId: row.preset_id,
    category: row.category,
    status: row.status,
    params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).parse(JSON.parse(row.params)),
    inputs: z.record(z.string(), z.string()).parse(JSON.parse(row.inputs)),
    comfyJobId: row.comfy_job_id,
    progress: row.progress,
    message: row.message,
    error: row.error,
    outputs: z.array(z.string()).parse(JSON.parse(row.outputs)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at ?? null,
    finishedAt: row.finished_at ?? null,
    creditsUsed: row.credits_used,
  };
}

/** SQLite-backed jobs store, single local process. */
export class JobStore {
  constructor(private readonly db: DatabaseSync) {
    db.exec(CREATE_SQL);
    const cols = db
      .prepare("SELECT name FROM pragma_table_info('jobs')")
      .all()
      .map((r) => z.object({ name: z.string() }).parse(r).name);
    if (!cols.includes("started_at")) {
      db.exec("ALTER TABLE jobs ADD COLUMN started_at TEXT");
    }
    if (!cols.includes("finished_at")) {
      db.exec("ALTER TABLE jobs ADD COLUMN finished_at TEXT");
    }
    if (!cols.includes("credits_used")) {
      db.exec("ALTER TABLE jobs ADD COLUMN credits_used TEXT");
    }
  }

  create(
    job: Pick<JobRecord, "id" | "presetId" | "category"> & {
      params?: JobRecord["params"];
      inputs?: JobRecord["inputs"];
    },
    now: string,
  ): JobRecord {
    this.db
      .prepare(
        `INSERT INTO jobs (id, preset_id, category, status, params, inputs, created_at, updated_at)
         VALUES (?, ?, ?, 'queued', ?, ?, ?, ?)`,
      )
      .run(
        job.id,
        job.presetId,
        job.category,
        JSON.stringify(job.params ?? {}),
        JSON.stringify(job.inputs ?? {}),
        now,
        now,
      );
    return this.get(job.id)!;
  }

  get(id: string): JobRecord | null {
    const row = this.db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
    return row ? toRecord(rowSchema.parse(row)) : null;
  }

  /** Median GPU seconds over the newest completed jobs of a preset. */
  runtimeStats(
    presetId: string,
    limit = 5,
  ): { kind: "gpu"; count: number; medianSeconds: number | null } {
    const rows = this.db
      .prepare(
        `SELECT started_at, finished_at FROM jobs
         WHERE preset_id = ? AND status = 'succeeded'
           AND started_at IS NOT NULL AND finished_at IS NOT NULL
         ORDER BY created_at DESC LIMIT ?`,
      )
      .all(presetId, limit) as { started_at: string; finished_at: string }[];
    if (rows.length === 0) return { kind: "gpu", count: 0, medianSeconds: null };
    const durations = rows
      .map((r) => (Date.parse(r.finished_at) - Date.parse(r.started_at)) / 1000)
      .filter((d) => Number.isFinite(d) && d >= 0)
      .sort((a, b) => a - b);
    if (durations.length === 0) return { kind: "gpu", count: rows.length, medianSeconds: null };
    const mid = Math.floor(durations.length / 2);
    const median =
      durations.length % 2 === 1
        ? durations[mid]
        : (durations[mid - 1] + durations[mid]) / 2;
    return { kind: "gpu", count: durations.length, medianSeconds: median };
  }

  /** Median reported Router credits over the newest successful runs. */
  routerCreditStats(
    presetId: string,
    limit = 5,
  ): { count: number; medianCredits: number | null } {
    const rows = this.db
      .prepare(
        `SELECT credits_used FROM jobs
         WHERE preset_id = ? AND status = 'succeeded' AND credits_used IS NOT NULL
         ORDER BY created_at DESC LIMIT ?`,
      )
      .all(presetId, limit);
    const credits = rows
      .map((row) => Number(rowSchema.pick({ credits_used: true }).parse(row).credits_used))
      .filter((value) => Number.isFinite(value) && value >= 0)
      .sort((a, b) => a - b);
    if (credits.length === 0) return { count: 0, medianCredits: null };
    const mid = Math.floor(credits.length / 2);
    const median =
      credits.length % 2 === 1
        ? credits[mid]
        : (credits[mid - 1] + credits[mid]) / 2;
    return { count: credits.length, medianCredits: median };
  }

  /** Non-terminal rows, for resume after a restart. */
  listActive(): JobRecord[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM jobs WHERE status IN ('queued','running') ORDER BY created_at ASC",
      )
      .all();
    return rows.map((r) => toRecord(rowSchema.parse(r)));
  }

  list(filter: { category?: string; limit?: number } = {}): JobRecord[] {
    const limit = filter.limit ?? 50;
    const rows = filter.category
      ? this.db
          .prepare(
            "SELECT * FROM jobs WHERE category = ? ORDER BY created_at DESC LIMIT ?",
          )
          .all(filter.category, limit)
      : this.db
          .prepare("SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?")
          .all(limit);
    return rows.map((r) => toRecord(rowSchema.parse(r)));
  }

  update(id: string, patch: JobPatch, now: string): JobRecord {
    const sets: string[] = ["updated_at = ?"];
    const vals: (string | number | null)[] = [now];
    if (patch.status !== undefined) { sets.push("status = ?"); vals.push(patch.status); }
    if (patch.comfyJobId !== undefined) { sets.push("comfy_job_id = ?"); vals.push(patch.comfyJobId); }
    if (patch.creditsUsed !== undefined) { sets.push("credits_used = ?"); vals.push(patch.creditsUsed); }
    if (patch.progress !== undefined) { sets.push("progress = ?"); vals.push(patch.progress); }
    if (patch.message !== undefined) { sets.push("message = ?"); vals.push(patch.message); }
    if (patch.error !== undefined) { sets.push("error = ?"); vals.push(patch.error); }
    if (patch.outputs !== undefined) { sets.push("outputs = ?"); vals.push(JSON.stringify(patch.outputs)); }
    if (patch.status === "running") { sets.push("started_at = COALESCE(started_at, ?)"); vals.push(now); }
    if (patch.status === "succeeded" || patch.status === "failed" || patch.status === "cancelled") {
      sets.push("finished_at = COALESCE(finished_at, ?)");
      vals.push(now);
    }
    vals.push(id);
    this.db.prepare(`UPDATE jobs SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    const row = this.get(id);
    if (!row) throw new Error(`Job "${id}" not found`);
    return row;
  }
}

export function openStore(file: string): JobStore {
  mkdirSync(path.dirname(file), { recursive: true });
  return new JobStore(new DatabaseSync(file));
}

const g = globalThis as { __phainoJobStore?: JobStore };

/** Shared store at ${dataDir}/phaino.db, memoized for dev HMR. */
export function getStore(): JobStore {
  return (g.__phainoJobStore ??= openStore(
    path.join(getEnv().dataDir, "phaino.db"),
  ));
}
