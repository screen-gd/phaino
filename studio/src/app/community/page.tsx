import { ComfyCreations } from "@/components/ComfyCreations";
import { COMFY_SHOWCASE_URL } from "@/lib/explore-media";

export default function CommunityPage() {
  return (
    <div className="px-3 pt-6 pb-10">
      <h1 className="font-display text-h3 font-extrabold uppercase text-ac">Made with Comfy</h1>
      <p className="mt-2 mb-6 max-w-2xl text-body text-t3">
        Short video examples from{" "}
        <a href={COMFY_SHOWCASE_URL} target="_blank" rel="noreferrer" className="text-t2 underline underline-offset-4">Comfy</a>.
      </p>
      <ComfyCreations />
    </div>
  );
}
