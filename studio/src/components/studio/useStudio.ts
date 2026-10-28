"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDemo } from "@/components/DemoProvider";
import { createDemoJob } from "@/lib/demo";
import { mainPromptKey } from "./studioUtils";
import type {
  StudioJob,
  StudioPreset,
} from "@/components/toolStudioData";

export type Uploaded = { uploadId: string; previewUrl: string; name: string };

function freshSeed() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

/** All state for a tool page: preset, uploads, params, submit, jobs, SSE. */
export function useStudio(
  category: string,
  presets: StudioPreset[],
  opts: { prefillKey?: string } = {},
) {
  const demo = useDemo();
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

  const fromPath = searchParams.get("from");
  const fromApplied = useRef<string | null>(null);

  const [uploads, setUploads] = useState<Record<string, Uploaded>>({});
  const [values, setValues] = useState<
    Record<string, string | number | boolean>
  >({});
  const [randomSeed, setRandomSeed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<StudioJob | null>(null);
  const [recent, setRecent] = useState<StudioJob[]>([]);
  const [recentFailed, setRecentFailed] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const loadRecent = useCallback(async () => {
    if (demo.enabled) return;
    try {
      const res = await fetch(`/api/jobs?category=${category}&limit=12`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { jobs: StudioJob[] };
      setRecent(data.jobs);
      setRecentFailed(false);
    } catch {
      setRecentFailed(true);
    }
  }, [category, demo.enabled]);

  useEffect(() => {
    if (demo.enabled) return;
    fetch(`/api/jobs?category=${category}&limit=12`)
      .then((r) =>
        r.ok ? (r.json() as Promise<{ jobs: StudioJob[] }>) : null,
      )
      .then((data) => {
        if (data) setRecent(data.jobs);
        setRecentFailed(!data);
      })
      .catch(() => setRecentFailed(true));
    return () => esRef.current?.close();
  }, [category, demo.enabled]);

  // ?from=<output path> pre-fills the first required image input with a copy
  // of an existing output (used by "Animate" on image results).
  useEffect(() => {
    if (!fromPath || !preset || fromApplied.current === preset.id) return;
    const target =
      preset.inputs.find((i) => i.required && !uploads[i.key]) ??
      (opts.prefillKey && !uploads[opts.prefillKey]
        ? { key: opts.prefillKey }
        : undefined);
    if (!target) {
      fromApplied.current = preset.id;
      return;
    }
    fromApplied.current = preset.id;
    const load = demo.enabled
      ? Promise.resolve(fromPath.startsWith("/explore/examples/")
          ? { uploadId: fromPath, previewUrl: fromPath }
          : null)
      : fetch("/api/uploads/from-output", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: fromPath }),
        }).then((r) => (r.ok ? (r.json() as Promise<{ uploadId: string; previewUrl: string }>) : null));
    void load
      .then((data) => {
        if (!data) {
          setError("Couldn't load that image.");
          return;
        }
        setUploads((prev) =>
          prev[target.key]
            ? prev
            : { ...prev, [target.key]: { ...data, name: fromPath.split("/").pop() ?? "output" } },
        );
      })
      .catch(() => setError("Couldn't load that image."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromPath, preset?.id]);

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
    (id: string, opts2: { keep?: boolean } = {}) => {
      if (!presets.some((p) => p.id === id)) return;
      setPresetId(id);
      if (!opts2.keep) {
        setUploads({});
        setValues({});
      }
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
      const promptKey = mainPromptKey(preset.params);
      const params: Record<string, string | number | boolean> = {};
      for (const p of preset.params) {
        if (p.type === "seed") {
          params[p.key] = randomSeed
            ? freshSeed()
            : Number(values[p.key] ?? 0);
        } else if (p.key === promptKey) {
          // Edit tools display preset defaults; generation prompts start empty.
          params[p.key] =
            values[p.key] ?? (category === "edit" ? p.default : "");
        } else {
          params[p.key] = values[p.key] ?? p.default;
        }
      }
      const inputs: Record<string, string> = {};
      for (const inp of preset.inputs) {
        if (uploads[inp.key]) inputs[inp.key] = uploads[inp.key].uploadId;
      }
      if (demo.enabled) {
        const sample = createDemoJob({ presetId: preset.id, category, params, inputs });
        setJob(sample);
        demo.addJob(sample);
        return;
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
  }, [preset, submitting, randomSeed, values, uploads, subscribe, demo, category]);

  const cancel = useCallback(async () => {
    const current = job;
    if (!current) return;
    const res = await fetch(`/api/jobs/${current.id}/cancel`, {
      method: "POST",
    });
    if (res.ok) setJob(((await res.json()) as { job: StudioJob }).job);
  }, [job]);

  /** Dismiss the active job card back to the empty stage. */
  const clearJob = useCallback(() => {
    esRef.current?.close();
    setJob(null);
  }, []);

  // The main prompt must be non-empty unless a required image input can
  // drive the run on its own (camera moves).
  const promptKey = preset ? mainPromptKey(preset.params) : undefined;
  const promptOk =
    !promptKey ||
    preset.inputs.some((i) => i.required) ||
    String(values[promptKey] ?? "").trim().length > 0;
  const ready =
    !!preset &&
    promptOk &&
    preset.inputs.every((i) => !i.required || uploads[i.key]);

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
    clearJob,
    recent: demo.enabled ? demo.jobs.filter((row) => row.category === category) : recent,
    recentFailed: !demo.enabled && recentFailed,
    submit,
    cancel,
    subscribe,
    ready,
    demo: demo.enabled,
  };
}
