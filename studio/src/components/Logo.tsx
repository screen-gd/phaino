/** Phaino mark: two filled ribbons on a 100x100 grid, colored via currentColor. */
export function PhainoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M0 19 Q0 9.5 9 9 Q55 3 100 1 V20 Q45 30 0 55 Z" />
      <path d="M100 30 V100 H4 Q0 100 0 96 V70 Q50 42 100 30 Z" />
    </svg>
  );
}
