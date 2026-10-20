import { ExploreVideo } from "@/components/ExploreVideo";
import { COMFY_CREATIONS } from "@/lib/explore-media";

export function ComfyCreations() {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {COMFY_CREATIONS.map((creation) => (
        <article key={creation.media.src} className="relative min-w-0">
          <ExploreVideo media={creation.media} title={creation.title} source={creation.source} portrait />
          <a href={creation.source} target="_blank" rel="noreferrer" aria-label={`Source: ${creation.title}, Comfy`} className="absolute bottom-3 left-3 rounded bg-black/65 px-2 py-1 text-caption text-white">Comfy ↗</a>
        </article>
      ))}
    </div>
  );
}
