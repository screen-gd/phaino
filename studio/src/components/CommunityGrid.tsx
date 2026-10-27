import Link from "next/link";
import { ExploreVideo } from "@/components/ExploreVideo";
import type { MediaItem } from "@/lib/explore-media";

const MODEL_LABELS: Record<string, string> = {
  "ltx-2.5": "LTX 2.5",
  ltx23: "LTX 2.3",
  "wan-2.2": "Wan 2.2",
  "minimax-h3": "MiniMax H3",
  hunyuan15: "HunyuanVideo 1.5",
  fasth3: "FastH3",
  "flux2-klein-4b": "FLUX.2 Klein",
  "flux2-klein-4b-distilled": "FLUX.2 Klein Fast",
  "qwen-image-2512": "Qwen Image",
};

/** Mixed-height masonry of example media at their real aspect ratios. */
export function CommunityGrid({ items }: { items: MediaItem[] }) {
  return (
    <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
      {items.map((item) => (
        <article
          key={item.media.src}
          className="group relative mb-3 break-inside-avoid"
        >
          {item.media.kind === "video" ? (
            <ExploreVideo
              media={item.media}
              title={item.title}
              source={item.source}
              natural
            />
          ) : (
            <div className="relative overflow-hidden rounded-xl border border-line bg-s2">
              <img
                src={item.media.src}
                alt={item.title}
                loading="lazy"
                width={item.media.w}
                height={item.media.h}
                className="block w-full"
              />
            </div>
          )}
          {item.viewerHref && (
            <Link
              href={item.viewerHref}
              aria-label={`Open ${item.title} in the workflow viewer`}
              className="absolute inset-0"
            />
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-md bg-linear-to-t from-black/80 to-transparent p-2.5 pt-8 opacity-0 transition-opacity duration-150 motion-reduce:transition-none group-hover:opacity-100 group-focus-within:opacity-100">
            <b className="block text-caption font-semibold text-white">
              {item.title}
            </b>
            <span className="mt-0.5 block text-caption text-t3">
              {MODEL_LABELS[item.model] ?? item.model}
            </span>
            <a
              href={item.source}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto mt-1 inline-block text-caption text-t3 underline underline-offset-2 hover:text-t1"
            >
              Comfy template (MIT) ↗
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
