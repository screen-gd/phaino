import { EmptyPage } from "@/components/EmptyPage";
import { LibraryGrid } from "@/components/library/LibraryGrid";
import { getEnv } from "@/server/env";
import { listOutputs } from "@/server/outputs";
import { isDemoMode } from "@/lib/demo-mode";
import { DemoLibrary } from "@/components/DemoLibrary";
import { listPresets } from "@/server/presets/load";

export const dynamic = "force-dynamic";

/** Generated outputs from .data/outputs. */
export default async function LibraryPage() {
  if (isDemoMode()) {
    return <DemoLibrary presets={listPresets().map(({ id, name }) => ({ id, name }))} />;
  }
  const items = await listOutputs(getEnv().dataDir);

  if (items.length === 0) {
    return <EmptyPage title="Library" body="Generated shots appear here." />;
  }

  return <LibraryGrid items={items} />;
}
