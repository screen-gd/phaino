"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { BACKEND_LABELS, BACKENDS, type Backend } from "@/lib/backend";
import type { BackendHealth } from "@/lib/health";
import { useStudio } from "@/stores/studio";

function healthFor(health: BackendHealth[] | null, backend: Backend) {
  return health?.find((h) => h.backend === backend);
}

/** True once zustand persist has rehydrated; false during SSR and hydration. */
function usePersistHydrated() {
  return useSyncExternalStore(
    useCallback((cb: () => void) => useStudio.persist.onFinishHydration(cb), []),
    () => useStudio.persist.hasHydrated(),
    () => false,
  );
}

export function BackendSwitch() {
  const backend = useStudio((s) => s.backend);
  const setBackend = useStudio((s) => s.setBackend);
  const [health, setHealth] = useState<BackendHealth[] | null>(null);
  const mounted = usePersistHydrated();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { backends?: BackendHealth[] } | null) => {
        if (!cancelled && data?.backends) setHealth(data.backends);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // If the persisted backend is not configured but the other one is, move to it.
  useEffect(() => {
    if (!health) return;
    const current = healthFor(health, backend);
    if (current?.status !== "not_configured") return;
    const other = health.find((h) => h.status !== "not_configured");
    if (other) setBackend(other.backend);
  }, [health, backend, setBackend]);

  // Render the persisted choice only after hydration to avoid a mismatch.
  const active = mounted ? backend : "local";

  return (
    <div role="group" aria-label="Backend" className="flex rounded-full border border-line bg-s2 p-0.5">
      {BACKENDS.map((b) => {
        const h = healthFor(health, b);
        const disabled = h?.status === "not_configured";
        const on = active === b;
        return (
          <button
            key={b}
            type="button"
            disabled={disabled}
            title={h ? (h.message ?? h.status) : "Checking..."}
            onClick={() => setBackend(b)}
            className={`flex h-11 items-center gap-2 rounded-full px-3 text-xs whitespace-nowrap ${
              on ? "bg-t1 font-semibold text-black" : "text-t3"
            } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                h?.status === "ok" ? "bg-ac" : "bg-t3"
              }`}
            />
            {BACKEND_LABELS[b]}
          </button>
        );
      })}
    </div>
  );
}
