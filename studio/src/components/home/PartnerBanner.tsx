import Link from "next/link";

// Real renders from each model; files live in public/explore/partners.
const BASE = "/explore/partners/";

// Each wall lists its panels outermost first so the largest sits on top.
const LEFT_WALL = [
  { name: "Nano Banana Pro", href: "/image?preset=gemini-3-pro-image", src: "nano-banana-pro.webp", pos: "left-0", h: "h-[60%]" },
  { name: "GPT Image 2.5", href: "/image?preset=gpt-image-2-5-flare", src: "gpt-image-2-5.webp", pos: "left-[24%]", h: "h-[74%]" },
  { name: "Seedream 5.0 Pro", href: "/image?preset=seedream-5-0-pro", src: "seedream-5-pro.webp", pos: "left-[46%]", h: "h-[88%]" },
] as const;

const RIGHT_WALL = [
  { name: "FLUX.3", href: "/image?preset=flux-3-image", src: "flux-3.webp", pos: "right-0", h: "h-[60%]" },
  { name: "Kling 3.0", href: "/video?preset=kling-v3", src: "kling-3.webp", video: "kling-3.mp4", pos: "right-[24%]", h: "h-[74%]" },
  { name: "Veo 3.1", href: "/video?preset=veo-3-1", src: "veo-3-1.webp", video: "veo-3-1.mp4", pos: "right-[46%]", h: "h-[88%]" },
] as const;

function Panel({
  item,
  flip,
}: {
  item: (typeof LEFT_WALL)[number] | (typeof RIGHT_WALL)[number];
  flip?: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-label={item.name}
      className={`absolute top-1/2 aspect-[3/4] ${item.pos} ${item.h} -translate-y-1/2 overflow-hidden rounded-lg border border-line bg-s1 shadow-[0_18px_40px_#000c] motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:scale-[1.04] ${
        flip ? "[transform:rotateY(-42deg)]" : "[transform:rotateY(42deg)]"
      }`}
    >
      {"video" in item && item.video ? (
        <video
          src={BASE + item.video}
          poster={BASE + item.src}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={BASE + item.src}
          alt=""
          width={360}
          height={480}
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      )}
      <span className="absolute bottom-1.5 left-1.5 rounded-sm bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-t1">
        {item.name}
      </span>
    </Link>
  );
}

/** Partner models on Comfy Router: perspective media walls flank the pitch. */
export function PartnerBanner() {
  return (
    <section
      aria-labelledby="partner-banner-title"
      className="@container relative isolate overflow-hidden rounded-panel border border-line bg-black"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_120%,var(--color-ac),transparent)] opacity-25" />
      </div>

      <div className="absolute inset-y-[4%] left-[-3%] hidden w-[34%] [perspective:900px] [mask-image:linear-gradient(to_right,black_80%,transparent_99%)] @min-[48rem]:block">
        {LEFT_WALL.map((item) => (
          <Panel key={item.name} item={item} />
        ))}
      </div>

      <div className="absolute inset-y-[4%] right-[-3%] hidden w-[34%] [perspective:900px] [mask-image:linear-gradient(to_left,black_80%,transparent_99%)] @min-[48rem]:block">
        {RIGHT_WALL.map((item) => (
          <Panel key={item.name} item={item} flip />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-[330px] max-w-xl flex-col items-center justify-center px-5 py-14 text-center @min-[48rem]:min-h-[440px] @min-[48rem]:w-[30%] @min-[48rem]:px-0">
        <span className="text-caption tracking-[0.3em] uppercase text-t2">
          Comfy Router
        </span>
        <h2
          id="partner-banner-title"
          className="mt-4 font-display text-h2 leading-[1.05] font-extrabold uppercase tracking-tight text-t1 font-stretch-[112.5%] sm:text-h1 @min-[64rem]:text-[48px]"
        >
          Partner models
        </h2>
        <span className="mt-6 rounded-2xl border-[3px] border-ac px-7 py-3 font-display text-h3 font-extrabold uppercase tracking-wide text-ac shadow-[inset_0_0_22px_4px_rgba(255,91,34,0.4),0_0_36px_4px_rgba(255,91,34,0.5),0_0_90px_-10px_rgba(255,91,34,0.45)]">
          100+ models
        </span>
        <p className="mt-6 text-body text-t3">
          Veo 3.1, Kling 3.0, Nano Banana Pro, GPT Image 2.5 and more.
        </p>
        <p className="mt-1.5 text-body font-medium text-t1">
          One key, every partner model.
        </p>
        <Link
          href="/video?preset=veo-3-1"
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-lg bg-ac px-6 text-body font-semibold text-on motion-safe:transition-transform motion-safe:duration-150 motion-safe:hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ac"
        >
          Try Veo 3.1
        </Link>
      </div>
    </section>
  );
}
