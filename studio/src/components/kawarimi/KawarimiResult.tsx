"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AddToSequence } from "@/components/sequence/AddToSequence";
import { EditVideoButton } from "@/components/edit/EditVideoButton";
import { PostToSocial } from "@/components/studio/PostToSocial";
import { Icon, SECTION_ICONS } from "@/components/icons";
import { outputUrl } from "@/lib/demo";

const ACTION_CLS =
  "inline-flex h-8 items-center gap-1.5 rounded-lg bg-s2 px-3 text-caption text-t1 hover:bg-s3";

/** The source left and the result right, played and seeked together. */
function SideBySide({
  sourceUrl,
  resultUrl,
  srcRef,
  resRef,
}: {
  sourceUrl: string;
  resultUrl: string;
  srcRef: React.RefObject<HTMLVideoElement | null>;
  resRef: React.RefObject<HTMLVideoElement | null>;
}) {
  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
      <div className="flex min-w-0 flex-1 flex-col items-center">
        <div className="relative">
          <video
            ref={srcRef}
            src={sourceUrl}
            loop
            muted
            playsInline
            className="block h-auto w-auto max-w-full max-h-[70svh] rounded-lg border border-line object-contain lg:max-h-[calc(100cqh_-_140px)]"
          />
          <span className="pointer-events-none absolute top-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-caption text-t1">
            Source
          </span>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-center">
        <div className="relative">
          <video
            ref={resRef}
            src={resultUrl}
            loop
            muted
            playsInline
            className="block h-auto w-auto max-w-full max-h-[70svh] rounded-lg border border-line object-contain lg:max-h-[calc(100cqh_-_140px)]"
          />
          <span className="pointer-events-none absolute top-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-caption text-t1">
            Result
          </span>
        </div>
      </div>
    </div>
  );
}

