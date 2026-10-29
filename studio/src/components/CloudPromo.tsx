"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, SECTION_ICONS } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useComfyHealth } from "@/lib/useComfyHealth";
import { useDemo } from "./DemoProvider";

const CHECKLIST = [
  "Open models: LTX 2.5, Wan 2.2, FLUX.2 Klein",
  "100+ partner models on one API key",
  "Open any result as a ComfyUI workflow",
];

const EXAMPLES = "/explore/examples/";

/** One graph node: clipped body plus a round port on each vertical edge. */
function GraphNode({
  title,
  accent,
  className,
  children,
}: {
  title: string;
  accent?: boolean;
  className: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("absolute", className)}>
      <div className="absolute inset-0 flex flex-col overflow-hidden rounded-md border border-line bg-s2">
        <div
          className={cn(
            "flex items-center border-b border-line/60 px-2 py-1 font-mono text-[9px] whitespace-nowrap uppercase tracking-wider xl:text-[10px]",
            accent ? "bg-ac text-on" : "text-t3",
          )}
        >
          {title}
        </div>
        {children}
      </div>
      <span className="absolute top-1/2 left-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ac/70 bg-s1" />
      <span className="absolute top-1/2 right-0 size-2 translate-x-1/2 -translate-y-1/2 rounded-full border border-ac/70 bg-s1" />
    </div>
  );
}

/** Static workflow-graph illustration that fills the card's remaining height. */
function WorkflowGraph() {
  return (
    <div
      aria-hidden="true"
      className="relative mt-5 hidden min-h-[170px] flex-1 overflow-hidden rounded-lg border border-line/60 lg:block"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:16px_16px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_115%,var(--color-ac),transparent)] opacity-[0.18]" />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
        fill="none"
      >
        <path
          d="M30 58 C 33.2 58, 33.3 33, 36.5 33"
          stroke="#FF5B22"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M63.5 33 C 66.7 33, 66.8 67, 70 67"
          stroke="#FF5B22"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <GraphNode title="Load image" className="top-[32%] left-[3%] h-[52%] w-[27%]">
        <div className="relative min-h-0 flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={EXAMPLES + "ltx25-i2v.webp"}
            alt=""
            width={480}
            height={270}
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        </div>
      </GraphNode>
      <GraphNode title="LTX 2.5" accent className="top-[6%] left-[36.5%] h-[54%] w-[27%]">
        <div className="flex flex-1 flex-col justify-center gap-1 px-2 font-mono text-[9px] whitespace-nowrap text-t2 xl:text-[10px]">
          <span>Orbit · 90°</span>
          <span>5s · 24 fps</span>
        </div>
      </GraphNode>
      <GraphNode title="Save video" className="top-[42%] left-[70%] h-[50%] w-[27%]">
        <div className="relative min-h-0 flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={EXAMPLES + "wan22.webp"}
            alt=""
            width={480}
            height={270}
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
          <span className="absolute top-1/2 left-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/55">
            <svg viewBox="0 0 10 12" className="ml-0.5 h-2.5 w-2.5 text-t1" fill="currentColor">
              <path d="M0 0l10 6-10 6z" />
            </svg>
          </span>
        </div>
      </GraphNode>
    </div>
  );
}

/**
 * Comfy Cloud promo card: expanded two-line headline, a checklist and one
 * accent CTA. Shows the connect pitch until health reports ok, then switches
 * to a "Try the Orbit move" deep link. While health is loading the CTA stays invisible.
 */
export function CloudPromo() {
  const demo = useDemo();
  const health = useComfyHealth();
  const connected = health?.status === "ok";

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-s1 p-5">
      <h2 className="text-h2 leading-none font-semibold tracking-tight">
        {demo.enabled ? "Runs on" : connected ? "Comfy Cloud" : "Connect"}
        <br />
        <span className="text-ac">{demo.enabled ? "Comfy Cloud" : connected ? "Connected" : "Comfy Cloud"}</span>
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
        className={`mt-5 self-start ${health || demo.enabled ? "" : "invisible"}`}
        render={<Link href={connected || demo.enabled ? "/camera?preset=orbit" : "/settings"} />}
      >
        {connected || demo.enabled ? "Try the Orbit move" : "Add your API key"}
      </Button>
      <WorkflowGraph />
    </div>
  );
}
