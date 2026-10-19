"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ComfyHealth } from "@/lib/health";

const PILL =
  "inline-flex h-8 items-center gap-2 rounded-full border border-line bg-s2 px-3 font-mono text-xs whitespace-nowrap";

/** Compact pill showing Comfy connectivity, polled once on mount. */
export function CloudStatus() {
  const [health, setHealth] = useState<ComfyHealth | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ComfyHealth | null) => {
        if (!cancelled && data) setHealth(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!health) {
    return (
      <span className={`${PILL} text-t3`}>
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-t3" />
        Comfy Cloud
      </span>
    );
  }

  if (health.status !== "ok") {
    return (
      <Link href="/settings" title={health.message ?? health.status} className={`${PILL} text-t3`}>
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-t3" />
        Not connected
      </Link>
    );
  }

  return (
    <span className={`${PILL} text-t2`} title={health.message}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ok" />
      {health.target === "custom" ? health.host : "Comfy Cloud"}
    </span>
  );
}
