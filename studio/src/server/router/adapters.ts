import type { RunResult } from "@comfyorg/sdk";

/** Preset parameter values passed to a Router adapter. */
export type RouterParams = Record<string, string | number | boolean>;

/** Input image data URLs keyed by preset input key. */
export type RouterImages = Record<string, string>;

/** Media returned by a Router model as a URL or base64 bytes. */
export type RouterOutput =
  | { kind: "url"; url: string }
  | { kind: "base64"; data: string; mimeType: string };

/** Maps a preset to a canonical "{provider}/{model}" Router id and payloads. */
export type RouterAdapter = {
  presetId: string;
  model: string;
  buildInput(job: { params: RouterParams; images: RouterImages }): Record<string, unknown>;
  readOutputs(result: RunResult): RouterOutput[];
};

/** A Router result that could not be read or downloaded. */
export class RouterOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RouterOutputError";
  }
}

/** Registered preset adapters for Comfy Router. */
export const ROUTER_ADAPTERS: readonly RouterAdapter[] = [];

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
