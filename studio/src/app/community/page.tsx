import { CommunityGrid } from "@/components/CommunityGrid";
import { EXPLORE_MEDIA } from "@/lib/explore-media";

export default function CommunityPage() {
  return (
    <div className="px-4 pt-6 pb-10">
      <h1 className="font-display text-h3 font-extrabold uppercase text-ac font-stretch-[112.5%]">Made with Comfy</h1>
      <p className="mt-2 mb-6 max-w-2xl text-body text-t3">
        Examples from the open models in the studio, via{" "}
        <a href="https://github.com/Comfy-Org/workflow_templates" target="_blank" rel="noreferrer" className="text-t2 underline underline-offset-4">Comfy</a>.
      </p>
      <CommunityGrid items={EXPLORE_MEDIA} />
    </div>
  );
}
