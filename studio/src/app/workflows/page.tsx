import Link from "next/link";
import { listPresets, type ListedPreset } from "@/server/presets/load";
import { presetPreview } from "@/lib/preset-preview";
import { MODEL_FAMILIES, matchesFamily } from "@/lib/model-families";
import fs from "node:fs";
import path from "node:path";
import { getEnv } from "@/server/env";

export const dynamic = "force-dynamic";

function nodeCount(id: string, origin: ListedPreset["origin"]): number | null {
  const env = getEnv();
  const dir = path.join(origin === "fork" ? env.forksDir : env.presetsDir, id);
  try {
    const wf = JSON.parse(
      fs.readFileSync(path.join(dir, "workflow.json"), "utf8"),
    ) as { nodes?: unknown[]; definitions?: { subgraphs?: { nodes?: unknown[] }[] } };
    const inner = wf.definitions?.subgraphs?.reduce(
      (n, s) => n + (s.nodes?.length ?? 0),
      0,
    );
    return (wf.nodes?.length ?? 0) + (inner ?? 0);
  } catch {
    return null;
  }
}

function PresetCard({ preset }: { preset: ListedPreset }) {
  const count = nodeCount(preset.id, preset.origin);
  return (
    <Link
      href={`/workflows/${preset.id}`}
      className="group overflow-hidden rounded-xl border border-line bg-s2 hover:border-[#3a3a3a]"
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          src={presetPreview(preset)}
          alt=""
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <span className="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] uppercase text-t2">
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
  const presets = listPresets();
  const families = MODEL_FAMILIES.filter((f) =>
    presets.some((p) => matchesFamily(p, f.id)),
  );
  const filtered = model
    ? presets.filter((p) => matchesFamily(p, model))
    : presets;
  const forks = filtered.filter((p) => p.origin === "fork");
  const builtins = filtered.filter((p) => p.origin !== "fork");

  return (
    <div className="px-4 py-6 sm:px-6">
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
          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {forks.map((p) => (
              <PresetCard key={p.id} preset={p} />
            ))}
          </div>
        </>
      )}
      <h1 className="mt-8 font-display text-h3 font-extrabold uppercase text-t1 font-stretch-[112.5%]">
        Workflows
      </h1>
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {builtins.map((p) => (
          <PresetCard key={p.id} preset={p} />
        ))}
      </div>
    </div>
  );
}
