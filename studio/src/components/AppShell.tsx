"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavigationMenu } from "@base-ui/react/navigation-menu";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CloudStatus } from "./CloudStatus";
import { MobileNav } from "./MobileNav";
import { GitHubIcon, Icon, SECTION_ICONS } from "./icons";
import { formatStars } from "@/lib/stars";
import { PhainoMark } from "./Logo";
import { featuresIn } from "@/lib/features";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { useDemo } from "./DemoProvider";
import { DemoNotice } from "./DemoNotice";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const GROW =
  "transition-[height,padding,font-size] duration-200 ease-out motion-reduce:transition-none";

const CREATE_FEATURES = featuresIn("create");
const PRIMARY_FEATURES = featuresIn("primary");
/** Create dropdown: the create features with icon, description and status. */
function CreatePanel() {
  return (
    <ul className="grid w-[320px] max-w-[calc(100vw-24px)] gap-0.5 p-2">
      {CREATE_FEATURES.map((f) => (
        <li key={f.id}>
          <NavigationMenu.Link
            render={<Link href={f.href} />}
            closeOnClick
            className="flex items-center gap-2.5 rounded-lg p-2 text-left hover:bg-s3 focus-visible:bg-s3"
          >
            <span className="flex h-4 w-4 flex-none items-center justify-center text-t3">
              <Icon d={SECTION_ICONS[f.icon]} className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-body font-medium text-t1">
                {f.label}
                <StatusBadge status={f.status} />
              </span>
              <span className="block truncate text-caption text-t3">
                {f.description}
              </span>
            </span>
          </NavigationMenu.Link>
        </li>
      ))}
    </ul>
  );
}

export function AppShell({
  children,
  stars,
}: {
  children: ReactNode;
  stars?: number | null;
}) {
  const demo = useDemo();
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  // Slim on every page except Explore, where it stays scroll-driven.
  const compact = pathname !== "/" || scrolled;
  const createActive = CREATE_FEATURES.some((f) =>
    isActive(pathname, f.href),
  );

  useEffect(() => {
    const root = mainRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { root },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`grid h-dvh grid-cols-[minmax(0,1fr)] ${demo.enabled ? "grid-rows-[auto_auto_minmax(0,1fr)]" : "grid-rows-[auto_minmax(0,1fr)]"}`}>
      <header
        data-compact={compact}
        className={`group flex h-14 items-center gap-3 bg-bg px-3 ${GROW} data-[compact=true]:h-9`}
      >
        <Link
          href="/"
          aria-label="Phaino home"
          className={`mr-1 flex shrink-0 items-center gap-2 font-wordmark text-xl font-bold tracking-tight group-data-[compact=true]:text-base ${GROW}`}
        >
          <PhainoMark className="h-5 w-5 text-ac transition-[height,width] duration-200 ease-out motion-reduce:transition-none group-data-[compact=true]:h-4 group-data-[compact=true]:w-4" />
          Phaino
        </Link>
        <NavigationMenu.Root
          aria-label="Sections"
          closeDelay={150}
          onWheel={(e) => {
            // A plain mouse wheel only sends deltaY; turn it into a sideways scroll.
            if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
            e.currentTarget.scrollLeft += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
          }}
          className="hidden min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)] md:block [&::-webkit-scrollbar]:hidden"
        >
          <div className="relative w-max min-w-full">
            <NavigationMenu.List className="flex list-none gap-0.5 p-0">
              <NavigationMenu.Item
                value="create"
                className="relative z-10 flex h-9 shrink-0 items-stretch group-data-[compact=true]:h-7"
              >
                <NavigationMenu.Trigger
                  className={`flex h-full items-center gap-1.5 px-3 font-wordmark font-semibold text-body whitespace-nowrap ${GROW} ${
                    createActive
                      ? "text-ac"
                      : "text-t2 hover:text-t1 data-[popup-open]:text-t1"
                  }`}
                >
                  Create
                  <NavigationMenu.Icon className="flex items-center transition-transform duration-200 ease-out motion-reduce:transition-none data-[popup-open]:rotate-180">
                    <Icon
                      d={SECTION_ICONS.chevronDown}
                      className="h-3 w-3"
                    />
                  </NavigationMenu.Icon>
                </NavigationMenu.Trigger>
                <NavigationMenu.Content className="nav-content">
                  <CreatePanel />
                </NavigationMenu.Content>
              </NavigationMenu.Item>
              {PRIMARY_FEATURES.map((f) => {
                const active = isActive(pathname, f.href);
                return (
                  <NavigationMenu.Item
                    key={f.id}
                    value={f.id}
                    className="relative z-10 flex h-9 shrink-0 items-stretch group-data-[compact=true]:h-7"
                  >
                    <NavigationMenu.Link
                      render={<Link href={f.href} />}
                      closeOnClick
                      aria-current={active ? "page" : undefined}
                      className={`flex h-full items-center px-3 font-wordmark font-semibold text-body whitespace-nowrap ${GROW} ${
                        active
                          ? "text-ac"
                          : "text-t2 hover:text-t1"
                      }`}
                    >
                      {f.label}
                      <StatusBadge status={f.status} className="ml-1.5" />
                    </NavigationMenu.Link>
                  </NavigationMenu.Item>
                );
              })}
            </NavigationMenu.List>
          </div>
          <NavigationMenu.Portal>
            <NavigationMenu.Positioner
              sideOffset={8}
              className="nav-positioner z-50"
            >
              <NavigationMenu.Popup
                className="nav-popup rounded-2xl border border-line bg-s2"
              >
                <NavigationMenu.Viewport className="relative h-full w-full overflow-hidden" />
              </NavigationMenu.Popup>
            </NavigationMenu.Positioner>
          </NavigationMenu.Portal>
        </NavigationMenu.Root>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <MobileNav />
          <CloudStatus />
          <a
            href="https://github.com/screen-gd/phaino"
            target="_blank"
            rel="noreferrer"
            aria-label={stars ? `${stars} stars on GitHub` : "Star on GitHub"}
            className="hidden items-center gap-1.5 rounded-full border border-line px-2.5 py-1.5 text-t3 hover:text-t1 md:flex"
          >
            <GitHubIcon className="h-4 w-4" />
            <span className="font-mono text-caption">
              {stars ? formatStars(stars) : "Star on GitHub"}
            </span>
          </a>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="GitHub"
            className="text-t3 hover:text-t1 md:hidden"
            render={
              <a
                href="https://github.com/screen-gd/phaino"
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            <GitHubIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Settings"
            className={
              isActive(pathname, "/settings")
                ? "text-ac"
                : "text-t2 hover:text-t1"
            }
            render={<Link href="/settings" />}
          >
            <Icon d={SECTION_ICONS.settings} className="h-[18px] w-[18px]" />
          </Button>
        </div>
      </header>

      {demo.enabled && <DemoNotice />}
      <main ref={mainRef} className="relative min-h-0 overflow-auto">
        <div ref={sentinelRef} aria-hidden="true" className="pointer-events-none absolute top-0 h-2 w-px" />
        {children}
      </main>
    </div>
  );
}
