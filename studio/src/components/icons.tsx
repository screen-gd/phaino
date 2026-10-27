import { RUNE_ICONS, type RuneIcon } from "./icons/rune";

/**
 * Icon set: Rune Icons (duotone, Apache-2.0 — see THIRD_PARTY_NOTICES.md).
 * A name resolves to a RuneIcon (two-tone layers in currentColor); custom
 * glyphs below render as a single stroked path.
 */
const CUSTOM_PATHS = {
  gem: "M6 3h12l4 6-10 13L2 9l4-6zM2 9h20",
  dice: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 8.5h.01M15.5 8.5h.01M15.5 15.5h.01M8.5 15.5h.01M12 12h.01",
  fit: "M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M16 21h3a2 2 0 0 0 2-2v-3M8 21H5a2 2 0 0 1-2-2v-3",
  loader: "M21 12a9 9 0 1 1-6.219-8.56",
  scissors: "M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.5 7.5L20 19M8.5 16.5L20 5",
  redo: "M21 12c0 5.5-4 9-9 9s-9-3.5-9-9 4-9 9-9c3.6 0 6.6 2 8.3 5M21 3v5h-5",
  type: "M5 6V4h14v2M12 4v16m-3 0h6",
} as const;

export type IconName = keyof typeof RUNE_ICONS | keyof typeof CUSTOM_PATHS;

type CustomPath = (typeof CUSTOM_PATHS)[keyof typeof CUSTOM_PATHS];

export type IconSource = RuneIcon | CustomPath;

export const SECTION_ICONS: Record<IconName, IconSource> = {
  ...RUNE_ICONS,
  ...CUSTOM_PATHS,
};

const GITHUB_MARK =
  "M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.05.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z";

export function Icon({ d, className }: { d: IconSource; className?: string }) {
  if (typeof d === "string") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={className ?? "h-5 w-5"}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={d} />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className ?? "h-5 w-5"}
      fill="none"
    >
      {d.layers.map((layer, i) =>
        layer.kind === "stroke" ? (
          <path
            key={i}
            d={layer.d}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={layer.role === "secondary" ? 0.35 : 1}
          />
        ) : (
          <path
            key={i}
            d={layer.d}
            fill="currentColor"
            opacity={layer.role === "secondary" ? 0.35 : 1}
          />
        ),
      )}
    </svg>
  );
}

export function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className ?? "h-4 w-4"} fill="currentColor">
      <path d={GITHUB_MARK} />
    </svg>
  );
}
