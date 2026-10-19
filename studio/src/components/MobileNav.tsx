"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, SECTION_ICONS } from "./icons";
import { PhainoMark } from "./Logo";
import type { MenuRow, NavMenus } from "./navMenus";
import { SECTIONS } from "./sections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetPopup, SheetTrigger } from "@/components/ui/sheet";

const GROUPS: { id: "core" | "studio"; label: string }[] = [
  { id: "core", label: "Core" },
  { id: "studio", label: "Studio" },
];
const MENU_HREFS = new Set(["/image", "/video", "/camera"]);

function rowsFor(href: string, menus: NavMenus): MenuRow[] {
  if (href === "/image") return [...menus.image.features, ...menus.image.models];
  if (href === "/video") return [...menus.video.features, ...menus.video.models];
  if (href === "/camera") return menus.camera;
  return [];
}

function RowLink({
  row,
  onNavigate,
}: {
  row: MenuRow;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={row.href}
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 hover:bg-s3"
    >
      {row.thumb && (
        <img
          src={row.thumb}
          alt=""
          className="h-8 w-14 flex-none rounded-md border border-line object-cover"
        />
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-body font-semibold text-t1">
          {row.title}
          {row.badge && (
            <Badge
              size="sm"
              variant={row.badge === "New" ? "default" : "secondary"}
            >
              {row.badge}
            </Badge>
          )}
          {row.license && (
            <Badge
              size="sm"
              variant={row.license === "partner" ? "default" : "secondary"}
            >
              {row.license === "partner" ? "Partner" : "Open"}
            </Badge>
          )}
        </span>
        <span className="block truncate text-caption text-t3">
          {row.description}
        </span>
      </span>
    </Link>
  );
}

/** Hamburger + left Sheet with the full nav, for viewports below md. */
export function MobileNav({ menus }: { menus: NavMenus }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const close = () => setOpen(false);
  const toggle = (href: string) =>
    setExpanded((prev) => ({ ...prev, [href]: !prev[href] }));

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
            {GROUPS.map((g) => (
              <div key={g.id} className="mt-4 first:mt-0">
                <h4 className="px-3 pb-1 text-caption text-t3">{g.label}</h4>
                <ul className="grid gap-0.5">
                  {SECTIONS.filter((s) => s.group === g.id).map((s) => {
                    const active =
                      pathname === s.href ||
                      pathname.startsWith(`${s.href}/`);
                    const isMenu = MENU_HREFS.has(s.href);
                    const rows = isMenu ? rowsFor(s.href, menus) : [];
                    return (
                      <li key={s.href}>
                        <div className="flex items-center">
                          <Link
                            href={s.href}
                            onClick={close}
                            aria-current={active ? "page" : undefined}
                            className={`flex flex-1 items-center gap-1.5 rounded-lg px-3 py-2 text-body ${
                              active
                                ? "font-semibold text-ac"
                                : "text-t2 hover:bg-s3 hover:text-t1"
                            }`}
                          >
                            {s.label}
                            {s.badge && (
                              <Badge
                                size="sm"
                                variant={
                                  s.badge === "New" ? "default" : "secondary"
                                }
                              >
                                {s.badge}
                              </Badge>
                            )}
                          </Link>
                          {isMenu && (
                            <button
                              type="button"
                              aria-label={`${s.label} submenu`}
                              aria-expanded={!!expanded[s.href]}
                              onClick={() => toggle(s.href)}
                              className="rounded-lg p-2 text-t3 hover:bg-s3 hover:text-t1"
                            >
                              <Icon
                                d={SECTION_ICONS.chevronDown}
                                className={`h-3.5 w-3.5 transition-transform duration-200 ease-out motion-reduce:transition-none ${
                                  expanded[s.href] ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                          )}
                        </div>
                        {isMenu && expanded[s.href] && (
                          <ul className="mb-1 grid gap-0.5 pl-3">
                            {rows.map((row) => (
                              <li key={row.href}>
                                <RowLink row={row} onNavigate={close} />
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
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
