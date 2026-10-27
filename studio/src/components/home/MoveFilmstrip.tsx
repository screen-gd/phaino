import Link from "next/link";

export type MoveFrame = { id: string; name: string; chip?: string };

/** One motion path per camera move, drawn in a 160x90 box. */
const MOVE_PATHS: Record<string, string> = {
  // Elliptical orbit with an arrowhead on the return leg.
  orbit: "M 80 17 a 55 28 0 1 1 -0.1 0 M 80 17 l -9 -4 M 80 17 l -9 5",
  // Straight push toward the centre.
  "dolly-in": "M 14 45 h 96 m -11 -8 l 11 8 l -11 8",
  // Radial burst into the centre.
  "crash-zoom":
    "M 12 12 L 66 38 M 148 12 L 94 38 M 12 78 L 66 52 M 148 78 L 94 52 M 80 6 L 80 32 M 80 84 L 80 58",
  // Fast horizontal sweep with streaks above and below.
  "whip-pan": "M 8 45 h 128 m -12 -8 l 12 8 l -12 8 M 26 60 h 92 M 26 30 h 92",
  // Low to high, pulling back up and right.
  "drone-pull-out": "M 18 74 C 60 72 92 50 138 20 m -11 1 l 11 -1 l -1 11",
  // A full closed ring around the subject.
  "bullet-time": "M 80 18 a 52 27 0 1 1 -0.1 0 z",
  // S-curve swooping down into a dive.
  "fpv-dive": "M 12 14 C 55 14 40 46 78 52 S 132 64 146 80 m -12 -1 l 12 1 l -7 10",
};

/** Section 2: seven camera presets as a filmstrip of motion-path frames. */
export function MoveFilmstrip({ moves }: { moves: MoveFrame[] }) {
  return (
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 xl:grid xl:grid-cols-7 xl:overflow-visible">
      {moves.map((m) => (
        <Link
          key={m.id}
          href={`/camera?preset=${m.id}`}
          className="group w-44 flex-none snap-start sm:w-52 xl:w-auto"
        >
          <div className="relative aspect-video overflow-hidden border border-line">
            <img
              src={`/api/presets/${m.id}/thumb`}
              alt=""
              width={320}
              height={180}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            {MOVE_PATHS[m.id] && (
              <svg
                viewBox="0 0 160 90"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                <path
                  d={MOVE_PATHS[m.id]}
                  fill="none"
                  stroke="var(--color-ac)"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  opacity={0.35}
                />
                <path
                  d={MOVE_PATHS[m.id]}
                  fill="none"
                  stroke="var(--color-ac)"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  pathLength={1}
                  className="[stroke-dasharray:1] [stroke-dashoffset:1] transition-[stroke-dashoffset] duration-[600ms] ease-out group-hover:[stroke-dashoffset:0] group-focus-visible:[stroke-dashoffset:0] motion-reduce:transition-none"
                />
              </svg>
            )}
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-body text-t1">{m.name}</span>
            {m.chip && (
              <span className="font-mono text-caption text-t3">{m.chip}</span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
