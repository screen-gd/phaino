import "server-only";

import { z } from "zod";

const repoSchema = z.object({ stargazers_count: z.number() });

export const GITHUB_REPO_URL = "https://github.com/screen-gd/phaino";

const RETRY_AFTER_FAILURE_MS = 10 * 60_000;
let failedAt = 0;

/**
 * Stargazers for the repo, hourly refresh; null on any failure. A failure
 * skips GitHub for 10 minutes so an offline machine doesn't wait on every page.
 */
export async function getGitHubStars(): Promise<number | null> {
  if (Date.now() - failedAt < RETRY_AFTER_FAILURE_MS) return null;
  try {
    const res = await fetch("https://api.github.com/repos/screen-gd/phaino", {
      next: { revalidate: 3600 },
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    return repoSchema.parse(await res.json()).stargazers_count;
  } catch {
    failedAt = Date.now();
    return null;
  }
}
