"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavigationMenu } from "@base-ui/react/navigation-menu";
import {
  Fragment,
  useCallback,
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
import type { MenuRow, NavMenus, TwoColumnMenu } from "./navMenus";
import { SECTIONS } from "./sections";
import { Badge } from "@/components/ui/badge";
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

type Capsule = {
  x: number;
  w: number;
  h: number;
  visible: boolean;
  /** First paint at a new spot runs without transitions so the capsule never slides in from x=0. */
  instant: boolean;
};

/** One dropdown row: icon tile + title + description (+ badge). */
function MenuRowLink({ row }: { row: MenuRow }) {
  return (
    <li>
      <NavigationMenu.Link
        render={<Link href={row.href} />}
        className="group/row flex items-center gap-3 rounded-lg p-2 text-left hover:bg-s3 focus-visible:bg-s3"
      >
        <span className="relative flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-s3 text-t2">
          {row.badge && (
            <Badge
              size="sm"
              variant={row.badge === "New" ? "default" : "secondary"}
              className="absolute -top-1.5 -left-1.5"
            >
              {row.badge}
            </Badge>
          )}
          {row.icon && <Icon d={SECTION_ICONS[row.icon]} className="h-4 w-4" />}
        </span>
        <span className="min-w-0">
          <b className="flex items-center gap-1.5 text-body font-semibold text-t1">
            {row.title}
          </b>
          <span className="block truncate text-caption text-t3">
            {row.description}
          </span>
        </span>
      </NavigationMenu.Link>
    </li>
  );
}

/** Image/Video dropdown: Features + Models columns (~720px). */
function TwoColumnPanel({ menu }: { menu: TwoColumnMenu }) {
  return (
    <div className="grid max-h-[calc(100dvh-96px)] w-[720px] max-w-[calc(100vw-24px)] grid-cols-2 gap-x-2 overflow-y-auto p-3">
      <div>
        <h4 className="mb-1.5 px-2 text-caption text-t3">Features</h4>
        <ul className="grid gap-0.5">
          {menu.features.map((row) => (
            <MenuRowLink key={row.title} row={row} />
          ))}
        </ul>
      </div>
      <div>
        <h4 className="mb-1.5 px-2 text-caption text-t3">Models</h4>
        <ul className="grid gap-0.5">
          {menu.models.map((row) => (
            <MenuRowLink key={row.title} row={row} />
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Camera moves dropdown: 2-column grid of preset thumbs. */
function CameraPanel({ items }: { items: MenuRow[] }) {
  return (
    <div className="grid w-[720px] max-w-[calc(100vw-24px)] grid-cols-2 gap-1 p-3">
      {items.map((row) => (
        <NavigationMenu.Link
          key={row.href}
          render={<Link href={row.href} />}
          className="group/row flex items-center gap-3 rounded-lg p-2 text-left hover:bg-s3 focus-visible:bg-s3"
        >
          {row.thumb && (
            <img
              src={row.thumb}
              alt=""
              className="aspect-video w-32 flex-none rounded-lg border border-line object-cover"
            />
          )}
          <span className="min-w-0 self-center">
            <b className="block truncate text-body font-semibold text-t1">
              {row.title}
            </b>
            <span className="block truncate text-caption text-t3">
              {row.description}
            </span>
          </span>
        </NavigationMenu.Link>
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
  const mainRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const itemEls = useRef(new Map<string, HTMLElement>());
  const lastHover = useRef<HTMLElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  // Slim on every page except Explore, where it stays scroll-driven.
  const compact = pathname !== "/" || scrolled;
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [capsule, setCapsule] = useState<Capsule>({
    x: 0,
    w: 0,
    h: 0,
    visible: false,
    instant: true,
  });

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

  const showCapsule = useCallback((el: HTMLElement) => {
    lastHover.current = el;
    const box = { x: el.offsetLeft, w: el.offsetWidth, h: el.offsetHeight };
    setCapsule((prev) =>
      prev.visible
        ? { ...box, visible: true, instant: false }
        : { ...box, visible: true, instant: true },
    );
    // Next frame: transitions back on, so moves between items slide.
    requestAnimationFrame(() =>
      setCapsule((prev) => (prev.instant ? { ...prev, instant: false } : prev)),
    );
  }, []);

  const hideCapsule = useCallback(() => {
    setCapsule((prev) => ({ ...prev, visible: false }));
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
          value={openMenu}
          onValueChange={(value) => {
            setOpenMenu(value);
            if (value != null) {
              const el = itemEls.current.get(value);
              if (el) showCapsule(el);
            } else {
              const el = lastHover.current;
              if (el && el.matches(":hover")) showCapsule(el);
              else hideCapsule();
            }
          }}
          onWheel={(e) => {
            // A plain mouse wheel only sends deltaY; turn it into a sideways scroll.
            if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
            e.currentTarget.scrollLeft += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
          }}
          className="hidden min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)] md:block [&::-webkit-scrollbar]:hidden"
        >
          <div className="relative w-max min-w-full">
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute top-0 left-0 rounded-lg bg-s3 ${
                capsule.instant
                  ? "transition-none"
                  : "transition-[transform,width,height,opacity] duration-200 ease-out motion-reduce:transition-none"
              }`}
              style={{
                transform: `translateX(${capsule.x}px)`,
                width: capsule.w,
                height: capsule.h,
                opacity: capsule.visible ? 1 : 0,
              }}
            />
            <NavigationMenu.List
              className="flex list-none gap-0.5 p-0"
              onPointerLeave={() => {
                if (openMenu == null) hideCapsule();
              }}
            >
              {GROUPS.map((g, gi) => (
                <Fragment key={g}>
                  {gi > 0 && (
                    <li
                      aria-hidden="true"
                      className="mx-1.5 h-4 w-px shrink-0 self-center bg-line"
                    />
                  )}
                  {SECTIONS.filter((s) => s.group === g).map((s) => {
                    const active = isActive(pathname, s.href);
                    const isMenu = MENU_HREFS.has(s.href);
                    return (
                      <NavigationMenu.Item
                        key={s.href}
                        value={s.href}
                        ref={(el: HTMLElement | null) => {
                          if (el) itemEls.current.set(s.href, el);
                          else itemEls.current.delete(s.href);
                        }}
                        className="relative z-10 flex h-9 shrink-0 items-stretch group-data-[compact=true]:h-7"
                        onPointerEnter={(e: { currentTarget: HTMLElement }) =>
                          showCapsule(e.currentTarget)
                        }
                        onFocus={() => {
                          const el = itemEls.current.get(s.href);
                          if (el) showCapsule(el);
                        }}
                      >
                        {isMenu ? (
                          <>
                            <NavigationMenu.Trigger
                              className={`flex h-full items-center gap-1.5 px-3 text-body whitespace-nowrap ${GROW} ${
                                active
                                  ? "font-semibold text-ac"
                                  : "text-t3 hover:text-t1"
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
                            aria-current={active ? "page" : undefined}
                            className={`flex h-full items-center px-3 text-body whitespace-nowrap ${GROW} ${
                              active
                                ? "font-semibold text-ac"
                                : "text-t3 hover:text-t1"
                            }`}
                          >
                            {s.label}
                            {s.badge && (
                              <Badge
                                size="sm"
                                variant={
                                  s.badge === "New" ? "default" : "secondary"
                                }
                                className="ml-1.5"
                              >
                                {s.badge}
                              </Badge>
                            )}
                          </NavigationMenu.Link>
                        )}
                      </NavigationMenu.Item>
                    );
                  })}
                </Fragment>
              ))}
            </NavigationMenu.List>
          </div>
          <NavigationMenu.Portal>
            <NavigationMenu.Positioner
              sideOffset={8}
              className="nav-positioner z-50"
            >
              <NavigationMenu.Popup className="nav-popup rounded-2xl border border-line bg-s2">
                <NavigationMenu.Viewport className="relative h-full w-full overflow-hidden" />
              </NavigationMenu.Popup>
            </NavigationMenu.Positioner>
          </NavigationMenu.Portal>
        </NavigationMenu.Root>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <MobileNav menus={menus} />
          <CloudStatus />
          {stars != null && (
            <a
              href="https://github.com/screen-gd/phaino"
              target="_blank"
              rel="noreferrer"
              aria-label={`${stars} stars on GitHub`}
              className="hidden items-center gap-1.5 rounded-full border border-line px-2.5 py-1.5 text-t3 hover:text-t1 md:flex"
            >
              <GitHubIcon className="h-4 w-4" />
              <span className="font-mono text-caption">
                {formatStars(stars)}
              </span>
            </a>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="GitHub"
            className={`text-t3 hover:text-t1 ${stars != null ? "md:hidden" : ""}`}
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
