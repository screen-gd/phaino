import Link from "next/link";
import { CloudPromo } from "@/components/CloudPromo";
import { McpBanner } from "@/components/home/McpBanner";
import { PartnerBanner } from "@/components/home/PartnerBanner";
import { Icon, SECTION_ICONS, type IconName } from "@/components/icons";
import { ExploreCarousel } from "@/components/ExploreCarousel";
import { ExploreFooter } from "@/components/ExploreFooter";
import { ToolTile } from "@/components/home/ToolTile";
import { presetPreview } from "@/lib/preset-preview";
import { cn } from "@/lib/utils";
import { featureById } from "@/lib/features";
import { Button } from "@/components/ui/button";
import { toStudioModels } from "@/server/models/view";
import { listPresets } from "@/server/presets/load";
import type { Preset } from "@/server/presets/schema";

export const dynamic = "force-dynamic";

// Soon tiles stay listed but go to the roadmap, not the stub pages.
const TOOLS = [
  { id: "camera", href: "/camera", name: "Camera moves", kind: "Video", desc: "Orbit, dolly in, crash zoom and 4 more on LTX 2.5", icon: "camera" },
  { id: "image", href: "/image", name: "Image", kind: "Image", desc: "FLUX.2 Klein, Qwen Image, Z-Image", icon: "image" },
  { id: "video", href: "/video", name: "Video", kind: "Video", desc: "LTX 2.5, Wan 2.2, HunyuanVideo, MiniMax H3", icon: "video" },
  { id: "effects", href: "/effects", name: "Effects", kind: "Video", desc: "Reframe, upscale or smooth a clip. No prompt needed", icon: "effects" },
  { id: "edit", href: "/edit", name: "Edit", kind: "Video", desc: "Relight, restyle, extend or remove objects", icon: "edit" },
  { id: "kawarimi", href: "/kawarimi", name: "Kawarimi", kind: "Video", desc: "Swap a character from one image into a video", icon: "characters" },
  { id: "editor", href: "/editor", name: "Editor", kind: null, desc: "Cut clips, add titles and music", icon: "export" },
] as const satisfies readonly {
  id: string;
  href: string;
  name: string;
  kind: string | null;
  desc: string;
  icon: IconName;
}[];

/** Section heading: white title, optional subtitle and action buttons. */
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
    <div className="mt-4 mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-h2 font-semibold tracking-tight text-t1">
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

/** The whole preset card opens its studio with the preset selected. */
function PresetCard({ preset }: { preset: Preset }) {
  const tryHref = `/${preset.category}?preset=${preset.id}`;
  const imageIn = preset.inputs.some((i) => i.required && i.key === "image");
  const outKind = preset.outputs[0]?.kind ?? "video";
  const inLabel = imageIn ? "Image" : "Text";
  const outLabel = outKind === "image" ? "Image" : "Video";
  return (
    <Link href={tryHref} aria-label={`Try ${preset.name}`} className="group relative block aspect-video overflow-hidden rounded-md border border-line bg-black hover:border-[#444]">
      <img
        src={presetPreview(preset)}
        alt=""
        className="h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-black/80 to-transparent" />
      <div className="pointer-events-none absolute inset-x-3 top-2.5 flex items-center justify-between font-mono text-caption text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
        <span>{preset.chip ?? ""}</span>
        <span>{preset.model.label}</span>
      </div>
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between">
        <b className="text-body font-semibold">{preset.name}</b>
        <span
          aria-label={`${inLabel} to ${outLabel}`}
          className="flex items-center gap-1 text-t2"
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

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <CloudPromo />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TOOLS.map((t, i) => {
            const n = TOOLS.length;
            const last = i === n - 1;
            // A lone last tile spans the row instead of leaving a hole.
            return (
              <ToolTile
                key={t.id}
                tool={t}
                status={featureById(t.id)?.status ?? "live"}
                wide={last && n % 3 === 1}
                className={cn(
                  last && n % 2 === 1 && "col-span-2",
                  last && n % 3 === 1
                    ? "sm:col-span-3"
                    : last && n % 2 === 1 && "sm:col-span-1",
                )}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <McpBanner />
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
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[48%] bg-linear-to-b from-transparent via-black/50 to-black/90" />
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

      <div className="mt-3">
        <PartnerBanner />
      </div>

      <ExploreFooter presets={catalog} models={models} />
    </div>
  );
}
