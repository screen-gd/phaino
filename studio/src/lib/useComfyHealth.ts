"use client";

import { useEffect, useState } from "react";
import type { ComfyHealth } from "@/lib/health";

let pending: Promise<ComfyHealth | null> | null = null;
let last: ComfyHealth | null = null;
const listeners = new Set<() => void>();

function fetchHealth(): Promise<ComfyHealth | null> {
  pending ??= fetch("/api/health")
    .then((r) => (r.ok ? (r.json() as Promise<ComfyHealth>) : null))
    .catch(() => null)
    .then((data) => {
      pending = null;
      if (data) {
        last = data;
        listeners.forEach((l) => l());
      }
      return data;
    });
  return pending;
}

/** Drop the shared result and refetch; every mounted consumer updates. */
export function refreshComfyHealth(): void {
  pending = null;
  void fetchHealth();
}

/**
 * One shared /api/health request for every mounted consumer. The cached
 * promise is dropped when the fetch fails or returns a non-OK response, so a
 * later mount can retry.
 */
export function useComfyHealth(): ComfyHealth | null {
  const [health, setHealth] = useState<ComfyHealth | null>(last);

  useEffect(() => {
    const on = () => setHealth(last);
    listeners.add(on);
    void fetchHealth();
    return () => {
      listeners.delete(on);
    };
  }, []);

  return health;
}
