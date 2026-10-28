import { CommunityGrid } from "@/components/CommunityGrid";
import { EXPLORE_MEDIA } from "@/lib/explore-media";
import { viewerHrefFor } from "@/server/presets/load";

export const dynamic = "force-dynamic";

export default function ShowcasePage() {
  const items = EXPLORE_MEDIA.map((item) => ({
    ...item,
    viewerHref: viewerHrefFor(item.href),
  }));
  return (
    <div className="px-4 pt-6 pb-10">
      <h1 className="font-display text-h3 font-extrabold uppercase text-ac font-stretch-[112.5%]">Showcase</h1>
      <p className="mt-2 mb-6 max-w-2xl text-body text-t3">
        Examples from the open models in the studio, made with{" "}
        <a href="https://github.com/Comfy-Org/workflow_templates" target="_blank" rel="noreferrer" className="text-t2 underline underline-offset-4">Comfy templates</a>.
      </p>
      <CommunityGrid items={items} />
    </div>
  );
}
