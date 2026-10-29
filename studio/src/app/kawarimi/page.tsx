import { Suspense } from "react";
import {
  KawarimiStudio,
  type KawarimiEngineMeta,
} from "@/components/kawarimi/KawarimiStudio";
import { toStudioPreset } from "@/components/toolStudioData";
import { presetEstimates } from "@/server/jobs/credits";
import {
  DEFAULT_KAWARIMI,
  KAWARIMI_ENGINES,
} from "@/server/kawarimi/engines";
import { getPreset } from "@/server/presets/load";

export const dynamic = "force-dynamic";

export default function KawarimiPage() {
  // Hidden engines (no adapter or gated graph) drop out of the picker.
  const visible = KAWARIMI_ENGINES.map((engine) => ({
    engine,
    loaded: getPreset(engine.presetId),
  })).filter(({ loaded }) => loaded !== null);
  const estimates = presetEstimates(
    visible.map(({ engine }) => engine.presetId),
  );
  const engines: KawarimiEngineMeta[] = visible.map(({ engine, loaded }) => ({
    id: engine.presetId,
    label: engine.label,
    license: engine.license,
    badge: engine.badge,
    maxSeconds: engine.maxSeconds,
    preset: {
      ...toStudioPreset(loaded!.preset),
      estimate: estimates[engine.presetId],
    },
  }));
  const defaultId = engines.some((e) => e.id === DEFAULT_KAWARIMI)
    ? DEFAULT_KAWARIMI
    : engines[0]?.id;

  return (
    <Suspense>
      <KawarimiStudio engines={engines} defaultId={defaultId} />
    </Suspense>
  );
}
