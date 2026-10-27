import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkflowView } from "@/components/workflow/WorkflowView";
import { getPreset } from "@/server/presets/load";

export const dynamic = "force-dynamic";

type UiGraph = {
  nodes?: unknown[];
  definitions?: { subgraphs?: { nodes?: unknown[] }[] };
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ref: string }>;
}): Promise<Metadata> {
  const { ref: id } = await params;
  try {
    const loaded = getPreset(id);
    return { title: loaded?.preset.name ?? "Workflow" };
  } catch {
    return { title: "Workflow" };
  }
}

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref: id } = await params;
  const loaded = getPreset(id);
  if (!loaded) notFound();

  const ui = loaded.workflowUi as UiGraph;
  const subgraphs = ui.definitions?.subgraphs?.length ?? 0;
  const nodes =
    (ui.nodes?.length ?? 0) +
    (ui.definitions?.subgraphs?.reduce((n, s) => n + (s.nodes?.length ?? 0), 0) ?? 0);

  const { preset } = loaded;
  const source = preset.forkOf
    ? (() => {
        try {
          const s = getPreset(preset.forkOf);
          return s
            ? { id: s.preset.id, name: s.preset.name, params: s.preset.params }
            : null;
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <WorkflowView
      preset={preset}
      workflow={loaded.workflowUi}
      stats={{ nodes, subgraphs }}
      source={source}
    />
  );
}
