"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { PublishDialog } from "./PublishDialog";
import { Icon, SECTION_ICONS, type IconName } from "./icons";
import type { StudioJob, StudioParam, StudioPreset } from "./toolStudioData";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { COMFY_PRICING_URL } from "@/lib/comfy";
import { useComfyHealth } from "@/lib/useComfyHealth";

const STATUS_BADGE: Record<
  StudioJob["status"],
  { variant: "default" | "secondary" | "destructive" | "outline" | "success"; label: string }
> = {
  queued: { variant: "secondary", label: "Queued" },
  running: { variant: "default", label: "Running" },
  succeeded: { variant: "success", label: "Done" },
  failed: { variant: "destructive", label: "Failed" },
  cancelled: { variant: "outline", label: "Cancelled" },
};

type Uploaded = { uploadId: string; previewUrl: string; name: string };

function isVideoPath(rel: string) {
  return /\.(mp4|mov)$/i.test(rel);
}

function freshSeed() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

/** One image input slot: click or drop, uploads via /api/uploads. */
function UploadSlot({
  spec,
  uploaded,
  onUploaded,
  onClear,
}: {
  spec: { key: string; label: string; required: boolean };
  uploaded?: Uploaded;
  onUploaded: (u: Uploaded) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        onUploaded({
          uploadId: data.uploadId,
          previewUrl: data.previewUrl,
          name: file.name,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  return (
    <div className="grid gap-1.5">
      <Label>
        {spec.label}
        {spec.required && <span className="ml-1 text-ac">*</span>}
      </Label>
      {uploaded ? (
        <div className="flex items-center gap-2 rounded-lg border border-line bg-s2 p-2">
          <img
            src={uploaded.previewUrl}
            alt={uploaded.name}
            className="h-10 w-10 rounded-md object-cover"
          />
          <span className="min-w-0 flex-1 truncate text-caption text-t3">
            {uploaded.name}
          </span>
          <Button variant="ghost" size="icon-sm" aria-label="Remove" onClick={onClear}>
            <Icon d="M6 6l12 12M18 6L6 18" className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={`grid h-20 w-full place-items-center rounded-lg border border-dashed text-caption transition-colors ${
            drag ? "border-ac bg-acs text-t1" : "border-line bg-s2 text-t3"
          } ${busy ? "opacity-60" : "hover:border-t3"}`}
        >
          {busy ? "Uploading…" : "Drop an image or click"}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function ParamField({
  param,
  value,
  randomSeed,
  onChange,
  onRandomSeed,
}: {
  param: StudioParam;
  value: string | number | boolean | undefined;
  randomSeed: boolean;
  onChange: (v: string | number | boolean) => void;
  onRandomSeed: (on: boolean) => void;
}) {
  const id = `param-${param.key}`;
  if (param.type === "text") {
    const isPrompt = param.key.toLowerCase().includes("prompt");
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={id}>{param.label}</Label>
        {isPrompt ? (
          <Textarea
            id={id}
            value={String(value ?? param.default)}
            placeholder={param.placeholder}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
          />
        ) : (
          <Input
            id={id}
            value={String(value ?? param.default)}
            placeholder={param.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
    );
  }
  if (param.type === "choice") {
    return (
      <div className="grid gap-1.5">
        <Label>{param.label}</Label>
        {param.options.length <= 4 ? (
          <div className="flex flex-wrap gap-1">
            {param.options.map((o) => {
              const on = (value ?? param.default) === o.value;
              return (
                <button
                  key={String(o.value)}
                  type="button"
                  onClick={() => onChange(o.value)}
                  className={`h-8 rounded-lg border px-3 text-caption ${
                    on
                      ? "border-ac bg-acs text-ac"
                      : "border-line bg-s2 text-t3 hover:text-t1"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        ) : (
          <Select
            value={String(value ?? param.default)}
            onValueChange={(v) => {
              const opt = param.options.find(
                (o) => String(o.value) === String(v),
              );
              if (opt) onChange(opt.value);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {param.options.map((o) => (
                <SelectItem key={String(o.value)} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        )}
      </div>
    );
  }
  if (param.type === "int") {
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={id}>{param.label}</Label>
        <Input
          id={id}
          type="number"
          min={param.min}
          max={param.max}
          value={Number(value ?? param.default)}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    );
  }
  // seed
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{param.label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          disabled={randomSeed}
          value={randomSeed ? "" : Number(value ?? 0)}
          placeholder={randomSeed ? "Random" : undefined}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
        />
        <label className="flex items-center gap-1.5 text-caption text-t3">
          <Checkbox
            checked={randomSeed}
            onCheckedChange={(v) => onRandomSeed(v === true)}
          />
          Random
        </label>
      </div>
    </div>
  );
}

export function ToolStudio({
  title,
  icon,
  category,
  presets,
}: {
  title: string;
  icon: IconName;
  category: string;
  presets: StudioPreset[];
}) {
  const searchParams = useSearchParams();
  const health = useComfyHealth();
  const wanted = searchParams.get("preset");
  const [presetId, setPresetId] = useState(
    () =>
      (wanted && presets.some((p) => p.id === wanted) && wanted) ||
      presets[0]?.id ||
      "",
  );
  const preset = presets.find((p) => p.id === presetId) ?? presets[0];

  const [uploads, setUploads] = useState<Record<string, Uploaded>>({});
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
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
      .then((r) => (r.ok ? (r.json() as Promise<{ jobs: StudioJob[] }>) : null))
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

  function selectPreset(id: string) {
    setPresetId(id);
    setUploads({});
    setValues({});
    setError(null);
  }

  async function submit() {
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
  }

  async function cancel() {
    if (!job) return;
    const res = await fetch(`/api/jobs/${job.id}/cancel`, { method: "POST" });
    if (res.ok) setJob(((await res.json()) as { job: StudioJob }).job);
  }

  const missingRequired =
    preset?.inputs.filter((i) => i.required && !uploads[i.key]) ?? [];
  const ready = missingRequired.length === 0 && !!preset;
  const presetName = (id: string) =>
    presets.find((p) => p.id === id)?.name ?? id;

  const output = job?.outputs[0];
  const outputKind = output && isVideoPath(output) ? "video" : "image";

  return (
    <div className="grid h-full grid-cols-[380px_minmax(0,1fr)] gap-4 p-4">
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-panel border border-line bg-s1">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3.5">
          <div className="flex items-center gap-3 rounded-[14px] border border-line bg-s2 p-2">
            <div className="grid h-14 w-14 flex-none place-items-center rounded-[10px] bg-s3 text-t3">
              <Icon d={SECTION_ICONS[icon]} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-mono text-xs uppercase tracking-[0.06em] text-t3">
                {title}
              </span>
              <b className="block truncate font-semibold">{title}</b>
            </div>
          </div>

          {health && health.status !== "ok" && (
            <Alert variant="warning">
              <AlertTitle>Comfy Cloud is not connected.</AlertTitle>
              <AlertDescription>
                Add your API key in{" "}
                <Link href="/settings" className="underline underline-offset-2">
                  Settings
                </Link>
                .
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-1.5">
            <Label>Model</Label>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPreset(p.id)}
                  className={`group overflow-hidden rounded-lg border text-left ${
                    p.id === preset.id
                      ? "border-ac"
                      : "border-line hover:border-t3"
                  }`}
                >
                  <div className="relative">
                    <img
                      src={p.thumbUrl}
                      alt=""
                      className="aspect-video w-full object-cover"
                    />
                    <Badge
                      size="sm"
                      variant={p.model.license === "partner" ? "default" : "secondary"}
                      className="absolute top-1.5 left-1.5"
                    >
                      {p.model.license === "partner" ? "Partner" : "Open"}
                    </Badge>
                  </div>
                  <div className="px-2 py-1.5">
                    <b className="block truncate text-caption font-semibold text-t1">
                      {p.name}
                    </b>
                    {p.chip && (
                      <span className="text-caption text-t3">{p.chip}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {preset && (
              <p className="text-caption text-t3">{preset.description}</p>
            )}
          </div>

          {preset?.inputs.map((spec) => (
            <UploadSlot
              key={spec.key}
              spec={spec}
              uploaded={uploads[spec.key]}
              onUploaded={(u) =>
                setUploads((prev) => ({ ...prev, [spec.key]: u }))
              }
              onClear={() =>
                setUploads((prev) => {
                  const next = { ...prev };
                  delete next[spec.key];
                  return next;
                })
              }
            />
          ))}

          {preset?.params.map((param) => (
            <ParamField
              key={param.key}
              param={param}
              value={values[param.key]}
              randomSeed={randomSeed}
              onChange={(v) =>
                setValues((prev) => ({ ...prev, [param.key]: v }))
              }
              onRandomSeed={setRandomSeed}
            />
          ))}

          {error && <p className="text-caption text-destructive">{error}</p>}
        </div>

        <div className="border-t border-line px-3.5 pt-3 pb-3.5">
          {preset?.model.license === "partner" && (
            <a
              href={COMFY_PRICING_URL}
              target="_blank"
              rel="noreferrer"
              className="mb-2 block text-caption text-t3 hover:text-t1"
            >
              Partner models use Comfy credits
            </a>
          )}
          <Button
            className="h-[46px] w-full rounded-full text-[15px] font-semibold"
            loading={submitting}
            disabled={!ready || submitting}
            onClick={() => void submit()}
          >
            Generate
          </Button>
        </div>
      </aside>

      <section className="flex min-h-0 flex-col gap-3.5 overflow-y-auto pr-1">
        {job ? (
          <div className="rounded-panel border border-line bg-s1 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_BADGE[job.status].variant}>
                  {STATUS_BADGE[job.status].label}
                </Badge>
                <span className="text-caption text-t3">
                  {presetName(job.presetId)}
                </span>
              </div>
              {(job.status === "queued" || job.status === "running") && (
                <Button variant="outline" size="xs" onClick={() => void cancel()}>
                  Cancel
                </Button>
              )}
            </div>
            {(job.status === "queued" || job.status === "running") && (
              <div className="mt-3">
                <div className="h-1 w-full overflow-hidden rounded-full bg-s3">
                  <div
                    className="h-full rounded-full bg-ac transition-[width] duration-200"
                    style={{ width: `${Math.round(job.progress * 100)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-caption text-t3">
                  {job.message ?? "Waiting"}
                </p>
              </div>
            )}
            {job.status === "failed" && (
              <p className="mt-3 text-body text-destructive">
                {job.error ?? "Generation failed"}
              </p>
            )}
            {job.status === "succeeded" && output && (
              <div className="mt-3">
                {outputKind === "video" ? (
                  <video
                    src={`/api/outputs/${output}`}
                    controls
                    loop
                    muted
                    playsInline
                    className="w-full rounded-lg border border-line"
                  />
                ) : (
                  <img
                    src={`/api/outputs/${output}`}
                    alt=""
                    className="w-full rounded-lg border border-line"
                  />
                )}
                <div className="mt-2.5 flex items-center gap-2">
                  <PublishDialog
                    output={{
                      path: output,
                      kind: outputKind,
                      previewUrl: `/api/outputs/${output}`,
                    }}
                    trigger={
                      <Button variant="outline" size="xs">
                        Share
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="xs"
                    render={<Link href="/library" />}
                  >
                    Open in Library
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid place-items-center rounded-panel border border-line bg-s1 py-24">
            <p className="text-t3">No run yet.</p>
          </div>
        )}

        <div>
          <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.06em] text-t3">
            Recent
          </h3>
          {recent.length === 0 ? (
            <p className="text-caption text-t3">Nothing yet.</p>
          ) : (
            <ul className="grid gap-1.5">
              {recent.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setJob(r);
                      if (
                        r.status === "queued" ||
                        r.status === "running"
                      ) {
                        subscribe(r.id);
                      }
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left ${
                      job?.id === r.id
                        ? "border-ac bg-s2"
                        : "border-line bg-s1 hover:border-t3"
                    }`}
                  >
                    {r.status === "succeeded" && r.outputs[0] ? (
                      isVideoPath(r.outputs[0]) ? (
                        <video
                          src={`/api/outputs/${r.outputs[0]}`}
                          muted
                          preload="metadata"
                          className="h-10 w-16 flex-none rounded-md object-cover"
                        />
                      ) : (
                        <img
                          src={`/api/outputs/${r.outputs[0]}`}
                          alt=""
                          className="h-10 w-16 flex-none rounded-md object-cover"
                        />
                      )
                    ) : (
                      <span className="h-10 w-16 flex-none rounded-md bg-s3" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-caption font-semibold text-t1">
                        {presetName(r.presetId)}
                      </span>
                      <span className="block truncate text-caption text-t3">
                        {r.error ?? r.message ?? r.status}
                      </span>
                    </span>
                    <Badge variant={STATUS_BADGE[r.status].variant} size="sm">
                      {STATUS_BADGE[r.status].label}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
