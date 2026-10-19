"use client";

import { useCallback, useEffect, useState } from "react";
import type { ComfyHealth } from "@/lib/health";
import { SocialConnections } from "@/components/SocialConnections";

const TARGET_LABELS = { cloud: "Comfy Cloud", custom: "Custom endpoint" } as const;

/** Comfy target status from /api/health. */
export function SettingsView() {
  const [health, setHealth] = useState<ComfyHealth | null>(null);
  const [checking, setChecking] = useState(false);

  const load = useCallback(async (): Promise<ComfyHealth | null> => {
    try {
      const r = await fetch("/api/health");
      return r.ok ? await r.json() : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    void load().then((h) => {
      if (h) setHealth(h);
    });
  }, [load]);

  const recheck = useCallback(async () => {
    setChecking(true);
    try {
      const h = await load();
      if (h) setHealth(h);
    } finally {
      setChecking(false);
    }
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-xl p-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h1 className="text-base font-semibold">Backend</h1>
        <button
          type="button"
          onClick={() => void recheck()}
          className="inline-flex h-11 items-center rounded-full border border-line bg-s2 px-3.5 hover:border-[#3a3a3a] hover:bg-s3"
        >
          {checking ? "Checking..." : "Check again"}
        </button>
      </div>

      <div className="grid gap-2 rounded-[14px] border border-line bg-s2 p-3.5">
        <div className="flex items-center justify-between gap-2 font-semibold">
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-2 w-2 flex-none rounded-full ${
                health?.status === "ok" ? "bg-ok" : "bg-t3"
              }`}
            />
            {health ? TARGET_LABELS[health.target] : "Comfy Cloud"}
          </span>
          <span className="font-mono text-xs font-normal text-t2">
            {health?.status ?? "checking"}
          </span>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="font-mono text-xs uppercase tracking-[0.06em] text-t3">Host</dt>
          <dd className="text-t2">{health?.host ?? "-"}</dd>
          <dt className="font-mono text-xs uppercase tracking-[0.06em] text-t3">Latency</dt>
          <dd className="text-t2">
            {health?.latencyMs != null ? `${health.latencyMs} ms` : "-"}
          </dd>
        </dl>
        {health?.message && (
          <p className="font-mono text-xs text-ac">{health.message}</p>
        )}
        {health?.status === "not_configured" && (
          <p className="font-mono text-xs text-t3">
            COMFY_API_KEY: Comfy Cloud key. COMFY_BASE_URL: optional custom endpoint.
          </p>
        )}
      </div>

      <SocialConnections />
    </div>
  );
}
