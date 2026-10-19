"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BackendSwitch } from "./BackendSwitch";
import { GitHubIcon, Icon, SECTION_ICONS } from "./icons";
import { SECTIONS } from "./sections";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="grid h-dvh grid-cols-[64px_minmax(0,1fr)] grid-rows-[64px_minmax(0,1fr)]">
      <header className="col-span-2 flex items-center gap-3.5 border-b border-line bg-s1 pl-5 pr-3.5">
        <Link href="/camera" className="mr-1.5 text-xl font-bold tracking-[-0.03em]">
          cutaway
        </Link>
        <nav aria-label="Sections" className="flex flex-1 gap-0.5 overflow-x-auto">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              aria-current={isActive(pathname, s.href) ? "page" : undefined}
              className={`flex h-11 shrink-0 items-center rounded-full px-3 whitespace-nowrap ${
                isActive(pathname, s.href) ? "bg-s3 text-t1" : "text-t3 hover:text-t1"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <BackendSwitch />
          <a
            href="https://github.com/screen-gd/cutaway"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-line bg-s2 px-3.5 whitespace-nowrap hover:border-[#3a3a3a] hover:bg-s3"
          >
            <GitHubIcon />
            GitHub
          </a>
        </div>
      </header>

      <nav
        aria-label="Sections"
        className="flex flex-col items-center gap-1 overflow-y-auto border-r border-line bg-s1 py-3"
      >
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            aria-label={s.label}
            title={s.label}
            className={`grid h-11 w-11 place-items-center rounded-[14px] ${
              isActive(pathname, s.href)
                ? "bg-acs text-ac"
                : "text-t3 hover:bg-s2 hover:text-t1"
            }`}
          >
            <Icon d={SECTION_ICONS[s.icon]} />
          </Link>
        ))}
        <hr className="my-1.5 w-7 border-0 border-t border-line" />
        <Link
          href="/settings"
          aria-label="Settings"
          title="Settings"
          className={`grid h-11 w-11 place-items-center rounded-[14px] ${
            isActive(pathname, "/settings")
              ? "bg-acs text-ac"
              : "text-t3 hover:bg-s2 hover:text-t1"
          }`}
        >
          <Icon d={SECTION_ICONS.settings} />
        </Link>
      </nav>

      <main className="min-h-0 overflow-auto">{children}</main>
    </div>
  );
}
