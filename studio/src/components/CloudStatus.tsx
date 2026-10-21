"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useComfyHealth } from "@/lib/useComfyHealth";
import { useDemo } from "./DemoProvider";
import { DEMO_MESSAGE } from "@/lib/demo";

const DOT = "h-1.5 w-1.5 rounded-full";

/** Compact pill showing Comfy connectivity, plus a credit balance when known. */
export function CloudStatus() {
  const demo = useDemo();
  const health = useComfyHealth();
  const [credits, setCredits] = useState<number | null>(null);
  const connected = health?.status === "ok";

  useEffect(() => {
    if (!connected || demo.enabled) return;
    let alive = true;
    const load = () => {
      void fetch("/api/comfy/balance")
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { credits?: number | null } | null) => {
          if (alive && data && typeof data.credits === "number") {
            setCredits(data.credits);
          }
        })
        .catch(() => {});
    };
    load();
    window.addEventListener("focus", load);
    return () => {
      alive = false;
      window.removeEventListener("focus", load);
    };
  }, [connected, demo.enabled]);

  const balance =
    connected && credits !== null ? (
      <a
        href="https://platform.comfy.org/profile"
        target="_blank"
        rel="noreferrer"
        className="hidden items-center rounded-full border border-line px-2.5 py-1.5 font-mono text-caption text-t2 hover:text-t1 md:flex"
      >
        {credits.toLocaleString()} credits
      </a>
    ) : null;

  if (demo.enabled) {
    return <Badge variant="outline" size="lg" title={DEMO_MESSAGE} className="font-mono text-ac">Demo</Badge>;
  }

  if (!health) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" size="lg" className="gap-1.5 font-mono text-t3">
          <span aria-hidden="true" className={`${DOT} bg-t3`} />
          <span className="max-sm:hidden">Comfy Cloud</span>
        </Badge>
      </div>
    );
  }

  if (health.status !== "ok") {
    return (
      <div className="flex items-center gap-1.5">
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
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {balance}
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
    </div>
  );
}
