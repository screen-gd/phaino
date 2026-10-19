"use client";

import { useCallback, useEffect, useState } from "react";
import { BACKEND_LABELS, BACKENDS } from "@/lib/backend";
import type { BackendHealth } from "@/lib/health";

function StatusDot({ status }: { status: BackendHealth["status"] | undefined }) {
  return (
    <span
      aria-hidden="true"
      className={`h-2 w-2 flex-none rounded-full ${
        status === "ok" ? "bg-ac" : "bg-t3"
      }`}
    />
  );
}

/** Backend list with live status from /api/health. */
export function SettingsView() {
  const [health, setHealth] = useState<BackendHealth[] | null>(null);
  const [checking, setChecking] = useState(false);

  const load = useCallback(async (): Promise<BackendHealth[]> => {
    try {
      const r = await fetch("/api/health");
      const data: { backends?: BackendHealth[] } | null = r.ok ? await r.json() : null;
      return data?.backends ?? [];
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    void load().then(setHealth);
  }, [load]);

  const recheck = useCallback(async () => {
    setChecking(true);
    try {
      setHealth(await load());
    } finally {
      setChecking(false);
    }
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-xl p-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h1 className="text-base font-semibold">Backends</h1>
        <button
          type="button"
          onClick={() => void recheck()}
          className="inline-flex h-11 items-center rounded-full border border-line bg-s2 px-3.5 hover:border-[#3a3a3a] hover:bg-s3"
        >
          {checking ? "Checking..." : "Check again"}
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {BACKENDS.map((b) => {
          const h = health?.find((x) => x.backend === b);
          return (
            <div
              key={b}
              className="grid gap-2 rounded-[14px] border border-line bg-s2 p-3.5"
            >
              <div className="flex items-center justify-between gap-2 font-semibold">
                <span className="flex items-center gap-2">
                  <StatusDot status={h?.status} />
                  {BACKEND_LABELS[b]}
                </span>
                <span className="font-mono text-xs font-normal text-t2">
                  {h?.status ?? "checking"}
                </span>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="font-mono text-xs uppercase tracking-[0.06em] text-t3">Host</dt>
                <dd className="text-t2">{h?.host ?? "-"}</dd>
                <dt className="font-mono text-xs uppercase tracking-[0.06em] text-t3">Latency</dt>
                <dd className="text-t2">
                  {h?.latencyMs != null ? `${h.latencyMs} ms` : "-"}
                </dd>
              </dl>
              {h?.status === "not_configured" && h.message && (
                <p className="font-mono text-xs text-ac">{h.message}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
