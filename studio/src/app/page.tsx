import Link from "next/link";
import { ExploreBanner } from "@/components/ExploreBanner";
import { Icon, SECTION_ICONS } from "@/components/icons";
import { ToolPreview } from "@/components/ToolPreview";
import { communityFeedSchema, type CommunityFork } from "@/lib/community";
import { toolLoopUrl } from "@/server/media";
import { listPresetSummaries, type PresetSummary } from "@/server/presets/summary";
import sampleFeed from "@/data/community.sample.json";

type Tool = {
  href: string;
  name: string;
  sub: string;
  tool: string;
  poster?: string;
  icon?: keyof typeof SECTION_ICONS;
  soon?: boolean;
};

const TOOLS: Tool[] = [
  { href: "/camera", name: "Camera moves", sub: "LTX 2.5", tool: "camera", poster: "/explore/moves.webp" },
  { href: "/image", name: "Image", sub: "FLUX.2", tool: "image", poster: "/explore/image.webp" },
  { href: "/effects", name: "Effects", sub: "VFX", tool: "effects", poster: "/explore/effects.webp", soon: true },
  { href: "/avatars", name: "Avatars", sub: "Lipsync", tool: "avatars", icon: "avatars", soon: true },
  { href: "/edit", name: "Edit", sub: "4K · inpaint", tool: "edit", poster: "/explore/edit.webp", soon: true },
  { href: "/export", name: "Export", sub: "FCPXML · EDL", tool: "export", poster: "/explore/video.webp", soon: true },
];

const CHIP =
  "inline-flex h-[22px] items-center rounded-full border border-line px-2 font-mono text-xs whitespace-nowrap";
const SMALL_PILL =
  "inline-flex h-8 items-center rounded-full border border-line bg-s2 px-3 text-xs whitespace-nowrap hover:border-[#3a3a3a] hover:bg-s3";

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mt-7 mb-3 flex items-baseline justify-between">
      <h2 className="text-base font-semibold">{title}</h2>
      {sub && (
        <span className="font-mono text-xs uppercase tracking-[0.06em] text-t3">{sub}</span>
      )}
    </div>
  );
}

function ToolTile({ tool }: { tool: Tool }) {
  return (
    <Link
      href={tool.href}
      className="block rounded-panel border border-line bg-s1 p-2 text-left hover:border-[#3a3a3a] hover:bg-s2"
    >
      <div className="relative">
        {tool.poster ? (
          <ToolPreview poster={tool.poster} video={toolLoopUrl(tool.tool)} />
        ) : (
          <div className="grid aspect-4/3 place-items-center rounded-xl bg-s3 text-t3">
            <Icon d={SECTION_ICONS[tool.icon ?? "explore"]} className="h-8 w-8" />
          </div>
        )}
        {tool.soon && (
          <span className={`${CHIP} absolute top-2 left-2 border-transparent bg-black/70 text-t2`}>
            Soon
          </span>
        )}
      </div>
      <b className="mx-1.5 mt-2.5 mb-0.5 block font-semibold">{tool.name}</b>
      <span className="mx-1.5 mb-1 block font-mono text-xs text-t3">{tool.sub}</span>
    </Link>
  );
}

function PresetCard({ preset }: { preset: PresetSummary }) {
  const partner = preset.model.license === "partner";
  return (
    <div className="w-[260px] flex-none rounded-panel border border-line bg-s1 p-2">
      <div className="aspect-16/10 overflow-hidden rounded-xl bg-s3">
        <img
          src={`/api/presets/${preset.id}/thumb`}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex items-center justify-between gap-2 px-1.5 pt-2.5 pb-1">
        <b className="min-w-0 truncate font-semibold">{preset.name}</b>
        <span className={`${CHIP} ${partner ? "border-transparent bg-acs text-ac" : "text-t2"}`}>
          {preset.model.label}
        </span>
      </div>
      <div className="flex gap-1.5 px-1.5 pb-1">
        <Link
          href={`/${preset.category}?preset=${preset.id}`}
          className={SMALL_PILL}
        >
          Try
        </Link>
        <Link href={`/workflows/${preset.id}`} className={SMALL_PILL}>
          Open workflow
        </Link>
      </div>
    </div>
  );
}

function ForkCard({ fork }: { fork: CommunityFork }) {
  return (
    <div className="rounded-panel border border-line bg-s1 p-2">
      <div className="aspect-16/10 overflow-hidden rounded-xl bg-s3">
        <img src={fork.thumb} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="px-1.5 pt-2.5 pb-1">
        <b className="block truncate font-semibold">{fork.title}</b>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-t3">{fork.handle}</span>
          <span className="font-mono text-xs text-ac">{fork.forkCount} forks</span>
        </div>
      </div>
      <div className="flex gap-1.5 px-1.5 pb-1">
        <Link href={`/camera?preset=${fork.presetId}`} className={SMALL_PILL}>
          Run
        </Link>
        <Link href={`/workflows/${fork.presetId}`} className={SMALL_PILL}>
          Fork
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  const presets = listPresetSummaries();
  const feed = communityFeedSchema.parse(sampleFeed);

  return (
    <div className="px-[22px] pt-5 pb-12">
      <ExploreBanner />

      <SectionHead title="Tools" />
      <div className="grid grid-cols-6 gap-3">
        {TOOLS.map((t) => (
          <ToolTile key={t.href} tool={t} />
        ))}
      </div>

      <SectionHead title="Trending presets" />
      {presets.length === 0 ? (
        <p className="text-t3">No presets yet</p>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto pb-1.5">
          {presets.map((p) => (
            <PresetCard key={p.id} preset={p} />
          ))}
        </div>
      )}

      <SectionHead title="Community forks" sub="sample data" />
      <div className="grid grid-cols-4 gap-3">
        {feed.forks.map((f) => (
          <ForkCard key={f.handle} fork={f} />
        ))}
      </div>
    </div>
  );
}
