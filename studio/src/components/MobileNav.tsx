"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, SECTION_ICONS } from "./icons";
import { PhainoMark } from "./Logo";
import { featuresIn, type Feature } from "@/lib/features";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetPopup, SheetTrigger } from "@/components/ui/sheet";

function RowLink({
  feature,
  onNavigate,
}: {
  feature: Feature;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={feature.href}
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 hover:bg-s3"
    >
      <span className="flex h-4 w-4 flex-none items-center justify-center text-t3">
        <Icon d={SECTION_ICONS[feature.icon]} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-body font-semibold text-t1">
          {feature.label}
          <StatusBadge status={feature.status} />
        </span>
        <span className="block truncate text-caption text-t3">
          {feature.description}
        </span>
      </span>
    </Link>
  );
}

/** Hamburger + left Sheet with the full nav, for viewports below md. */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const primary = featuresIn("primary");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open menu"
            className="text-t3 hover:text-t1 md:hidden"
          />
        }
      >
        <Icon d={SECTION_ICONS.menu} />
      </SheetTrigger>
      <SheetPopup side="left" className="border-line bg-s1" showCloseButton>
        <div className="flex h-full min-h-0 flex-col">
          <Link
            href="/"
            onClick={close}
            className="flex items-center gap-2 border-b border-line p-4"
          >
            <PhainoMark className="h-5 w-5 text-ac" />
            <span className="font-wordmark text-xl font-bold tracking-tight">
              Phaino
            </span>
          </Link>
          <nav className="min-h-0 flex-1 overflow-y-auto p-3">
            <div>
              <h4 className="px-3 pb-1 text-caption text-t3">Create</h4>
              <ul className="grid gap-0.5">
                {featuresIn("create").map((f) => (
                  <li key={f.id}>
                    <RowLink feature={f} onNavigate={close} />
                  </li>
                ))}
              </ul>
            </div>
            <ul className="mt-4 grid gap-0.5">
              {primary.map((f) => {
                const active =
                  pathname === f.href || pathname.startsWith(`${f.href}/`);
                return (
                  <li key={f.id}>
                    <Link
                      href={f.href}
                      onClick={close}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-body ${
                        active
                          ? "font-semibold text-ac"
                          : "text-t2 hover:bg-s3 hover:text-t1"
                      }`}
                    >
                      {f.label}
                      <StatusBadge status={f.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="grid gap-0.5 border-t border-line p-3">
            <Link
              href="/settings"
              onClick={close}
              className={`rounded-lg px-3 py-2 text-body ${
                pathname === "/settings"
                  ? "font-semibold text-ac"
                  : "text-t2 hover:bg-s3 hover:text-t1"
              }`}
            >
              Settings
            </Link>
            <Link
              href="/tracker"
              onClick={close}
              className={`rounded-lg px-3 py-2 text-body ${
                pathname === "/tracker"
                  ? "font-semibold text-ac"
                  : "text-t2 hover:bg-s3 hover:text-t1"
              }`}
            >
              Tracker
            </Link>
          </div>
        </div>
      </SheetPopup>
    </Sheet>
  );
}