/** The result clipped over the source by a draggable divider. */
function Wipe({
  sourceUrl,
  resultUrl,
  srcRef,
  resRef,
  pct,
  setPct,
}: {
  sourceUrl: string;
  resultUrl: string;
  srcRef: React.RefObject<HTMLVideoElement | null>;
  resRef: React.RefObject<HTMLVideoElement | null>;
  pct: number;
  setPct: (pct: number) => void;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);

  const pctAt = (clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return pct;
    return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  };

  const drag = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    setPct(pctAt(e.clientX));
  };

  return (
    <div
      ref={frameRef}
      onPointerDown={drag}
      onPointerMove={drag}
      className="relative mx-auto w-fit max-w-full cursor-ew-resize select-none"
    >
      <video
        ref={srcRef}
        src={sourceUrl}
        loop
        muted
        playsInline
        className="block h-auto w-auto max-w-full max-h-[70svh] rounded-lg border border-line object-contain lg:max-h-[calc(100cqh_-_140px)]"
      />
      <video
        ref={resRef}
        src={resultUrl}
        loop
        muted
        playsInline
        style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
        className="absolute inset-0 h-full w-full rounded-lg border border-line object-contain"
      />
      <span className="pointer-events-none absolute top-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-caption text-t1">
        Result
      </span>
      <span className="pointer-events-none absolute top-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-caption text-t1">
        Source
      </span>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Compare position"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-valuetext={`Result covers ${Math.round(pct)}% from the left`}
        onKeyDown={(e) => {
          const step = e.key === "ArrowLeft" || e.key === "ArrowDown" ? -5
            : e.key === "ArrowRight" || e.key === "ArrowUp" ? 5
            : e.key === "Home" ? -pct
            : e.key === "End" ? 100 - pct
            : 0;
          if (step) {
            e.preventDefault();
            setPct(Math.min(100, Math.max(0, pct + step)));
          }
        }}
        className="absolute top-0 bottom-0 w-0.5 -translate-x-1/2 bg-white/80 outline-none before:absolute before:inset-y-0 before:-left-2 before:w-4 focus-visible:bg-ac"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

/** A finished Kawarimi run: before/after with a wipe compare and actions. */
export function KawarimiResult({
  job,
  sourceUrl,
  presetName,
}: {
  job: { presetId: string; outputs: string[] };
  sourceUrl?: string;
  presetName: (id: string) => string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"side" | "wipe">("side");
  const [pct, setPct] = useState(50);
  const [playing, setPlaying] = useState(false);
  const [forking, setForking] = useState(false);
  const [forkError, setForkError] = useState<string | null>(null);
  const srcRef = useRef<HTMLVideoElement | null>(null);
  const resRef = useRef<HTMLVideoElement | null>(null);
  const output = job.outputs[0];
  const resultUrl = output ? outputUrl(output) : "";

  const togglePlay = () => {
    const next = !playing;
    setPlaying(next);
    for (const v of [srcRef.current, resRef.current]) {
      if (!v) continue;
      if (next) void v.play().catch(() => {});
      else v.pause();
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = resRef.current;
    if (!v || !Number.isFinite(v.duration) || v.duration === 0) return;
    const t = (Number(e.target.value) / 1000) * v.duration;
    if (resRef.current) resRef.current.currentTime = t;
    if (srcRef.current && Number.isFinite(srcRef.current.duration)) {
      srcRef.current.currentTime = Math.min(t, srcRef.current.duration);
    }
  };

  const fork = async () => {
    if (forking) return;
    setForking(true);
    setForkError(null);
    try {
      const res = await fetch("/api/forks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ presetId: job.presetId }),
      });
      const body = (await res.json()) as {
        preset?: { id: string };
        error?: string;
        message?: string;
      };
      if (!res.ok || !body.preset) {
        throw new Error(body.error ?? body.message ?? "Fork failed");
      }
      router.push(`/workflows/${body.preset.id}`);
      router.refresh();
    } catch (error) {
      setForkError(error instanceof Error ? error.message : "Fork failed");
    } finally {
      setForking(false);
    }
  };

  if (!output) return null;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto py-2">
        <div className="flex max-h-full w-full flex-col items-center gap-2">
          {mode === "side" || !sourceUrl ? (
            <div className="flex w-full max-w-[1100px] flex-col items-center">
              <SideBySide
                sourceUrl={sourceUrl ?? resultUrl}
                resultUrl={resultUrl}
                srcRef={srcRef}
                resRef={resRef}
              />
            </div>
          ) : (
            <Wipe
              sourceUrl={sourceUrl}
              resultUrl={resultUrl}
              srcRef={srcRef}
              resRef={resRef}
              pct={pct}
              setPct={setPct}
            />
          )}
          <div className="flex w-full max-w-[880px] items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
              className="grid h-8 w-8 place-items-center rounded-lg bg-s2 text-t1 hover:bg-s3"
            >
              <Icon
                d={SECTION_ICONS[playing ? "pause" : "play"]}
                className="h-3.5 w-3.5"
              />
            </button>
            <input
              type="range"
              min={0}
              max={1000}
              defaultValue={0}
              aria-label="Seek"
              onChange={seek}
              onInput={(e) => {
                const t = e.target as HTMLInputElement;
                t.value = t.value;
              }}
              className="min-w-0 flex-1 accent-[#FF5B22]"
            />
            {sourceUrl && (
              <div
                role="group"
                aria-label="Compare view"
                className="flex gap-1 rounded-lg bg-s2 p-0.5"
              >
                {(["side", "wipe"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                    className={`rounded-md px-2 py-1 text-caption capitalize ${
                      mode === m ? "bg-s3 text-t1" : "text-t3 hover:text-t1"
                    }`}
                  >
                    {m === "side" ? "Side by side" : "Wipe"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex w-full flex-wrap items-center justify-between gap-2">
        <span className="truncate text-body text-t1">
          {presetName(job.presetId)}
        </span>
        <span className="flex flex-wrap items-center justify-end gap-1.5">
          <a href={resultUrl} download className={ACTION_CLS}>
            <Icon d={SECTION_ICONS.download} className="h-3.5 w-3.5" />
            Download
          </a>
          <AddToSequence
            path={output}
            className="h-8 rounded-lg border-transparent bg-s2 px-3 text-caption hover:bg-s3"
          />
          <EditVideoButton
            path={output}
            className="h-8 rounded-lg border-transparent bg-s2 px-3 py-0 text-caption text-t1 hover:bg-s3"
          />
          <PostToSocial path={output} className={ACTION_CLS} />
          <Link href={`/workflows/${job.presetId}`} className={ACTION_CLS}>
            View workflow
          </Link>
          <button
            type="button"
            className={ACTION_CLS}
            disabled={forking}
            onClick={() => void fork()}
          >
            <Icon d={SECTION_ICONS.fork} className="h-3.5 w-3.5" />
            Fork
          </button>
          <Link href="/library" className={ACTION_CLS}>
            Open in Library
          </Link>
        </span>
      </div>
      {forkError && (
        <p role="alert" className="mt-1 text-caption text-destructive">
          {forkError}
        </p>
      )}
    </div>
  );
}
