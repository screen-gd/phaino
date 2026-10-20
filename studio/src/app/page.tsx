import Link from "next/link";
import { CloudPromo } from "@/components/CloudPromo";
import { CommunityGrid } from "@/components/CommunityGrid";
import { ExploreBanner } from "@/components/ExploreBanner";
import { Icon, SECTION_ICONS, type IconName } from "@/components/icons";
import { ExploreCarousel } from "@/components/ExploreCarousel";
import { ExploreFooter } from "@/components/ExploreFooter";
import { presetPreview } from "@/lib/preset-preview";
import { EXPLORE_MEDIA } from "@/lib/explore-media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toStudioModels } from "@/server/models/view";
import { getPreset, listPresets } from "@/server/presets/load";
import { miniGraph, type MiniGraph } from "@/server/presets/miniGraph";
import type { Preset } from "@/server/presets/schema";

export const dynamic = "force-dynamic";

const TOOLS = [
  { href: "/camera", name: "Camera moves", kind: "Video", badge: "New", desc: "7 moves on LTX 2.5", icon: "camera" },
  { href: "/image", name: "Image", kind: "Image", badge: null, desc: "FLUX 3 Klein, Qwen, Z-Image", icon: "image" },
  { href: "/video", name: "Video", kind: "Video", badge: null, desc: "LTX 2.5, Wan 2.2, HunyuanVideo, MiniMax H3", icon: "video" },
  { href: "/effects", name: "Effects", kind: "Video", badge: "Soon", desc: "One-click VFX", icon: "effects" },
  { href: "/characters", name: "Characters", kind: "Image", badge: "Soon", desc: "Consistent characters", icon: "characters" },
  { href: "/avatars", name: "Avatars", kind: "Video", badge: "Soon", desc: "Lipsync", icon: "avatars" },
  { href: "/edit", name: "Edit", kind: "Image", badge: "Soon", desc: "Upscale and inpaint", icon: "edit" },
  { href: "/audio", name: "Audio", kind: "Audio", badge: "Soon", desc: "Music and sound effects", icon: "audio" },
  { href: "/editor", name: "Editor", kind: null, badge: "New", desc: "Cut, titles and music", icon: "export" },
] as const satisfies readonly {
  href: string;
  name: string;
  kind: string | null;
  badge: "New" | "Soon" | null;
  desc: string;
  icon: IconName;
}[];

