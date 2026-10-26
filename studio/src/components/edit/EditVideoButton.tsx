"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon, SECTION_ICONS } from "../icons";
import { cn } from "@/lib/utils";

/**
 * Copy an output video into uploads and open /edit with it preselected.
 * Renders either a chip button (overlays) or a labelled button.
 */
export function EditVideoButton({
  path,
  iconOnly = false,
  className,
}: {
  path: string;
  iconOnly?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const go = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/uploads/from-output", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.uploadId) {
        router.push(`/edit?upload=${data.uploadId}`);
      }
    } finally {
      setBusy(false);
    }
  };

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={go}
        disabled={busy}
        aria-label="Edit video"
        title="Edit video"
        className={`grid h-6 w-6 place-items-center rounded-md border border-line bg-black/60 text-t1 hover:bg-black/90 ${className ?? ""}`}
      >
        <Icon d={SECTION_ICONS.pencil} className="h-3.5 w-3.5" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      className={cn(
        "rounded-full border border-line px-3 py-1.5 text-[12px] text-t2 hover:bg-s2 hover:text-t1",
        className,
      )}
    >
      Edit
    </button>
  );
}
