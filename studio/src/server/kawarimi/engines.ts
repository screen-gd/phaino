/**
 * Kawarimi (character swap) engines: the single list the runner, job
 * preparation, audio remux and later the page/MCP all read. Open entries come
 * from registry swap modes (id, label, maxSeconds, no duplication); partner
 * entries are the Router-served swap models listed below.
 */
import { MODEL_REGISTRY, modePresetId } from "@/server/models/registry";

export type KawarimiEngine = {
  presetId: string;
  label: string;
  provider: string;
  license: "open" | "partner";
  badge?: "H3";
  /** Source clip cap in seconds; longer clips are trimmed before submit. */
  maxSeconds: number;
  order: number;
};

export const DEFAULT_KAWARIMI = "kawarimi";

const openEngines: KawarimiEngine[] = MODEL_REGISTRY.flatMap((model) => {
  const src = model.modes.swap;
  if (!src || !("template" in src)) return [];
  return [
    {
      presetId: modePresetId(model, "swap"),
      label: model.label,
      provider: "Comfy",
      license: "open" as const,
      maxSeconds: src.maxSeconds ?? 5,
      order: 10,
    },
  ];
});

const partnerEngines: KawarimiEngine[] = [
  {
    presetId: "kawarimi-h3",
    label: "MiniMax H3",
    provider: "MiniMax",
    license: "partner",
    badge: "H3",
    maxSeconds: 15,
    order: 20,
  },
  {
    presetId: "kawarimi-genjutsu",
    label: "Genjutsu Motion Transfer",
    provider: "Higgsfield",
    license: "partner",
    maxSeconds: 30,
    order: 30,
  },
  {
    presetId: "kawarimi-seedance",
    label: "Seedance 2.5 Video Editing",
    provider: "BytePlus",
    license: "partner",
    maxSeconds: 10,
    order: 40,
  },
  {
    presetId: "kawarimi-kling-o1",
    label: "Kling O1 Video Edit",
    provider: "Kling",
    license: "partner",
    maxSeconds: 10,
    order: 50,
  },
  {
    presetId: "kawarimi-wan27",
    label: "Wan 2.7 Video Edit",
    provider: "Wan",
    license: "partner",
    maxSeconds: 10,
    order: 60,
  },
  {
    presetId: "kawarimi-happyhorse",
    label: "HappyHorse 1.0 Video Edit",
    provider: "Wan",
    license: "partner",
    maxSeconds: 60,
    order: 70,
  },
  {
    presetId: "kawarimi-aleph",
    label: "Runway Aleph 2",
    provider: "Runway",
    license: "partner",
    maxSeconds: 30,
    order: 80,
  },
];

/** Every Kawarimi engine, open first, ordered for the picker. */
export const KAWARIMI_ENGINES: readonly KawarimiEngine[] = [
  ...openEngines,
  ...partnerEngines,
];

/** The engine for a preset id, open or partner; undefined otherwise. */
export function kawarimiEngine(
  presetId: string,
): KawarimiEngine | undefined {
  return KAWARIMI_ENGINES.find((e) => e.presetId === presetId);
}

/** Whether a preset id is any Kawarimi engine. */
export function isKawarimiPreset(presetId: string): boolean {
  return kawarimiEngine(presetId) !== undefined;
}
