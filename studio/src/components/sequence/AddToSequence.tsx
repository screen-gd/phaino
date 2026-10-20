"use client";

import { useRef, useState } from "react";
import { Icon, SECTION_ICONS } from "@/components/icons";
import { Button } from "@/components/ui/button";

/** POST /api/sequence/clips with the output's relPath; "Added" for 2s. */
export function AddToSequence({
  path,
  className,
  iconOnly = false,
}: {
  path: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const [state, setState] = useState<"idle" | "adding" | "added">("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const add = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (state === "adding") return;
    setState("adding");
    setError(null);
    try {
      const res = await fetch("/api/sequence/clips", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not add the clip");
        setState("idle");
        return;
      }
      setState("added");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState("idle"), 2000);
    } catch {
      setError("Could not add the clip");
      setState("idle");
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      {iconOnly ? (
        <button
          type="button"
          onClick={add}
          disabled={state === "adding"}
          aria-label={state === "added" ? "Added" : "Add to Editor"}
          title={state === "added" ? "Added" : "Add to Editor"}
          className={`grid h-6 w-6 place-items-center rounded-md border text-[13px] leading-none ${
            state === "added"
              ? "border-ac bg-ac text-on"
              : "border-line bg-black/60 text-t1 hover:bg-black/90"
          } ${className ?? ""}`}
        >
          {state === "added" ? (
            <Icon d={SECTION_ICONS.check} className="h-3.5 w-3.5" />
          ) : (
            <Icon d={SECTION_ICONS.plus} className="h-3.5 w-3.5" />
          )}
        </button>
      ) : (
        <Button
          variant="outline"
          size="xs"
          onClick={add}
          disabled={state === "adding"}
          className={className}
        >
          {state === "added" ? "Added" : "Add to Editor"}
        </Button>
      )}
      {error && <span className="text-[11px] text-destructive">{error}</span>}
    </span>
  );
}
