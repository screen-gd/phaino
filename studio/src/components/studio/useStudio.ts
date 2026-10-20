"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  StudioJob,
  StudioPreset,
} from "@/components/toolStudioData";

export type Uploaded = { uploadId: string; previewUrl: string; name: string };

function freshSeed() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

/** All state for a tool page: preset, uploads, params, submit, jobs, SSE. */
export function useStudio(category: string, presets: StudioPreset[]) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wanted = searchParams.get("preset");
  const [presetId, setPresetId] = useState(
    () =>
      (wanted && presets.some((p) => p.id === wanted) && wanted) ||
      presets[0]?.id ||
      "",
  );
  const preset = presets.find((p) => p.id === presetId) ?? presets[0];

  const [uploads, setUploads] = useState<Record<string, Uploaded>>({});
  const [values, setValues] = useState<
    Record<string, string | number | boolean>
  >({});
  const [randomSeed, setRandomSeed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<StudioJob | null>(null);
  const [recent, setRecent] = useState<StudioJob[]>([]);
  const esRef = useRef<EventSource | null>(null);

  const loadRecent = useCallback(async () => {
    const res = await fetch(`/api/jobs?category=${category}&limit=12`);
    if (res.ok) {
      const data = (await res.json()) as { jobs: StudioJob[] };
      setRecent(data.jobs);
    }
  }, [category]);

  useEffect(() => {
    fetch(`/api/jobs?category=${category}&limit=12`)
      .then((r) =>
        r.ok ? (r.json() as Promise<{ jobs: StudioJob[] }>) : null,
      )
      .then((data) => {
        if (data) setRecent(data.jobs);
      })
      .catch(() => {});
    return () => esRef.current?.close();
  }, [category]);

  const subscribe = useCallback(
    (id: string) => {
      esRef.current?.close();
      const es = new EventSource(`/api/jobs/${id}/events`);
      esRef.current = es;
      es.onmessage = (e) => {
        const row = JSON.parse(e.data as string) as StudioJob;
        setJob(row);
        if (["succeeded", "failed", "cancelled"].includes(row.status)) {
          es.close();
          void loadRecent();
        }
      };
    },
    [loadRecent],
  );

  const selectPreset = useCallback(
    (id: string) => {
      if (!presets.some((p) => p.id === id)) return;
      setPresetId(id);
      setUploads({});
      setValues({});
      setError(null);
      router.replace(`?preset=${id}`, { scroll: false });
    },
    [presets, router],
  );

  const selectJob = useCallback(
    (row: StudioJob) => {
      setJob(row);
      if (row.status === "queued" || row.status === "running") {
        subscribe(row.id);
      }
    },
    [subscribe],
  );

  const setUploaded = useCallback((key: string, u: Uploaded) => {
    setUploads((prev) => ({ ...prev, [key]: u }));
  }, []);

  const clearUploaded = useCallback((key: string) => {
    setUploads((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const setValue = useCallback(
    (key: string, v: string | number | boolean) => {
      setValues((prev) => ({ ...prev, [key]: v }));
    },
    [],
  );

  const submit = useCallback(async () => {
    if (!preset || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const params: Record<string, string | number | boolean> = {};
      for (const p of preset.params) {
        if (p.type === "seed") {
          params[p.key] = randomSeed
            ? freshSeed()
            : Number(values[p.key] ?? 0);
        } else {
          params[p.key] = values[p.key] ?? p.default;
        }
      }
      const inputs: Record<string, string> = {};
      for (const inp of preset.inputs) {
        if (uploads[inp.key]) inputs[inp.key] = uploads[inp.key].uploadId;
      }
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId: preset.id, params, inputs }),
      });
      const data = await res.json();
      if (res.status === 201) {
        setJob(data.job as StudioJob);
        subscribe(data.job.id);
      } else {
        setError(data.message ?? data.error ?? "Generate failed");
      }
    } catch {
      setError("Generate failed");
    } finally {
      setSubmitting(false);
    }
  }, [preset, submitting, randomSeed, values, uploads, subscribe]);

  const cancel = useCallback(async () => {
    const current = job;
    if (!current) return;
    const res = await fetch(`/api/jobs/${current.id}/cancel`, {
      method: "POST",
    });
    if (res.ok) setJob(((await res.json()) as { job: StudioJob }).job);
  }, [job]);

  const ready =
    !!preset && preset.inputs.every((i) => !i.required || uploads[i.key]);

  return {
    preset,
    presets,
    presetId,
    selectPreset,
    uploads,
    setUploaded,
    clearUploaded,
    values,
    setValue,
    randomSeed,
    setRandomSeed,
    submitting,
    error,
    job,
    setJob: selectJob,
    recent,
    submit,
    cancel,
    subscribe,
    ready,
  };
}
