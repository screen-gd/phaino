import Link from "next/link";
import { Icon, SECTION_ICONS } from "@/components/icons";
import { PhainoMark } from "@/components/Logo";

const TILES = [
  { icon: "image" as const, tilt: "-rotate-6 translate-y-1" },
  { icon: "video" as const, tilt: "rotate-3" },
  { icon: null, tilt: "" },
  { icon: "edit" as const, tilt: "-rotate-3" },
  { icon: "community" as const, tilt: "rotate-6 translate-y-1" },
] as const;

const TOOL_CALLS = [
  "run_preset veo-3-1",
  "run_preset kling-v3",
  "run_preset gemini-3-pro-image",
] as const;

const CLIPS = ["ltx25-i2v.webp", "wan22.webp", "fasth3-t2v.webp"] as const;

const PARTNERS = "/explore/partners/";
const EXAMPLES = "/explore/examples/";

/** The Phaino MCP pitch: give an agent a goal, it generates, cuts and posts. */
export function McpBanner() {
  return (
    <section
      aria-labelledby="mcp-banner-title"
      className="@container relative isolate overflow-hidden rounded-panel border border-ac/40 bg-black shadow-[inset_0_0_90px_-10px_rgba(255,91,34,0.45)] @min-[48rem]:border-0 @min-[48rem]:shadow-none"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/explore/mcp/box.webp"
          srcSet="/explore/mcp/box-1200.webp 1200w, /explore/mcp/box.webp 2172w"
          sizes="(min-width: 1280px) 1408px, 100vw"
          alt=""
          width={2172}
          height={724}
          loading="eager"
          className="absolute inset-0 size-full object-cover object-center @min-[48rem]:object-fill"
        />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[14%] left-[3%] hidden w-[24%] max-w-[300px] -rotate-3 select-none @min-[48rem]:block"
      >
        <div className="overflow-hidden rounded-2xl border border-white/14 bg-[#161616]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_60px_#000] backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 px-3.5 pt-3 pb-2.5">
            <span className="flex items-center gap-2 text-body font-medium text-t1">
              <span className="font-mono text-caption text-ac">{">_"}</span>
              Claude Code
            </span>
            <span className="text-caption text-t2">3/3</span>
          </div>
          <div className="px-3.5">
            <p className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-caption text-t1">
              Make a 15s teaser for the sneaker drop
            </p>
          </div>
          <div className="grid gap-1.5 px-3.5 pt-3 font-mono text-[11px] text-t2">
            {TOOL_CALLS.map((call) => (
              <span key={call} className="flex items-center gap-1.5">
                <Icon d={SECTION_ICONS.check} className="size-3 text-ac" />
                {call}
              </span>
            ))}
          </div>
          <div className="flex items-end justify-center gap-2 px-3.5 pt-4 pb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${PARTNERS}veo-3-1.webp`}
              alt=""
              width={120}
              height={68}
              loading="lazy"
              className="w-[28%] -rotate-6 rounded-md border border-white/12 object-cover shadow-[0_8px_20px_#000a]"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${PARTNERS}kling-3.webp`}
              alt=""
              width={120}
              height={68}
              loading="lazy"
              className="z-10 w-[34%] rounded-md border border-white/12 object-cover shadow-[0_10px_24px_#000c]"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${PARTNERS}nano-banana-pro.webp`}
              alt=""
              width={120}
              height={68}
              loading="lazy"
              className="w-[28%] rotate-6 rounded-md border border-white/12 object-cover shadow-[0_8px_20px_#000a]"
            />
          </div>
        </div>
      </div>

      <div className="relative mx-auto flex min-h-[330px] max-w-xl flex-col items-center justify-center px-5 py-14 text-center @min-[48rem]:min-h-[440px] @min-[48rem]:w-[34%] @min-[48rem]:px-0">
        <div aria-hidden="true" className="flex items-center gap-2">
          {TILES.map((t, i) =>
            t.icon === null ? (
              <span
                key={i}
                className={`flex size-9 items-center justify-center rounded-lg bg-ac ${t.tilt}`}
              >
                <PhainoMark className="size-5 text-on" />
              </span>
            ) : (
              <span
                key={i}
                className={`flex size-8 items-center justify-center rounded-lg border border-line bg-s2 ${t.tilt}`}
              >
                <Icon d={SECTION_ICONS[t.icon]} className="size-4 text-t1" />
              </span>
            ),
          )}
        </div>
        <h2
          id="mcp-banner-title"
          className="mt-5 font-display text-h2 leading-[1.05] font-extrabold uppercase tracking-tight text-ac font-stretch-[112.5%] sm:text-h1 @min-[64rem]:text-[48px]"
        >
          <span className="relative inline-block">
            Phaino MCP
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-[88%] left-[92%] hidden select-none @min-[48rem]:block"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="absolute top-[58%] -left-3 z-10 size-5 text-white drop-shadow-[0_2px_6px_#000]"
              >
                <path d="m3 1.5 10.5 6.5-5 .8-2 5.2L3 1.5Z" fill="currentColor" stroke="#0008" strokeWidth="0.75" />
              </svg>
              <span className="inline-block rounded-full bg-white px-4 py-1.5 font-sans text-caption leading-normal font-semibold tracking-normal normal-case text-black font-stretch-normal shadow-[0_8px_20px_#000a]">
                Generating
              </span>
            </span>
          </span>
        </h2>
        <p className="mt-5 max-w-96 text-body leading-relaxed text-pretty text-t2">
          Give your agent a goal. It generates, cuts and posts.
        </p>
        <Link
          href="/mcp"
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-body font-semibold text-black motion-safe:transition-transform motion-safe:duration-150 motion-safe:hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          Connect your agent
        </Link>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[20%] right-[3%] hidden w-[24%] max-w-[310px] select-none @min-[48rem]:block"
      >
        <div className="relative overflow-visible rounded-2xl border border-white/14 bg-[#161616]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_60px_#000] backdrop-blur-md">
          <span className="absolute -top-3 right-5 rotate-3 rounded-full bg-ac px-3 py-1 text-caption font-semibold text-on shadow-[0_8px_20px_#000a]">
            Posting
          </span>
          <div className="flex items-center gap-2 px-3.5 pt-3 pb-2.5 text-body font-medium text-t1">
            <Icon d={SECTION_ICONS.export} className="size-3.5 text-ac" />
            Editor
          </div>
          <div className="px-3.5 pb-3.5">
            <p className="text-caption text-t2">Sequence · 3 clips · 0:15</p>
            <div className="relative mt-2 grid grid-cols-3 gap-1.5">
              {CLIPS.map((clip) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={clip}
                  src={`${EXAMPLES}${clip}`}
                  alt=""
                  width={120}
                  height={68}
                  loading="lazy"
                  className="aspect-video w-full rounded-sm border border-white/12 object-cover"
                />
              ))}
              <span className="absolute top-0 bottom-0 left-[38%] w-px bg-ac" />
            </div>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[6%] top-[calc(100%-80px)] hidden w-[20%] max-w-[260px] rotate-3 select-none @min-[48rem]:block"
      >
        <div className="overflow-hidden rounded-2xl border border-white/14 bg-[#161616]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_60px_#000] backdrop-blur-md">
          <div className="flex items-center gap-2 px-3.5 pt-3 pb-2.5 text-body font-medium text-t1">
            <Icon d={SECTION_ICONS.community} className="size-3.5 text-ac" />
            Social
          </div>
          <div className="flex flex-wrap gap-1.5 px-3.5 pb-4">
            {["Threads", "LinkedIn", "X"].map((name) => (
              <span
                key={name}
                className="flex items-center gap-1 rounded-full border border-white/12 px-2 py-1 text-[11px] text-t2"
              >
                {name}
                <Icon d={SECTION_ICONS.check} className="size-2.5 text-ac" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
