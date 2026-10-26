"use client";

import Link from "next/link";
import { Icon, SECTION_ICONS } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useComfyHealth } from "@/lib/useComfyHealth";
import { useDemo } from "./DemoProvider";

const CHECKLIST = [
  "Open weights on Comfy Cloud",
  "LTX 2.5, Wan 2.2, HunyuanVideo, FLUX 3 Klein, Qwen, Z-Image",
  "Every shot opens as a workflow",
];

/**
 * Comfy Cloud promo card: expanded two-line headline, a checklist and one
 * accent CTA. Shows the connect pitch until health reports ok, then switches
 * to a "Try Orbit" deep link. While health is loading the CTA stays invisible.
 */
export function CloudPromo() {
  const demo = useDemo();
  const health = useComfyHealth();
  const connected = health?.status === "ok";

  return (
    <div className="rounded-panel border border-line bg-s1 bg-[radial-gradient(120%_120%_at_100%_0%,color-mix(in_srgb,var(--color-ac)_18%,transparent),transparent_60%)] p-5">
      <h2 className="font-display font-extrabold uppercase text-h2 leading-none font-stretch-[112.5%]">
        {demo.enabled ? "Explore" : connected ? "Comfy Cloud" : "Connect"}
        <br />
        <span className="text-ac">{demo.enabled ? "the studio" : connected ? "Connected" : "Comfy Cloud"}</span>
      </h2>
      <ul className="mt-4 space-y-2 text-body text-t2">
        {CHECKLIST.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <Icon d={SECTION_ICONS.check} className="h-4 w-4 flex-none text-ac" />
            {item}
          </li>
        ))}
      </ul>
      <Button
        size="lg"
        className={`mt-5 ${health || demo.enabled ? "" : "invisible"}`}
        render={<Link href={connected || demo.enabled ? "/camera?preset=orbit" : "/settings"} />}
      >
        {connected || demo.enabled ? "Try Orbit" : "Add your API key"}
      </Button>
    </div>
  );
}
