"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { JobRecord } from "@/server/jobs/store";
import type { Sequence } from "@/server/sequence/model";
import type { Fps } from "@/server/sequence/timecode";
import { Button } from "@/components/ui/button";
import { PublishDialog } from "@/components/PublishDialog";

type Codec = "h264" | "prores";
type Action = "render" | "package";

const STORE_KEY = "phaino.exportJobId";

function Seg<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex h-7 items-center rounded-lg bg-s2 p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={`h-6 rounded-[6px] px-2 text-[12px] transition-colors ${
            o.value === value
              ? "bg-s3 font-medium text-t1"
              : "text-t3 hover:text-t2"
          } disabled:opacity-50`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5">
      <span className="text-[13px] text-t2">{label}</span>
      {children}
    </div>
  );
}

const FILE_LABELS: Record<string, string> = {
  "phaino_render.mp4": "MP4 movie",
  "phaino_sequence.mp4": "MP4 movie",
  "phaino_sequence.mov": "ProRes movie",
  "phaino_sequence.fcpxml": "FCPXML",
  "phaino_sequence.edl": "EDL",
  "summary.txt": "summary.txt",
};

/** Export settings + job card, in the right rail. */
export function ExportPanel({
  sequence,
  canExport,
  onSettings,
}: {
  sequence: Sequence;
  canExport: boolean;
  onSettings: (patch: {
    fps?: Fps;
    resolution?: Sequence["resolution"];
    handles?: 0 | 12 | 24;
  }) => void;
}) {
  const [codec, setCodec] = useState<Codec>("h264");
  const [job, setJob] = useState<JobRecord | null>(null);
  const [summary, setSummary] = useState<{ id: string; text: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const subscribe = (id: string) => {
    esRef.current?.close();
    const es = new EventSource(`/api/jobs/${id}/events`);
    esRef.current = es;
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { job?: JobRecord };
        if (data.job) {
          setJob(data.job);
          if (!["queued", "running"].includes(data.job.status)) es.close();
        }
      } catch {
        /* keep listening */
      }
    };
    es.onerror = () => es.close();
  };

  // Re-attach to the last export after a reload.
  useEffect(() => {
    const id = localStorage.getItem(STORE_KEY);
    if (id) {
      fetch(`/api/jobs/${id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { job?: JobRecord } | null) => {
          if (!d?.job) return;
          setJob(d.job);
          if (["queued", "running"].includes(d.job.status)) subscribe(id);
        })
        .catch(() => undefined);
    }
    return () => esRef.current?.close();
  }, []);

  // Fetch summary.txt once an NLE package succeeds.
  useEffect(() => {
    if (job?.status !== "succeeded" || job.params?.action !== "package") return;
    const id = job.id;
    fetch(`/api/exports/${id}/summary.txt`)
      .then((r) => (r.ok ? r.text() : null))
      .then((t) => {
        if (t !== null) setSummary({ id, text: t });
      })
      .catch(() => undefined);
  }, [job?.id, job?.status, job?.params]);

  const running = job?.status === "queued" || job?.status === "running";
  const isPackage = job?.params?.action === "package";

  const start = async (action: Action) => {
    setSubmitError(null);
    const res = await fetch("/api/sequence/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, codec }),
    });
    const data = (await res.json().catch(() => null)) as
      | { job?: JobRecord; error?: string }
      | null;
    if (!res.ok || !data?.job) {
      setSubmitError(data?.error ?? "Export failed to start");
      return;
    }
    setJob(data.job);
    localStorage.setItem(STORE_KEY, data.job.id);
    subscribe(data.job.id);
  };

  const cancel = async () => {
    if (job) await fetch(`/api/jobs/${job.id}/cancel`, { method: "POST" });
  };

  const exportId = job?.params?.exportId as string | undefined;
  // The render job copies its mp4 to outputs/editor/render-<jobId>.mp4.
  const libraryPath =
    job?.status === "succeeded" && !isPackage
      ? `editor/render-${job.id}.mp4`
      : undefined;
  const downloads =
    job?.status === "succeeded" && exportId
      ? job.outputs
          .filter((o) => !o.startsWith("media/"))
          .map((name) => ({
            name,
            href: `/api/exports/${exportId}/${name}`,
          }))
      : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-line px-3 py-2.5">
        <h3 className="text-[13px] font-semibold">Export</h3>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1.5">
        <Row label="Frame rate">
          <Seg<Fps>
            options={[
              { label: "24", value: 24 },
              { label: "25", value: 25 },
              { label: "30", value: 30 },
            ]}
            value={sequence.fps}
            onChange={(fps) => onSettings({ fps })}
            disabled={!canExport}
          />
        </Row>
        <Row label="Resolution">
          <Seg<Sequence["resolution"]>
            options={[
              { label: "1080p", value: "1080p" },
              { label: "4K", value: "4K" },
            ]}
            value={sequence.resolution}
            onChange={(resolution) => onSettings({ resolution })}
            disabled={!canExport}
          />
        </Row>
        <Row label="Handles">
          <Seg<0 | 12 | 24>
            options={[
              { label: "0", value: 0 },
              { label: "12", value: 12 },
              { label: "24", value: 24 },
            ]}
            value={sequence.handles}
            onChange={(handles) => onSettings({ handles })}
            disabled={!canExport}
          />
        </Row>
        <Row label="Format">
          <Seg<Codec>
            options={[
              { label: "MP4", value: "h264" },
              { label: "ProRes", value: "prores" },
            ]}
            value={codec}
            onChange={setCodec}
          />
        </Row>
        <p className="px-3 pt-0.5 text-[11px] text-t3">
          Renders a finished H.264/AAC MP4. The NLE package also conforms media
          with handles and writes FCPXML and EDL; the audio lane and titles are
          not in the interchange files.
        </p>

        {job && (
          <div className="mx-3 mt-3 rounded-lg border border-line bg-s2 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-t2">
                {isPackage ? "Package" : "Render"} · {job.status}
              </span>
              {running && (
                <button
                  type="button"
                  onClick={() => void cancel()}
                  className="text-[11px] text-t3 hover:text-t1"
                >
                  Cancel
                </button>
              )}
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-s1">
              <div
                className="h-full rounded-full bg-ac transition-[width]"
                style={{ width: `${Math.round((job.progress ?? 0) * 100)}%` }}
              />
            </div>
            {job.message && (
              <p className="mt-1.5 font-mono text-[10px] text-t3">
                {job.message}
              </p>
            )}
            {job.status === "failed" && job.error && (
              <p className="mt-1.5 text-[11px] text-destructive">{job.error}</p>
            )}
            {job.status === "succeeded" && exportId && (
              <div className="mt-2">
                {!isPackage && libraryPath ? (
                  <div className="flex flex-col gap-1.5">
                    <a
                      href={`/api/exports/${exportId}/phaino_render.mp4`}
                      download
                      className="inline-flex h-8 w-full items-center justify-center rounded-md bg-ac px-2 text-[12px] font-medium text-on hover:bg-[#ff6d3a]"
                    >
                      Download MP4
                    </a>
                    <div className="flex gap-1.5">
                      <Link
                        href="/library"
                        className="inline-flex h-7 flex-1 items-center justify-center rounded-md border border-line px-2 text-[12px] text-t2 hover:bg-s3 hover:text-t1"
                      >
                        Library
                      </Link>
                      <PublishDialog
                        output={{
                          path: libraryPath,
                          kind: "video",
                          previewUrl: `/api/outputs/${libraryPath}`,
                        }}
                        trigger={
                          <button
                            type="button"
                            className="inline-flex h-7 flex-1 items-center justify-center rounded-md border border-line px-2 text-[12px] text-t2 hover:bg-s3 hover:text-t1"
                          >
                            Publish
                          </button>
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <a
                    href={`/api/exports/${exportId}/zip`}
                    className="inline-flex h-8 w-full items-center justify-center rounded-md bg-ac px-2 text-[12px] font-medium text-on hover:bg-[#ff6d3a]"
                  >
                    Download zip
                  </a>
                )}
                {isPackage && (
                  <ul className="mt-2 space-y-1">
                    {downloads.map((d) => (
                      <li key={d.name}>
                        <a
                          href={d.href}
                          download
                          className="text-[11px] text-t2 underline-offset-2 hover:text-ac hover:underline"
                        >
                          {FILE_LABELS[d.name] ?? d.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {isPackage && summary?.id === job.id && (
                  <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-s1 p-2 font-mono text-[10px] leading-relaxed text-t3">
                    {summary.text}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
        {submitError && (
          <p className="px-3 pt-2 text-[12px] text-destructive">{submitError}</p>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-line p-3">
        <Button
          onClick={() => void start("render")}
          disabled={!canExport || running}
          className="h-10 w-full bg-ac text-[13px] font-semibold text-on hover:bg-[#ff6d3a] disabled:bg-s2 disabled:text-t3 disabled:opacity-100"
        >
          Render video
        </Button>
        <Button
          onClick={() => void start("package")}
          disabled={!canExport || running}
          variant="outline"
          className="h-9 w-full text-[13px]"
        >
          Export for NLE
        </Button>
      </div>
    </div>
  );
}
