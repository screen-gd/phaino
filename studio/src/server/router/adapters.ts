import { ROUTER_CATALOG } from "./catalog";
import { genericAdapter } from "./generic";
import { KAWARIMI_ADAPTERS } from "./kawarimi";
import { klingAdapter } from "./kling";
import { nanoBananaAdapter } from "./nanoBanana";
import { seedanceAdapter } from "./seedance";
import type { RouterAdapter } from "./types";

export { RouterInputError, RouterOutputError } from "./types";
export type {
  RouterAdapter,
  RouterImages,
  RouterOutput,
  RouterParams,
} from "./types";

/** Registered preset adapters for Comfy Router. */
export const ROUTER_ADAPTERS: readonly RouterAdapter[] = [
  nanoBananaAdapter,
  seedanceAdapter,
  klingAdapter,
  ...KAWARIMI_ADAPTERS,
  ...ROUTER_CATALOG.map(genericAdapter),
];

/** Find the adapter for a preset in the supplied registry. */
export function findAdapter(
  adapters: readonly RouterAdapter[],
  presetId: string,
): RouterAdapter | null {
  return adapters.find((adapter) => adapter.presetId === presetId) ?? null;
}

/** Find the registered Router adapter for a preset. */
export function routerAdapterFor(presetId: string): RouterAdapter | null {
  return findAdapter(ROUTER_ADAPTERS, presetId);
}
