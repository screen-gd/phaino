import "server-only";

import { z } from "zod";
import { getEnv, type StudioEnv } from "@/server/env";
import { comfyTarget } from "./client";

const balanceSchema = z.object({
  amount_micros: z.number(),
  effective_balance_micros: z.number().optional(),
  currency: z.string(),
});

const TIMEOUT_MS = 5_000;
const CACHE_MS = 60_000;

/**
 * The frontend treats the *_micros values as cents: CREDITS_PER_USD = 211,
 * centsToCredits = round(cents * 211 / 100).
 * packages/shared-frontend-utils/src/creditsUtil.ts
 */
export function microsToCredits(micros: number): number {
  return Math.round((micros * 211) / 100);
}

let cache: { key: string; at: number; credits: number | null } | null = null;

export function clearBalanceCache() {
  cache = null;
}

/**
 * Best-effort balance for the active key (Settings key wins, then
 * COMFY_API_KEY). Cached 60s per key. Any error yields null; the key and
 * upstream body never leave this function.
 */
export async function getComfyBalance(
  env: StudioEnv = getEnv(),
  fetchImpl: typeof fetch = fetch,
): Promise<number | null> {
  const target = comfyTarget(env);
  const apiKey = target.apiKey;
  if (!apiKey) return null;

  const memoKey = `${target.baseUrl}:${apiKey}`;
  if (cache && cache.key === memoKey && Date.now() - cache.at < CACHE_MS) {
    return cache.credits;
  }

  try {
    const res = await fetchImpl("https://api.comfy.org/customers/balance", {
      headers: { "X-API-KEY": apiKey },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      cache = { key: memoKey, at: Date.now(), credits: null };
      return null;
    }
    const body = balanceSchema.parse(await res.json());
    const credits = microsToCredits(
      body.effective_balance_micros ?? body.amount_micros,
    );
    cache = { key: memoKey, at: Date.now(), credits };
    return credits;
  } catch {
    cache = { key: memoKey, at: Date.now(), credits: null };
    return null;
  }
}
