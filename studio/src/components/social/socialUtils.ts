export type SocialOutput = {
  relPath: string;
  name: string;
  kind: string;
  mtime: number;
};

/** Newest first by mtime; equal times keep input order. */
export function sortOutputsNewest<T extends { mtime: number }>(
  items: readonly T[],
): T[] {
  return [...items].sort((a, b) => b.mtime - a.mtime);
}