/** Section heading: expanded accent title, optional subtitle and action buttons. */
function SectionHead({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: string;
  actions?: readonly { label: string; href: string; accent?: boolean }[];
}) {
  return (
    <div className="mt-8 mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display font-extrabold uppercase text-h3 tracking-tight text-ac font-stretch-[112.5%]">
          {title}
        </h2>
        {sub && <p className="mt-1.5 text-caption text-t3">{sub}</p>}
      </div>
      {actions && (
        <div className="flex gap-2">
          {actions.map((a) => (
            <Button
              key={a.label}
              size="lg"
              variant={a.accent ? "default" : "outline"}
              render={<Link href={a.href} />}
            >
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Small tool tile: icon and kind chip on top, name, badge and description below. */
function ToolTile({ tool }: { tool: (typeof TOOLS)[number] }) {
  return (
    <Link
      href={tool.href}
      className="flex min-h-24 flex-col justify-between rounded-xl border border-line bg-s2 p-3 hover:border-[#3a3a3a] hover:bg-s3"
    >
      <div className="flex items-center justify-between">
        <Icon d={SECTION_ICONS[tool.icon]} className="h-5 w-5 text-t2" />
        {tool.kind && <Badge variant="outline">{tool.kind}</Badge>}
      </div>
      <div>
        <b className="text-body font-semibold">
          {tool.name}
          {tool.badge && (
            <Badge
              size="sm"
              variant={tool.badge === "New" ? "default" : "secondary"}
              className="ml-1.5 align-middle"
            >
              {tool.badge}
            </Badge>
          )}
        </b>
        <span className="mt-0.5 block text-caption text-t3">{tool.desc}</span>
      </div>
    </Link>
  );
}

/** The whole preset card opens its studio with the preset selected. */
function PresetCard({ preset, mini }: { preset: Preset; mini: MiniGraph | null }) {
  const tryHref = `/${preset.category}?preset=${preset.id}`;
  const imageIn = preset.inputs.some((i) => i.required && i.key === "image");
  const outKind = preset.outputs[0]?.kind ?? "video";
  const inLabel = imageIn ? "Image" : "Text";
  const outLabel = outKind === "image" ? "Image" : "Video";
  return (
    <Link href={tryHref} aria-label={`Try ${preset.name}`} className="group relative block aspect-video overflow-hidden rounded-xl border border-line bg-s3 focus-visible:outline-2 focus-visible:outline-ac">
      <img
        src={presetPreview(preset)}
        alt=""
        className="h-full w-full object-cover"
      />
      {mini && (
        <svg
          aria-hidden="true"
          viewBox={`0 0 1 ${(1 / mini.aspect).toFixed(3)}`}
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full bg-black/75 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {mini.links.map(([x1, y1, x2, y2], i) => (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#555"
              strokeWidth={0.002}
            />
          ))}
          {mini.nodes.map((n, i) => (
            <rect
              key={i}
              x={n.x}
              y={n.y}
              width={n.w}
              height={n.h}
              rx={0.004}
              fill="none"
              stroke={n.bound ? "#FF5B22" : "#3a3a3a"}
              strokeWidth={0.002}
            />
          ))}
        </svg>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-black/80 to-transparent" />
      {preset.chip && (
        <Badge
          variant="secondary"
          className="pointer-events-none absolute top-2 left-2 bg-black/70 font-mono text-t2"
        >
          {preset.chip}
        </Badge>
      )}
      <Badge
        variant="secondary"
        className="pointer-events-none absolute top-2 right-2 font-mono bg-black/70 text-t2"
      >
        {preset.model.label}
      </Badge>
      <b className="pointer-events-none absolute bottom-2.5 left-3 text-body font-semibold">
        {preset.name}
      </b>
      <span
        aria-label={`${inLabel} to ${outLabel}`}
        className="pointer-events-none absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-t2"
      >
        <Icon d={imageIn ? SECTION_ICONS.image : SECTION_ICONS.pencil} className="h-3 w-3" />
        <Icon d={SECTION_ICONS.chevronRight} className="h-2.5 w-2.5 text-t3" />
        <Icon d={outKind === "image" ? SECTION_ICONS.image : SECTION_ICONS.video} className="h-3 w-3" />
      </span>
    </Link>
  );
}

export default function Home() {
  // Trending stays on folder presets; template-backed modes appear on
  // /workflows and in the model pickers.
  const catalog = listPresets().filter((p) => p.origin !== "model");
  const models = [
    ...toStudioModels("image"),
    ...toStudioModels("video"),
  ];

  const minis = new Map<string, MiniGraph | null>();
  for (const p of catalog) {
    try {
      const loaded = getPreset(p.id);
      minis.set(p.id, loaded ? miniGraph(loaded.preset, loaded.workflowUi) : null);
    } catch {
      minis.set(p.id, null);
    }
  }

  const presets = catalog.slice(0, 8);

  return (
    <div className="px-3 pt-3 pb-10">
      <h1 className="sr-only">Explore</h1>

      <ExploreCarousel />

      <div className="mt-8 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <CloudPromo />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TOOLS.map((t) => (
            <ToolTile key={t.href} tool={t} />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <ExploreBanner />
      </div>

      <SectionHead
        title="Trending presets"
        sub="Camera moves on LTX 2.5, images on FLUX 3 Klein"
        actions={[
          { label: "Start generating", href: "/camera", accent: true },
          { label: "All workflows", href: "/workflows" },
        ]}
      />
      {presets.length === 0 ? (
        <p className="text-t3">No presets yet</p>
      ) : (
        <div className="relative">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {presets.map((p) => (
              <PresetCard key={p.id} preset={p} mini={minis.get(p.id) ?? null} />
            ))}
          </div>
          {presets.length > 4 && (
            <>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[48%] bg-linear-to-b from-transparent via-black/70 to-black" />
              <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center">
                <Button
                  variant="secondary"
                  size="lg"
                  className="pointer-events-auto"
                  render={<Link href="/workflows" />}
                >
                  View all presets
                  <Icon d={SECTION_ICONS.arrowUpRight} />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      <SectionHead
        title="Made with Comfy"
        actions={[{ label: "See the showcase", href: "/community" }]}
      />
      <CommunityGrid items={EXPLORE_MEDIA.slice(0, 8)} />
      <ExploreFooter presets={catalog} models={models} />
    </div>
  );
}
