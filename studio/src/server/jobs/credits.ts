import "server-only";

import type { RuntimeStats } from "@/lib/credits";
import { getStore } from "./store";
import { isDemoMode } from "@/lib/demo-mode";
import { routerAdapterFor } from "@/server/router/adapters";

/** runtimeStats for a set of preset ids, keyed by id. */
export function presetEstimates(
  presetIds: readonly string[],
): Record<string, RuntimeStats> {
  if (isDemoMode()) return {};
  const store = getStore();
  return Object.fromEntries(
    presetIds.map((id) => [
      id,
      routerAdapterFor(id)
        ? { kind: "router", ...store.routerCreditStats(id) }
        : store.runtimeStats(id),
    ]),
  );
}
