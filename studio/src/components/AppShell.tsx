"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavigationMenu } from "@base-ui/react/navigation-menu";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CloudStatus } from "./CloudStatus";
import { MobileNav } from "./MobileNav";
import { GitHubIcon, Icon, SECTION_ICONS } from "./icons";
import { formatStars } from "@/lib/stars";
import { featureById } from "@/lib/features";
import { PhainoMark } from "./Logo";
import type { MenuRow, NavMenus, TwoColumnMenu } from "./navMenus";
import { SECTIONS } from "./sections";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { useDemo } from "./DemoProvider";
import { DemoNotice } from "./DemoNotice";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const GROUPS = ["core", "studio"] as const;
const MENU_HREFS = new Set(["/image", "/video", "/camera"]);

const GROW =
  "transition-[height,padding,font-size] duration-200 ease-out motion-reduce:transition-none";

/** One Features row: 16px icon + title, 36px tall. Soon rows stay muted. */
function FeatureRowLink({ row }: { row: MenuRow }) {
  const soon = row.status === "soon";
  return (
    <li>
      <NavigationMenu.Link
        render={<Link href={row.href} />}
        closeOnClick
        className={`flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-left text-body ${
          soon
            ? "text-t3 hover:text-t2"
            : "text-t2 hover:bg-s3 hover:text-t1 focus-visible:bg-s3 focus-visible:text-t1"
        }`}
      >
        <span className="flex h-4 w-4 flex-none items-center justify-center text-t3">
          {row.icon && <Icon d={SECTION_ICONS[row.icon]} className="h-4 w-4" />}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{row.title}</span>
          {row.status && <StatusBadge status={row.status} />}
        </span>
      </NavigationMenu.Link>
    </li>
  );
}

/** One Models row: title only, 32px tall. */
function ModelRowLink({ row }: { row: MenuRow }) {
  return (
    <li>
      <NavigationMenu.Link
        render={<Link href={row.href} />}
        closeOnClick
        className="flex h-8 items-center rounded-lg px-2.5 text-body text-t2 hover:bg-s3 hover:text-t1 focus-visible:bg-s3 focus-visible:text-t1"
      >
        <span className="truncate">{row.title}</span>
      </NavigationMenu.Link>
    </li>
  );
}

/** Image/Video dropdown: compact Features + Models columns. */
function TwoColumnPanel({ menu }: { menu: TwoColumnMenu }) {
  const models = menu.models.slice(0, 8);
  return (
    <div className="grid max-h-[420px] w-[520px] max-w-[calc(100vw-24px)] grid-cols-[180px_1fr] gap-x-2 overflow-y-auto p-3">
      <div>
        <h4 className="mb-1 px-2 text-caption text-t3">Features</h4>
        <ul className="grid gap-0.5">
          {menu.features.map((row) => (
            <FeatureRowLink key={row.title} row={row} />
          ))}
        </ul>
      </div>
      <div>
        <h4 className="mb-1 px-2 text-caption text-t3">Models</h4>
        <ul className="grid gap-0.5">
          {models.map((row) => (
            <ModelRowLink key={row.title} row={row} />
          ))}
          {menu.models.length > models.length && (
            <ModelRowLink
              row={{ title: "All models", href: "/workflows", description: "" }}
            />
          )}
        </ul>
      </div>
    </div>
  );
}

/** Camera moves dropdown: 2-column grid of compact thumb rows. */
function CameraPanel({ items }: { items: MenuRow[] }) {
  return (
    <div className="grid w-[520px] max-w-[calc(100vw-24px)] grid-cols-2 gap-1 p-3">
      {items.map((row) => (
        <NavigationMenu.Link
          key={row.href}
          render={<Link href={row.href} />}
          closeOnClick
          className="group/row flex items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-s3 focus-visible:bg-s3"
        >
          {row.thumb && (
            <img
              src={row.thumb}
              alt=""
              className="aspect-video w-16 flex-none rounded-md border border-line object-cover"
            />
          )}
          <span className="min-w-0 self-center">
            <b className="block truncate text-body font-semibold text-t1">
              {row.title}
            </b>
          </span>
        </NavigationMenu.Link>
      ))}
    </div>
  );
}

