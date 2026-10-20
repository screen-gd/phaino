import { notFound } from "next/navigation";
import { WorkflowView } from "@/components/workflow/WorkflowView";
import { getPreset } from "@/server/presets/load";

export const dynamic = "force-dynamic";

type UiGraph = {
  nodes?: unknown[];
  definitions?: { subgraphs?: { nodes?: unknown[] }[] };
};

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

  return (
    <WorkflowView
      preset={loaded.preset}
      workflow={loaded.workflowUi}
      stats={{ nodes, subgraphs }}
    />
  );
}
