import Link from "next/link";
import { getPreset, listPresets, type ListedPreset } from "@/server/presets/load";
import { routerSpecFor } from "@/server/router/catalog";
import { presetPreview } from "@/lib/preset-preview";
import { MODEL_FAMILIES, matchesFamily } from "@/lib/model-families";
import fs from "node:fs";
import path from "node:path";
import { getEnv } from "@/server/env";

export const dynamic = "force-dynamic";

function countNodes(wf: unknown): number | null {
  const w = wf as {
    nodes?: unknown[];
    definitions?: { subgraphs?: { nodes?: unknown[] }[] };
  };
  if (!Array.isArray(w?.nodes)) return null;
  const inner = w.definitions?.subgraphs?.reduce(
    (n, s) => n + (s.nodes?.length ?? 0),
    0,
  );
  return w.nodes.length + (inner ?? 0);
}

function nodeCount(id: string, origin: ListedPreset["origin"]): number | null {
  try {
    if (origin === "model") {
      return countNodes(getPreset(id)?.workflowUi ?? null);
    }
    const env = getEnv();
    const dir = path.join(origin === "fork" ? env.forksDir : env.presetsDir, id);
    const wf = JSON.parse(
      fs.readFileSync(path.join(dir, "workflow.json"), "utf8"),
    );
    return countNodes(wf);
  } catch {
    return null;
  }
}

function PresetCard({ preset }: { preset: ListedPreset }) {
  const count = nodeCount(preset.id, preset.origin);
  return (
    <Link
      href={`/workflows/${preset.id}`}
      className="group overflow-hidden rounded-xl border border-line bg-s2 hover:border-[#444]"
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          src={presetPreview(preset)}
          alt=""
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <span className="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-caption uppercase text-t2">
          {preset.model.label}
        </span>
      </div>
      <div className="p-2.5">
        <b className="block truncate text-body font-semibold">{preset.name}</b>
        <span className="mt-0.5 block text-caption text-t3">
          {count !== null ? `${count} nodes · ` : ""}
          {preset.category}
          {preset.origin === "fork" && preset.forkOf ? ` · Fork of ${preset.forkOf}` : ""}
        </span>
      </div>
    </Link>
  );
}

export default async function WorkflowsPage({
  searchParams,
}: {
  searchParams: Promise<{ model?: string }>;
}) {
  const { model } = await searchParams;
  // Router catalog presets have no ComfyUI graph to inspect.
  const presets = listPresets().filter((p) => routerSpecFor(p.id) === null);
  const families = MODEL_FAMILIES.filter((f) =>
    presets.some((p) => matchesFamily(p, f.id)),
  );
  const filtered = model
    ? presets.filter((p) => matchesFamily(p, model))
    : presets;
  const forks = filtered.filter((p) => p.origin === "fork");
  const builtins = filtered.filter((p) => p.origin !== "fork");

  return (
    <div className="px-4 py-6">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/workflows"
          className={`rounded-full border px-3 py-1.5 text-caption ${!model ? "border-white text-t1" : "border-line text-t3 hover:text-t1"}`}
        >
          All
        </Link>
        {families.map((f) => (
          <Link
            key={f.id}
            href={`/workflows?model=${f.id}`}
            className={`rounded-full border px-3 py-1.5 text-caption ${model === f.id ? "border-white text-t1" : "border-line text-t3 hover:text-t1"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {forks.length > 0 && (
        <>
          <h1 className="mt-6 font-display text-h3 font-extrabold uppercase text-t1 font-stretch-[112.5%]">
            My forks
          </h1>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {forks.map((p) => (
              <PresetCard key={p.id} preset={p} />
            ))}
          </div>
        </>
      )}
      <h1 className="mt-8 font-display text-h3 font-extrabold uppercase text-t1 font-stretch-[112.5%]">
        Workflows
      </h1>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {builtins.map((p) => (
          <PresetCard key={p.id} preset={p} />
        ))}
      </div>
    </div>
  );
}
