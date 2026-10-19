"use client";

import { useEffect, useState } from "react";
import type { ComfyHealth } from "@/lib/health";

let pending: Promise<ComfyHealth | null> | null = null;

/**
 * One shared /api/health request for every mounted consumer. The cached
 * promise is dropped when the fetch fails or returns a non-OK response, so a
 * later mount can retry.
 */
export function useComfyHealth(): ComfyHealth | null {
  const [health, setHealth] = useState<ComfyHealth | null>(null);

  useEffect(() => {
    let cancelled = false;
    pending ??= fetch("/api/health")
      .then((r) => (r.ok ? (r.json() as Promise<ComfyHealth>) : null))
      .catch(() => null)
      .then((data) => {
        if (!data) pending = null;
        return data;
      });
    void pending.then((data) => {
      if (!cancelled && data) setHealth(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return health;
}