/** One "More" row: icon, title and badge, description below. */
function MoreRowLink({ row }: { row: MenuRow }) {
  const soon = row.status === "soon";
  return (
    <li>
      <NavigationMenu.Link
        render={<Link href={row.href} />}
        closeOnClick
        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-body ${
          soon
            ? "text-t3 hover:text-t2"
            : "text-t2 hover:bg-s3 hover:text-t1 focus-visible:bg-s3 focus-visible:text-t1"
        }`}
      >
        <span className="flex h-4 w-4 flex-none items-center justify-center text-t3">
          {row.icon && <Icon d={SECTION_ICONS[row.icon]} className="h-4 w-4" />}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate">{row.title}</span>
            {row.status && <StatusBadge status={row.status} />}
          </span>
          <span className="block truncate text-caption text-t3">
            {row.description}
          </span>
        </span>
      </NavigationMenu.Link>
    </li>
  );
}

/** The "More" dropdown: a compact column of the overflow sections. */
function MorePanel({ items }: { items: MenuRow[] }) {
  return (
    <div className="grid w-[300px] max-w-[calc(100vw-24px)] gap-0.5 p-3">
      {items.map((row) => (
        <MoreRowLink key={row.href} row={row} />
      ))}
    </div>
  );
}

function menuContent(href: string, menus: NavMenus): ReactNode {
  if (href === "/image") return <TwoColumnPanel menu={menus.image} />;
  if (href === "/video") return <TwoColumnPanel menu={menus.video} />;
  if (href === "/camera") return <CameraPanel items={menus.camera} />;
  return null;
}

export function AppShell({
  children,
  menus,
  stars,
}: {
  children: ReactNode;
  menus: NavMenus;
  stars?: number | null;
}) {
  const demo = useDemo();
  const pathname = usePathname();
  const moreRows: MenuRow[] = SECTIONS.filter((s) => s.group === "more").map(
    (s) => {
      const feature = s.id ? featureById(s.id) : undefined;
      return {
        href: s.href,
        title: s.label,
        description: feature?.description ?? "",
        icon: feature?.icon,
        status: s.status,
      };
    },
  );
  const moreActive = SECTIONS.some(
    (s) => s.group === "more" && s.status !== "soon" && isActive(pathname, s.href),
  );
  const mainRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  // Slim on every page except Explore, where it stays scroll-driven.
  const compact = pathname !== "/" || scrolled;

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
              {GROUPS.map((g, gi) => (
                <Fragment key={g}>
                  {gi > 0 && (
                    <li
                      aria-hidden="true"
                      className="mx-1.5 h-4 w-px shrink-0 self-center bg-line"
                    />
                  )}
                  {SECTIONS.filter((s) => s.group === g).map((s) => {
                    const soon = s.status === "soon";
                    const active = !soon && isActive(pathname, s.href);
                    const isMenu = MENU_HREFS.has(s.href);
                    return (
                      <NavigationMenu.Item
                        key={s.label}
                        value={s.label}
                        className="relative z-10 flex h-9 shrink-0 items-stretch group-data-[compact=true]:h-7"
                      >
                        {isMenu ? (
                          <>
                            <NavigationMenu.Trigger
                              className={`flex h-full items-center gap-1.5 px-3 font-wordmark font-semibold text-body whitespace-nowrap ${GROW} ${
                                active
                                  ? "text-ac"
                                  : "text-t2 hover:text-t1 data-[popup-open]:text-t1"
                              }`}
                            >
                              {s.label}
                              {s.status && <StatusBadge status={s.status} />}
                              <NavigationMenu.Icon className="flex items-center transition-transform duration-200 ease-out motion-reduce:transition-none data-[popup-open]:rotate-180">
                                <Icon
                                  d={SECTION_ICONS.chevronDown}
                                  className="h-3 w-3"
                                />
                              </NavigationMenu.Icon>
                            </NavigationMenu.Trigger>
                            <NavigationMenu.Content className="nav-content">
                              {menuContent(s.href, menus)}
                            </NavigationMenu.Content>
                          </>
                        ) : (
                          <NavigationMenu.Link
                            render={<Link href={s.href} />}
                            closeOnClick
                            aria-current={active ? "page" : undefined}
                            className={`flex h-full items-center px-3 font-wordmark font-semibold text-body whitespace-nowrap ${GROW} ${
                              soon
                                ? "text-t3 hover:text-t2"
                                : active
                                  ? "text-ac"
                                  : "text-t2 hover:text-t1"
                            }`}
                          >
                            {s.label}
                            {s.status && (
                              <StatusBadge
                                status={s.status}
                                className="ml-1.5"
                              />
                            )}
                          </NavigationMenu.Link>
                        )}
                      </NavigationMenu.Item>
                    );
                  })}
                </Fragment>
              ))}
              <li
                aria-hidden="true"
                className="mx-1.5 h-4 w-px shrink-0 self-center bg-line"
              />
              <NavigationMenu.Item
                value="More"
                className="relative z-10 flex h-9 shrink-0 items-stretch group-data-[compact=true]:h-7"
              >
                <NavigationMenu.Trigger
                  className={`flex h-full items-center gap-1.5 px-3 font-wordmark font-semibold text-body whitespace-nowrap ${GROW} ${
                    moreActive
                      ? "text-ac"
                      : "text-t2 hover:text-t1 data-[popup-open]:text-t1"
                  }`}
                >
                  More
                  <NavigationMenu.Icon className="flex items-center transition-transform duration-200 ease-out motion-reduce:transition-none data-[popup-open]:rotate-180">
                    <Icon d={SECTION_ICONS.chevronDown} className="h-3 w-3" />
                  </NavigationMenu.Icon>
                </NavigationMenu.Trigger>
                <NavigationMenu.Content className="nav-content">
                  <MorePanel items={moreRows} />
                </NavigationMenu.Content>
              </NavigationMenu.Item>
            </NavigationMenu.List>
          </div>
          <NavigationMenu.Portal>
            <NavigationMenu.Positioner
              sideOffset={8}
              className="nav-positioner z-50"
            >
              <NavigationMenu.Popup
                className="nav-popup rounded-2xl border border-line bg-s1"
              >
                <NavigationMenu.Viewport className="relative h-full w-full overflow-hidden" />
              </NavigationMenu.Popup>
            </NavigationMenu.Positioner>
          </NavigationMenu.Portal>
        </NavigationMenu.Root>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <MobileNav menus={menus} />
          <CloudStatus />
          <a
            href="https://github.com/screen-gd/phaino"
            target="_blank"
            rel="noreferrer"
            aria-label={stars ? `${stars} stars on GitHub` : "Star on GitHub"}
            className="hidden items-center gap-1.5 rounded-full border border-line px-2.5 py-1.5 text-t3 hover:text-t1 min-[1600px]:flex"
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
            className="text-t3 hover:text-t1 md:flex min-[1600px]:hidden"
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
