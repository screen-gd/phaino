"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDemo } from "../DemoProvider";
import { isVideoPath } from "../studio/JobViews";
import { SocialComposer } from "../studio/SocialComposer";
import { useSocialAccounts } from "../studio/useSocialAccounts";
import { ZernioSettings } from "../ZernioSettings";
import { DEMO_MESSAGE, outputPosterUrl, outputUrl } from "@/lib/demo";
import { sortOutputsNewest, type SocialOutput } from "./socialUtils";

/** Social posting: pick a recent output, caption it, post via Zernio. */
export function SocialView() {
  const demo = useDemo();
  const params = useSearchParams();
  const [items, setItems] = useState<SocialOutput[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(params.get("path"));
  const accounts = useSocialAccounts(!demo.enabled);

  useEffect(() => {
    let live = true;
    fetch("/api/sequence/outputs")
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as
          | { items?: SocialOutput[] }
          | null;
        if (!live) return;
        if (!res.ok || !data?.items) {
          setLoadError("Could not load outputs");
          return;
        }
        setItems(sortOutputsNewest(data.items));
      })
      .catch(() => live && setLoadError("Could not load outputs"));
    return () => {
      live = false;
    };
  }, []);

  const selectedItem = items?.find((i) => i.relPath === selected);
  const selectedVideo = selected
    ? (selectedItem?.kind ?? (isVideoPath(selected) ? "video" : "image")) ===
      "video"
    : false;

  return (
    <div className="grid min-h-full grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] bg-black lg:h-full lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-none">
      <section className="flex min-h-0 min-w-0 flex-col px-4 pt-5 pb-5 sm:px-6">
        <h1 className="font-display text-h3 font-extrabold uppercase text-t1 font-stretch-[112.5%]">
          Social
        </h1>
        <p className="mt-1 max-w-[60ch] text-body text-t3">
          Post your renders to connected accounts
        </p>
        <div className="mt-4 grid min-h-0 flex-1 place-items-center overflow-hidden rounded-panel border border-line bg-s1">
          {selected ? (
            selectedVideo ? (
              <video
                key={selected}
                src={outputUrl(selected)}
                poster={outputPosterUrl(selected)}
                controls
                muted
                playsInline
                className="aspect-video max-h-full w-full object-contain"
              />
            ) : (
              <img
                src={outputUrl(selected)}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            )
          ) : (
            <p className="text-caption text-t3">Pick a recent output to post</p>
          )}
        </div>
        <div className="mt-3 grid flex-none grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {items === null ? (
            loadError ? (
              <p className="text-caption text-t3">{loadError}</p>
            ) : (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="aspect-video rounded-md bg-s1" />
              ))
            )
          ) : (
            items.slice(0, 10).map((item) => {
              const video = item.kind === "video" || isVideoPath(item.relPath);
              const on = item.relPath === selected;
              return (
                <button
                  key={item.relPath}
                  type="button"
                  onClick={() => setSelected(item.relPath)}
                  title={item.name}
                  aria-label={`Select ${item.name}`}
                  aria-pressed={on}
                  className={`aspect-video overflow-hidden rounded-md border-2 ${
                    on ? "border-ac" : "border-transparent hover:border-line"
                  }`}
                >
                  <img
                    src={
                      video ? outputPosterUrl(item.relPath) : outputUrl(item.relPath)
                    }
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              );
            })
          )}
        </div>
      </section>
      <aside className="border-t border-line p-4 lg:overflow-y-auto lg:border-t-0 lg:border-l">
        {demo.enabled ? (
          <p className="text-caption text-t3">{DEMO_MESSAGE}</p>
        ) : (
          <SocialComposer
            path={selected}
            accounts={accounts}
            notConfigured={<ZernioSettings onSaved={accounts.reload} />}
          />
        )}
      </aside>
    </div>
  );
}
