"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { DEMO_MESSAGE } from "@/lib/demo";
import { Icon, SECTION_ICONS } from "./icons";

const DISMISS_KEY = "phaino:demo-notice-dismissed";
const DISMISS_EVENT = "phaino:demo-notice-dismissed";
const SHOW_PATHS = ["/image", "/video", "/camera"];

function subscribe(onChange: () => void) {
  window.addEventListener(DISMISS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(DISMISS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Static accent strip on the tool pages, dismissible per browser. The server
 * snapshot reports "not dismissed" so SSR matches a first-time visitor; a
 * row element always renders so the AppShell grid row collapses to 0.
 */
export function DemoNotice() {
  const pathname = usePathname();
  const dismissed = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(DISMISS_KEY) === "1",
    () => false,
  );
  const onToolPage = SHOW_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    window.dispatchEvent(new Event(DISMISS_EVENT));
  };

  return (
    <div>
      {!dismissed && onToolPage && (
        <div
          role="region"
          aria-label="Demo notice"
          className="flex h-6 min-w-0 items-center gap-2 bg-ac pl-3 pr-1 text-black"
        >
          <p className="min-w-0 flex-1 truncate text-sm font-bold leading-none">
            {DEMO_MESSAGE}
          </p>
          <button
            type="button"
            aria-label="Dismiss demo notice"
            onClick={dismiss}
            className="grid h-6 w-8 shrink-0 place-items-center"
          >
            <Icon d={SECTION_ICONS.x} className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
