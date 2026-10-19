import Link from "next/link";
import { CloudPromo } from "@/components/CloudPromo";
import { ExploreBanner } from "@/components/ExploreBanner";
import { Icon, SECTION_ICONS, type IconName } from "@/components/icons";
import { ToolPreview } from "@/components/ToolPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { communityFeedSchema, type CommunityFork } from "@/lib/community";
import { toolLoopUrl } from "@/server/media";
import { listPresets } from "@/server/presets/load";
import type { Preset } from "@/server/presets/schema";
import sampleFeed from "@/data/community.sample.json";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    title: "Camera moves",
    sub: "7 moves on LTX 2.5",
    href: "/camera",
    poster: "/explore/moves.webp",
    loop: "camera",
    soon: false,
  },
  {
    title: "Image",
    sub: "FLUX.2 Klein text to image",
    href: "/image",
    poster: "/explore/image.webp",
    loop: "image",
    soon: false,
  },
  {
    title: "Workflows",
    sub: "Every shot opens as a ComfyUI workflow",
    href: "/workflows",
    poster: "/api/presets/orbit/thumb",
    loop: null,
    soon: false,
  },
  {
    title: "Export",
    sub: "FCPXML and EDL for your editor",
    href: "/export",
    poster: "/explore/video.webp",
    loop: null,
    soon: true,
  },
] as const;

const TOOLS = [
  { href: "/camera", name: "Camera moves", kind: "Video", badge: "New", desc: "7 moves on LTX 2.5", icon: "camera" },
  { href: "/image", name: "Image", kind: "Image", badge: null, desc: "FLUX.2 Klein", icon: "image" },
  { href: "/video", name: "Video", kind: "Video", badge: null, desc: "Image or text to video on LTX 2.5", icon: "video" },
  { href: "/effects", name: "Effects", kind: "Video", badge: "Soon", desc: "One-click VFX", icon: "effects" },
  { href: "/characters", name: "Characters", kind: "Image", badge: "Soon", desc: "Consistent characters", icon: "characters" },
  { href: "/avatars", name: "Avatars", kind: "Video", badge: "Soon", desc: "Lipsync", icon: "avatars" },
  { href: "/edit", name: "Edit", kind: "Image", badge: "Soon", desc: "Upscale and inpaint", icon: "edit" },
  { href: "/audio", name: "Audio", kind: "Audio", badge: "Soon", desc: "Music and sound effects", icon: "audio" },
  { href: "/export", name: "Export", kind: null, badge: "Soon", desc: "FCPXML and EDL", icon: "export" },
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

/** Wide card in the bleeding feature scroller: media, title and subtitle. */
function FeatureCard({ feature }: { feature: (typeof FEATURES)[number] }) {
  return (
    <Link
      href={feature.href}
      className="w-[clamp(300px,28vw,440px)] flex-none snap-start"
    >
      <div className="relative">
        <ToolPreview
          poster={feature.poster}
          video={feature.loop ? toolLoopUrl(feature.loop) : null}
          className="aspect-video rounded-xl border border-line"
        />
        {feature.soon && (
          <Badge variant="secondary" className="absolute top-2 left-2">
            Soon
          </Badge>
        )}
      </div>
      <b className="mt-3 block font-display font-bold uppercase text-body font-stretch-[112.5%]">
        {feature.title}
      </b>
      <span className="block text-caption text-t3">{feature.sub}</span>
    </Link>
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

/** Preset thumb card: overlay Try link, badges, and Try/Workflow buttons above it. */
function PresetCard({ preset }: { preset: Preset }) {
  const partner = preset.model.license === "partner";
  const tryHref = `/${preset.category}?preset=${preset.id}`;
  return (
    <div className="group relative aspect-video overflow-hidden rounded-xl border border-line bg-s3">
      <Link href={tryHref} aria-label={`Try ${preset.name}`} className="absolute inset-0">
        <img
          src={`/api/presets/${preset.id}/thumb`}
          alt=""
          className="h-full w-full object-cover"
        />
      </Link>
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
        variant={partner ? "default" : "secondary"}
        className={`pointer-events-none absolute top-2 right-2 font-mono ${
          partner ? "" : "bg-black/70 text-t2"
        }`}
      >
        {preset.model.label}
      </Badge>
      <b className="pointer-events-none absolute bottom-2.5 left-3 text-body font-semibold">
        {preset.name}
      </b>
      <div className="absolute right-2.5 bottom-2 z-10 flex gap-1.5">
        <Button size="xs" render={<Link href={tryHref} />}>
          Try
        </Button>
        <Button
          size="xs"
          variant="secondary"
          render={<Link href={`/workflows/${preset.id}`} />}
        >
          Workflow
        </Button>
      </div>
    </div>
  );
}

/** Community fork card: image, Run/Fork buttons, author row and fork count. */
function ForkCard({ fork }: { fork: CommunityFork }) {
  const runHref = `/camera?preset=${fork.presetId}`;
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-line bg-s3">
      <Link href={runHref} aria-label={`Run ${fork.title}`} className="absolute inset-0">
        <img src={fork.thumb} alt="" className="h-full w-full object-cover" />
      </Link>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-black/80 to-transparent" />
      <div className="absolute top-2 right-2 z-10 flex gap-1.5">
        <Button size="xs" render={<Link href={runHref} />}>
          Run
        </Button>
        <Button
          size="xs"
          variant="secondary"
          render={<Link href={`/workflows/${fork.presetId}`} />}
        >
          Fork
        </Button>
      </div>
      <div className="pointer-events-none absolute bottom-2.5 left-3">
        <b className="block text-body font-semibold">{fork.title}</b>
        <span className="mt-1 flex items-center gap-1.5 text-caption text-t2">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-s3 text-caption font-semibold uppercase">
            {fork.handle.replace(/^@/, "").charAt(0)}
          </span>
          {fork.handle}
        </span>
      </div>
      <Badge
        variant="secondary"
        className="pointer-events-none absolute right-2.5 bottom-2.5 bg-black/70 font-mono text-t2"
      >
        <Icon d={SECTION_ICONS.fork} className="size-3.5" />
        {fork.forkCount}
      </Badge>
    </div>
  );
}

export default function Home() {
  const presets = listPresets().slice(0, 8);
  const feed = communityFeedSchema.parse(sampleFeed);

  return (
    <div className="px-3 pt-3 pb-10">
      <h1 className="sr-only">Explore</h1>

      <div className="-mr-3 flex snap-x gap-2 overflow-x-auto pr-3 [scrollbar-width:thin]">
        {FEATURES.map((f) => (
          <FeatureCard key={f.href} feature={f} />
        ))}
      </div>

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
        sub="Camera moves on LTX 2.5, images on FLUX.2 Klein"
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
              <PresetCard key={p.id} preset={p} />
            ))}
          </div>
          {presets.length > 4 && (
            <>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-linear-to-b from-transparent to-bg" />
              <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
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
        title="Community forks"
        sub="Sample data"
        actions={[{ label: "See the feed", href: "/community" }]}
      />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {feed.forks.map((f) => (
          <ForkCard key={f.handle} fork={f} />
        ))}
      </div>
    </div>
  );
}
