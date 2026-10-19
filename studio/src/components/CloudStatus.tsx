"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useComfyHealth } from "@/lib/useComfyHealth";

const DOT = "h-1.5 w-1.5 rounded-full";

/** Compact pill showing Comfy connectivity, polled once on mount. */
export function CloudStatus() {
  const health = useComfyHealth();

  if (!health) {
    return (
      <Badge variant="outline" size="lg" className="gap-1.5 font-mono text-t3">
        <span aria-hidden="true" className={`${DOT} bg-t3`} />
        <span className="max-sm:hidden">Comfy Cloud</span>
      </Badge>
    );
  }

  if (health.status !== "ok") {
    return (
      <Badge
        variant="outline"
        size="lg"
        title={health.message ?? health.status}
        className="gap-1.5 font-mono text-t3"
        render={<Link href="/settings" />}
      >
        <span aria-hidden="true" className={`${DOT} bg-t3`} />
        <span className="max-sm:hidden">Not connected</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      size="lg"
      title={health.message}
      className="gap-1.5 font-mono text-t2"
    >
      <span aria-hidden="true" className={`${DOT} bg-ok`} />
      <span className="max-sm:hidden">
        {health.target === "custom" ? health.host : "Comfy Cloud"}
      </span>
    </Badge>
  );
}
