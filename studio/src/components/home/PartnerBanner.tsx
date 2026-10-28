import Link from "next/link";

// Real renders from each model; files live in public/explore/partners.
const IMAGES = [
  { preset: "gemini-3-pro-image", name: "Nano Banana Pro", src: "nano-banana-pro.webp" },
  { preset: "gpt-image-2-5-flare", name: "GPT Image 2.5", src: "gpt-image-2-5.webp" },
  { preset: "seedream-5-0-pro", name: "Seedream 5.0 Pro", src: "seedream-5-pro.webp" },
  { preset: "flux-3-image", name: "FLUX.3", src: "flux-3.webp" },
] as const;

const BASE = "/explore/partners/";

/** Flagship Router models: image renders left, video renders right. */
export function PartnerBanner() {
  return (
    <section
      aria-labelledby="partner-banner-title"
      className="@container relative isolate overflow-hidden rounded-panel border border-line bg-black"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_120%,var(--color-ac),transparent)] opacity-35" />
        <div className="absolute inset-x-[-30%] bottom-[-55%] h-full origin-top [transform:perspective(450px)_rotateX(58deg)] [mask-image:linear-gradient(transparent,#000_75%)]">
          <div className="size-full bg-[linear-gradient(to_right,var(--color-ac)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-ac)_1px,transparent_1px)] bg-size-[56px_40px] opacity-12" />
        </div>
      </div>

      <div className="absolute top-1/2 left-[2.5%] hidden w-[30%] max-w-[380px] -translate-y-1/2 -rotate-4 @min-[48rem]:block">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-s1/90 p-2 shadow-[0_20px_48px_#000c]">
          {IMAGES.map((m) => (
            <Link
              key={m.preset}
              href={`/image?preset=${m.preset}`}
              className="group relative block overflow-hidden rounded-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={BASE + m.src}
                alt={`${m.name} render`}
                width={360}
                height={360}
                loading="lazy"
                className="aspect-square w-full object-cover motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-[1.04]"
              />
              <span className="absolute inset-x-1.5 bottom-1.5 truncate rounded-sm bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-t1">
                <span className="text-ac">●</span> {m.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="relative mx-auto flex min-h-[330px] max-w-xl flex-col items-center justify-center px-5 py-14 text-center @min-[48rem]:min-h-[440px] @min-[48rem]:w-[34%] @min-[48rem]:px-0">
        <h2
          id="partner-banner-title"
          className="font-display text-h2 leading-[1.05] font-bold tracking-tight text-balance text-t1 sm:text-h1 @min-[64rem]:text-[48px]"
        >
          Partner models
        </h2>
        <p className="mt-5 max-w-80 text-body leading-relaxed text-pretty text-t2">
          Veo 3.1, Kling 3.0, Nano Banana Pro, GPT Image 2.5 and 100+ more on Comfy Router.
        </p>
        <Link
          href="/video?preset=veo-3-1"
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-body font-semibold text-black motion-safe:transition-transform motion-safe:duration-150 motion-safe:hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          Try Veo 3.1
        </Link>
      </div>

      <div className="absolute top-1/2 right-[2.5%] hidden w-[31%] max-w-[400px] -translate-y-1/2 @min-[48rem]:block">
        <Link
          href="/video?preset=kling-v3"
          className="absolute -top-[18%] right-[8%] block w-[62%] rotate-6 overflow-hidden rounded-lg border border-line shadow-[0_16px_36px_#000c]"
        >
          <video
            src={`${BASE}kling-3.mp4`}
            poster={`${BASE}kling-3.webp`}
            autoPlay
            muted
            loop
            playsInline
            aria-label="Kling 3.0 render"
            className="aspect-video w-full object-cover"
          />
          <span className="absolute top-1.5 left-1.5 rounded-sm bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-t1">
            Kling 3.0
          </span>
        </Link>
        <Link
          href="/video?preset=veo-3-1"
          className="relative mt-[22%] block rotate-3 overflow-hidden rounded-xl border border-line shadow-[0_20px_48px_#000c]"
        >
          <video
            src={`${BASE}veo-3-1.mp4`}
            poster={`${BASE}veo-3-1.webp`}
            autoPlay
            muted
            loop
            playsInline
            aria-label="Veo 3.1 render"
            className="aspect-video w-full object-cover"
          />
          <span className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-2 rounded-md border border-ac/80 bg-black/60 px-2.5 py-1.5 font-mono text-caption text-t1">
            Veo 3.1
            <span className="h-1 flex-1 rounded-full bg-[linear-gradient(90deg,var(--color-ac)_40%,#444_40%)]" />
            1080p
          </span>
        </Link>
      </div>
    </section>
  );
}
