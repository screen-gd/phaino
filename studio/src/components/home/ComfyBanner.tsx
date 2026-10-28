import Link from "next/link";
import { Icon, SECTION_ICONS } from "@/components/icons";

/** Static product fragments frame the workflow link without adding controls. */
export function ComfyBanner() {
  return (
    <section
      aria-labelledby="comfy-banner-title"
      className="@container relative isolate overflow-hidden rounded-panel border border-line bg-black"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_50%_115%,var(--color-ac),transparent)] opacity-30" />
        <div className="absolute inset-x-[-30%] bottom-[-55%] h-full origin-top [transform:perspective(450px)_rotateX(58deg)] [mask-image:linear-gradient(transparent,#000_75%)]">
          <div className="size-full bg-[linear-gradient(to_right,var(--color-ac)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-ac)_1px,transparent_1px)] bg-size-[56px_40px] opacity-12" />
        </div>
        <div className="absolute inset-x-[15%] bottom-0 h-px bg-linear-to-r from-transparent via-ac/60 to-transparent" />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[17%] left-[3%] hidden w-[21%] max-w-60 -rotate-4 select-none @min-[48rem]:block"
      >
        <div className="absolute top-[calc(100%-8px)] left-7 w-full overflow-hidden rounded-lg border border-line bg-s1/95 shadow-[0_12px_32px_#0009]">
          <div className="border-b border-line bg-s2 px-3 py-2.5">
            <span className="block font-mono text-caption text-t2">LTX 2.5</span>
            <span className="text-caption text-t3">Image to Video</span>
          </div>
          <dl className="space-y-1.5 px-3 py-2.5 font-mono text-caption text-t2">
            <div className="flex justify-between gap-2">
              <dt className="text-t3">duration</dt>
              <dd>5s</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-t3">fps</dt>
              <dd>24</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-t3">aspect</dt>
              <dd>16:9</dd>
            </div>
          </dl>
        </div>

        <svg
          viewBox="0 0 110 190"
          fill="none"
          className="absolute top-[62px] left-full h-[190px] w-[110px] overflow-visible text-ac/65"
        >
          <path
            d="M-5 0C77 0 18 170 105 170"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="105" cy="170" r="4" fill="currentColor" />
        </svg>

        <div className="relative overflow-hidden rounded-lg border border-line bg-s1/95 shadow-[0_16px_36px_#0009]">
          <div className="flex items-center justify-between gap-2 border-b border-line bg-s2 px-3 py-2.5">
            <span className="text-body font-medium text-t1">Load Image</span>
            <span className="font-mono text-[10px] text-t3">LoadImage</span>
          </div>
          <div className="relative flex items-center justify-end gap-2 px-3 pt-2 font-mono text-[10px] text-t2">
            IMAGE
            <span className="absolute -right-1 size-2 rounded-full border border-ac bg-ac" />
          </div>
          <div className="p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/api/presets/orbit/thumb"
              alt=""
              width={320}
              height={200}
              loading="lazy"
              className="aspect-[8/5] w-full rounded-sm object-cover"
            />
          </div>
        </div>
      </div>

      <div className="relative mx-auto flex min-h-[330px] max-w-xl flex-col items-center justify-center px-5 py-14 text-center @min-[48rem]:min-h-[420px] @min-[48rem]:w-[46%] @min-[48rem]:px-0 @min-[64rem]:min-h-[440px]">
        <h2
          id="comfy-banner-title"
          className="font-display text-h2 leading-[1.05] font-bold tracking-tight text-balance text-t1 sm:text-h1 @min-[64rem]:text-[48px]"
        >
          Every shot is a ComfyUI workflow
        </h2>
        <p className="mt-5 max-w-96 text-body leading-relaxed text-pretty text-t2">
          Open any preset as a node graph. Edit it, fork it, run it on Comfy Cloud.
        </p>
        <Link
          href="/workflows/orbit"
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-body font-semibold text-black motion-safe:transition-transform motion-safe:duration-150 motion-safe:hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          Open a workflow
        </Link>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[20%] right-[3%] hidden w-[21%] max-w-60 rotate-4 select-none @min-[48rem]:block"
      >
        <div className="overflow-hidden rounded-lg border border-line bg-s1/95 shadow-[0_16px_36px_#0009]">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2.5 text-caption text-t2">
            <Icon d={SECTION_ICONS.camera} className="size-3.5 text-ac" />
            Camera moves
          </div>
          <div className="p-3">
            <div className="relative overflow-hidden rounded-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/api/presets/orbit/thumb"
                alt=""
                width={320}
                height={200}
                loading="lazy"
                className="aspect-[8/5] w-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/85 to-transparent" />
              <div className="absolute inset-x-2.5 bottom-2 flex items-center justify-between gap-2 text-t1">
                <span className="text-body font-semibold">Orbit</span>
                <span className="font-mono text-caption">90°</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-[10px] text-t2">
              <span className="rounded-sm border border-line px-1.5 py-1">LTX 2.5</span>
              <span className="rounded-sm border border-line px-1.5 py-1">seed random</span>
            </div>
            <span className="mt-3 flex min-h-8 items-center justify-center rounded-full bg-ac px-3 text-caption font-semibold text-on">
              Generate
            </span>
          </div>
        </div>
        <div className="relative mt-5 ml-2 flex w-fit items-center gap-2 rounded-full border border-line bg-s2 px-3 py-2 font-mono text-[10px] text-t1 shadow-[0_8px_20px_#0009]">
          <svg viewBox="0 0 20 20" fill="none" className="size-3.5 text-ac">
            <path d="m4 2 12 8-6 1-2 6L4 2Z" fill="currentColor" />
          </svg>
          Open in ComfyUI
        </div>
      </div>
    </section>
  );
}
