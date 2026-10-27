"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { setPendingStill } from "@/lib/pendingStill";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icon, SECTION_ICONS } from "@/components/icons";
import type { GraphModel } from "@/components/workflow/graphModel";
import { GraphPreview } from "./GraphPreview";

export type MoveOption = { id: string; name: string; chip?: string };

const clampPct = (v: number) => Math.min(100, Math.max(0, v));

type SplitStyle = CSSProperties & { "--split": string };

/** Section 1: the clip on the left, its workflow under the wiper on the right. */
export function HeroReveal({
  topGraph,
  moves,
  defaultMoveId,
}: {
  topGraph: GraphModel;
  moves: MoveOption[];
  defaultMoveId: string;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const grabbed = useRef(false);
  const [split, setSplit] = useState(50);
  const [move, setMove] = useState(defaultMoveId);
  const [still, setStill] = useState<{ file: File; url: string } | null>(null);
  const [drag, setDrag] = useState(false);

  // One reveal sweep on load; a grabbed handle or reduced motion skips it.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      videoRef.current?.pause();
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      if (grabbed.current) return;
      const p = Math.min(1, (t - t0) / 1600);
      setSplit(50 + 32 * Math.sin(Math.PI * p) ** 2);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(
    () => () => {
      if (still) URL.revokeObjectURL(still.url);
    },
    [still],
  );

  const splitFromClientX = (clientX: number) => {
    const r = panelRef.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setSplit(clampPct(((clientX - r.left) / r.width) * 100));
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    grabbed.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    splitFromClientX(e.clientX);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      splitFromClientX(e.clientX);
    }
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    grabbed.current = true;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setSplit((s) => clampPct(s - 5));
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setSplit((s) => clampPct(s + 5));
    } else if (e.key === "Home") {
      e.preventDefault();
      setSplit(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setSplit(100);
    }
  };

  const pickStill = (file: File | undefined) => {
    if (!file || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      return;
    }
    setStill((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file) };
    });
  };

  const generate = () => {
    if (still) setPendingStill(still.file);
    router.push(`/camera?preset=${move}`);
  };

  const panelStyle: SplitStyle = { "--split": `${split}%` };

  return (
    <section className="pt-16 pb-20 sm:pt-20">
      <h1 className="max-w-3xl font-display text-display font-semibold tracking-tight text-t1">
        Every shot has a workflow. Open it.
      </h1>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pickStill(e.dataTransfer.files?.[0]);
          }}
          className={`flex h-9 min-w-0 items-center overflow-hidden rounded-lg border border-dashed ${
            drag ? "border-ac" : "border-line"
          }`}
        >
          {still ? (
            <>
              <img
                src={still.url}
                alt=""
                className="h-full w-12 flex-none object-cover"
              />
              <span className="max-w-36 truncate px-2 font-mono text-caption text-t2">
                {still.file.name}
              </span>
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => setStill(null)}
                className="grid h-full w-8 flex-none place-items-center text-t3 hover:text-t1"
              >
                <Icon d={SECTION_ICONS.x} className="h-3 w-3" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="h-full px-3 text-caption text-t3 hover:text-t1"
            >
              Drop a still
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              pickStill(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        <span className="text-t3" aria-hidden="true">
          →
        </span>
        <Select value={move} onValueChange={(v) => v && setMove(v)}>
          <SelectTrigger className="h-9 w-auto min-w-40" aria-label="Camera move">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {moves.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
                {m.chip ? ` · ${m.chip}` : ""}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <Button className="h-9 rounded-lg px-4" onClick={generate}>
          Generate
        </Button>
        <Button
          variant="outline"
          className="h-9 rounded-lg"
          render={<Link href={`/workflows/${move}`} />}
        >
          Open workflow
        </Button>
      </div>

      <div
        ref={panelRef}
        className="relative mt-8 aspect-[16/10] overflow-hidden border border-line bg-black select-none"
        style={panelStyle}
      >
        <video
          ref={videoRef}
          src="/explore/examples/ltx25-i2v.mp4"
          poster="/explore/examples/ltx25-i2v.webp"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 bg-black"
          style={{ clipPath: "inset(0 0 0 var(--split))" }}
        >
          <GraphPreview
            model={topGraph}
            label="Orbit workflow graph"
            className="h-full w-full"
          />
        </div>
        <div
          role="slider"
          tabIndex={0}
          aria-label="Reveal the workflow"
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(split)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={onKeyDown}
          className="absolute inset-y-0 left-(--split) z-10 w-8 -translate-x-1/2 cursor-ew-resize touch-none"
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ac" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-line bg-black px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-t2">
            Bring it to light
          </span>
        </div>
      </div>
      <p className="mt-2 font-mono text-caption text-t3">
        Clip: LTX 2.5 image-to-video example, Comfy (MIT). Graph: the Orbit
        preset.
      </p>
    </section>
  );
}
