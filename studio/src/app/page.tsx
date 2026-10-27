import Link from "next/link";
import { CloudPromo } from "@/components/CloudPromo";
import { CommunityGrid } from "@/components/CommunityGrid";
import { ExploreBanner } from "@/components/ExploreBanner";
import { Icon, SECTION_ICONS } from "@/components/icons";
import { ExploreCarousel } from "@/components/ExploreCarousel";
import { ExploreFooter } from "@/components/ExploreFooter";
import { presetPreview } from "@/lib/preset-preview";
import { EXPLORE_MEDIA } from "@/lib/explore-media";
import { FEATURES, type Feature } from "@/lib/features";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { toStudioModels } from "@/server/models/view";
import { listPresets } from "@/server/presets/load";
import type { Preset } from "@/server/presets/schema";

export const dynamic = "force-dynamic";

// Tiles come from the feature directory; roadmap entries stay off the home page.
const TOOLS = FEATURES.filter((f) => f.group !== "roadmap");

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
    <div className="mt-12 mb-4 flex items-end justify-between gap-4">
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

/** Small tool tile: icon on top, name, status tag and description below. */
function ToolTile({ tool }: { tool: Feature }) {
  return (
    <Link
      href={tool.href}
      className="flex min-h-24 flex-col justify-between rounded-xl border border-line bg-s2 p-3 hover:border-[#444] hover:bg-s3"
    >
      <div className="flex items-center justify-between">
        <Icon d={SECTION_ICONS[tool.icon]} className="h-5 w-5 text-t2" />
      </div>
      <div>
        <b className="text-body font-semibold">
          {tool.label}
          <StatusBadge status={tool.status} className="ml-1.5 align-middle" />
        </b>
        <span className="mt-0.5 block text-caption text-t3">{tool.description}</span>
      </div>
    </Link>
  );
}

/** The whole preset card opens its studio with the preset selected. */
function PresetCard({ preset }: { preset: Preset }) {
  const tryHref = `/${preset.category}?preset=${preset.id}`;
  const imageIn = preset.inputs.some((i) => i.required && i.key === "image");
  const outKind = preset.outputs[0]?.kind ?? "video";
  const inLabel = imageIn ? "Image" : "Text";
  const outLabel = outKind === "image" ? "Image" : "Video";
  return (
    <Link href={tryHref} aria-label={`Try ${preset.name}`} className="group relative block aspect-video overflow-hidden rounded-xl border border-line bg-s3 hover:border-[#444]">
      <img
        src={presetPreview(preset)}
        alt=""
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-black/80 to-transparent" />
      <div className="pointer-events-none absolute inset-x-3 top-2 flex items-center justify-between">
        {preset.chip ? (
          <Badge
            variant="secondary"
            className="bg-black/70 font-mono text-caption text-t2"
          >
            {preset.chip}
          </Badge>
        ) : (
          <span />
        )}
        <Badge
          variant="secondary"
          className="bg-black/70 font-mono text-caption text-t2"
        >
          {preset.model.label}
        </Badge>
      </div>
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between">
        <b className="text-body font-semibold">{preset.name}</b>
        <span
          aria-label={`${inLabel} to ${outLabel}`}
          className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-t2"
        >
          <Icon d={imageIn ? SECTION_ICONS.image : SECTION_ICONS.pencil} className="h-3 w-3" />
          <Icon d={SECTION_ICONS.chevronRight} className="h-2.5 w-2.5 text-t3" />
          <Icon d={outKind === "image" ? SECTION_ICONS.image : SECTION_ICONS.video} className="h-3 w-3" />
        </span>
      </div>
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

  const presets = catalog.slice(0, 8);

  return (
    <div className="px-4 pt-3 pb-10">
      <h1 className="sr-only">Explore</h1>

      <ExploreCarousel />

      <div className="mt-12 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <CloudPromo />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TOOLS.map((t) => (
            <ToolTile key={t.href} tool={t} />
          ))}
        </div>
      </div>

      <div className="mt-12">
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {presets.map((p) => (
              <PresetCard key={p.id} preset={p} />
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
        actions={[{ label: "See the showcase", href: "/showcase" }]}
      />
      <CommunityGrid items={EXPLORE_MEDIA.slice(0, 8)} />
      <ExploreFooter presets={catalog} models={models} />
    </div>
  );
}
