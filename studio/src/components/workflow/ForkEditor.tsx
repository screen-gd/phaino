"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Icon, SECTION_ICONS } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ForkParam = {
  type: "text" | "seed" | "choice" | "int" | "float";
  key: string;
  label: string;
  default?: string | number | boolean;
  options?: { value: string | number | boolean; label: string }[];
  min?: number;
  max?: number;
  step?: number;
};

type ForkPreset = {
  id: string;
  name: string;
  description: string;
  forkOf?: string;
  params: readonly ForkParam[];
};

const actionClass = "w-full min-w-0 border-line text-t2 hover:border-t3 hover:text-t1 hover:no-underline data-pressed:no-underline";
const fieldClass = "min-w-0 border-line bg-black text-t1 shadow-none before:hidden dark:bg-black has-focus-visible:border-ac has-focus-visible:ring-0";

function DefaultsForm({ preset }: { preset: ForkPreset }) {
  const router = useRouter();
  // Seed params randomize at run time; they have no stored default.
  const params = preset.params.filter((p) => p.type !== "seed");
  const [values, setValues] = useState<Record<string, string | number | boolean>>(
    () => Object.fromEntries(params.map((p) => [p.key, p.default ?? ""])),
  );
  const [state, setState] = useState<{ saving: boolean; problems: string[]; ok: boolean }>({
    saving: false,
    problems: [],
    ok: false,
  });

  const save = async () => {
    setState({ saving: true, problems: [], ok: false });
    const res = await fetch(`/api/forks/${preset.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ defaults: values }),
    });
    const body = (await res.json()) as { problems?: string[] };
    setState({
      saving: false,
      problems: res.ok ? [] : (body.problems ?? ["Save failed"]),
      ok: res.ok,
    });
    if (res.ok) router.refresh();
  };

  if (params.length === 0) return null;
  return (
    <div className="min-w-0 py-4">
      <h2 className="mb-3 text-body font-semibold text-t1">Defaults</h2>
      <div className="grid gap-2">
        {params.map((param) => (
          <label key={param.key} className="grid min-w-0 gap-1">
            <span className="text-caption text-t3">{param.label}</span>
            {param.type === "choice" ? (
              <Select
                value={String(values[param.key] ?? "")}
                onValueChange={(v) => {
                  const s = String(v ?? "");
                  const opt = param.options?.find((o) => String(o.value) === s);
                  setValues((old) => ({
                    ...old,
                    [param.key]: opt ? opt.value : s,
                  }));
                }}
              >
                <SelectTrigger className="h-9 w-full min-w-0 border-line bg-black text-t1 shadow-none before:hidden focus-visible:border-ac focus-visible:ring-0 dark:bg-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {param.options?.map((o) => (
                    <SelectItem key={String(o.value)} value={String(o.value)} className="data-highlighted:bg-transparent data-highlighted:text-ac">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            ) : param.type === "int" || param.type === "seed" || param.type === "float" ? (
              <Input
                type="number"
                value={String(values[param.key] ?? "")}
                min={param.min}
                max={param.max}
                step={param.step}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [param.key]: Number(e.target.value) }))
                }
                className={`${fieldClass} h-9 font-mono`}
              />
            ) : (
              <Input
                value={String(values[param.key] ?? "")}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [param.key]: e.target.value }))
                }
                className={`${fieldClass} h-9`}
              />
            )}
          </label>
        ))}
      </div>
      {state.problems.map((p) => (
        <p key={p} className="mt-1.5 text-caption text-destructive">
          {p}
        </p>
      ))}
      {state.ok && <p className="mt-1.5 text-caption text-t3">Saved.</p>}
      <Button
        variant="link"
        size="sm"
        className={`${actionClass} mt-3`}
        loading={state.saving}
        onClick={() => void save()}
      >
        Save defaults
      </Button>
    </div>
  );
}

function WorkflowReplace({ preset }: { preset: ForkPreset }) {
  const router = useRouter();
  const uiFile = useRef<HTMLInputElement>(null);
  const apiFile = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ busy: boolean; problems: string[]; ok: boolean }>({
    busy: false,
    problems: [],
    ok: false,
  });

  const submit = async () => {
    const form = new FormData();
    const wf = uiFile.current?.files?.[0];
    const api = apiFile.current?.files?.[0];
    if (!wf || !api) {
      setState({ busy: false, problems: ["Pick both files."], ok: false });
      return;
    }
    form.set("workflow", wf);
    form.set("workflow_api", api);
    setState({ busy: true, problems: [], ok: false });
    const res = await fetch(`/api/forks/${preset.id}/workflow`, {
      method: "PUT",
      body: form,
    });
    const body = (await res.json()) as { problems?: string[] };
    setState({
      busy: false,
      problems: res.ok ? [] : (body.problems ?? [("error" in body && String((body as { error?: unknown }).error)) || "Upload failed"]),
      ok: res.ok,
    });
    if (res.ok) router.refresh();
  };

  return (
    <div className="min-w-0 py-4">
      <h2 className="mb-1 text-body font-semibold text-t1">Replace workflow</h2>
      <p className="mb-2 text-caption text-t3">
        In ComfyUI: File &gt; Export, and File &gt; Export (API).
      </p>
      <label className="grid min-w-0 gap-1">
        <span className="font-mono text-caption text-t3">workflow.json</span>
        <input
          ref={uiFile}
          type="file"
          accept="application/json,.json"
          className="w-full min-w-0 text-caption text-t2 file:mr-2 file:rounded-md file:border file:border-line file:bg-transparent file:px-2 file:py-1 file:text-caption file:text-t1 hover:file:border-t3"
        />
      </label>
      <label className="mt-2 grid min-w-0 gap-1">
        <span className="font-mono text-caption text-t3">workflow_api.json</span>
        <input
          ref={apiFile}
          type="file"
          accept="application/json,.json"
          className="w-full min-w-0 text-caption text-t2 file:mr-2 file:rounded-md file:border file:border-line file:bg-transparent file:px-2 file:py-1 file:text-caption file:text-t1 hover:file:border-t3"
        />
      </label>
      {state.problems.map((p) => (
        <p key={p} className="mt-1.5 text-caption text-destructive">
          {p}
        </p>
      ))}
      {state.ok && <p className="mt-1.5 text-caption text-t3">Workflow replaced.</p>}
      <Button
        variant="link"
        size="sm"
        className={`${actionClass} mt-3`}
        loading={state.busy}
        onClick={() => void submit()}
      >
        Replace workflow
      </Button>
    </div>
  );
}

/** Name, description, defaults, workflow replace and delete for a fork. */
export function ForkEditor({ preset }: { preset: ForkPreset }) {
  const router = useRouter();
  const [meta, setMeta] = useState({ name: preset.name, description: preset.description });
  const [metaState, setMetaState] = useState<{ saving: boolean; ok: boolean }>({
    saving: false,
    ok: false,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const saveMeta = async () => {
    setMetaState({ saving: true, ok: false });
    const res = await fetch(`/api/forks/${preset.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(meta),
    });
    setMetaState({ saving: false, ok: res.ok });
    if (res.ok) router.refresh();
  };

  const remove = async () => {
    setDeleting(true);
    const res = await fetch(`/api/forks/${preset.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push(preset.forkOf ? `/workflows/${preset.forkOf}` : "/workflows");
      router.refresh();
    } else {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="min-w-0 py-4">
        <h2 className="mb-3 text-body font-semibold text-t1">Fork</h2>
        <label className="grid min-w-0 gap-1">
          <span className="text-caption text-t3">Name</span>
          <Input
            value={meta.name}
            onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
            className={`${fieldClass} h-9`}
          />
        </label>
        <label className="mt-2 grid min-w-0 gap-1">
          <span className="text-caption text-t3">Description</span>
          <Textarea
            className={fieldClass}
            value={meta.description}
            rows={2}
            onChange={(e) =>
              setMeta((m) => ({ ...m, description: e.target.value }))
            }
          />
        </label>
        <Button
          variant="link"
          size="sm"
          className={`${actionClass} mt-3`}
          loading={metaState.saving}
          onClick={() => void saveMeta()}
        >
          Save
        </Button>
      </div>

      <DefaultsForm preset={preset} />
      <WorkflowReplace preset={preset} />

      <div className="py-4">
        <Button
          variant="link"
          size="sm"
          className="w-full border-line text-destructive hover:border-destructive hover:no-underline data-pressed:no-underline"
          onClick={() => setConfirmOpen(true)}
        >
          <Icon d={SECTION_ICONS.trash} className="h-4 w-4" />
          Delete fork
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Delete {preset.name}?</DialogTitle>
            <DialogDescription>
              This removes the fork folder. The original preset is unchanged.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel />
          <DialogFooter>
            <DialogClose render={<Button variant="link" className={actionClass} />}>Cancel</DialogClose>
            <Button variant="link" className="border-destructive text-destructive hover:no-underline data-pressed:no-underline" loading={deleting} onClick={() => void remove()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </>
  );
}
