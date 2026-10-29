import { describe, expect, it } from "vitest";
import { ROUTER_CATALOG, ROUTER_MODELS } from "./catalog";
import { schemaFor } from "./fit";
import { genericAdapter } from "./generic";

const png = "data:image/png;base64," + "a".repeat(64);
const mp4 = "data:video/mp4;base64," + "b".repeat(64);

describe("catalog requests against Router's published schemas", () => {
  it("every offered model sends each required field", () => {
    const failures: string[] = [];
    for (const spec of ROUTER_CATALOG) {
      const schema = schemaFor(spec.model);
      if (!schema) continue;
      const images: Record<string, string> = {};
      if (spec.input) images[spec.input.key] = spec.input.type === "video" ? mp4 : png;
      const body = genericAdapter(spec).buildInput({
        params: { prompt: "p", ...(spec.category === "video" ? { duration: 5 } : {}) },
        images,
      }) as Record<string, Record<string, unknown> | unknown>;
      const missing = schema.required.filter((k) => body[k] === undefined);
      for (const level of ["input", "parameters"] as const) {
        const nested = schema.props[level];
        for (const k of nested?.required ?? []) {
          if ((body[level] as Record<string, unknown> | undefined)?.[k] === undefined) missing.push(`${level}.${k}`);
        }
      }
      if (missing.length) failures.push(`${spec.presetId}: ${missing.join(", ")}`);
    }
    expect(failures).toEqual([]);
  });

  it("keeps the flagship models", () => {
    const ids = new Set(ROUTER_CATALOG.map((s) => s.presetId));
    for (const id of ["veo-3-1", "kling-v3", "seedance-2-0", "gemini-3-pro-image", "gpt-image-2", "seedream-5-0-pro", "flux-3-image", "minimax-h3", "runway-gen4-turbo"]) {
      expect(ids, id).toContain(id);
    }
  });

  it("hides models Router no longer serves", () => {
    const gone = ROUTER_MODELS.filter((s) => schemaFor(s.model) === undefined);
    for (const s of gone) expect(ROUTER_CATALOG).not.toContain(s);
  });
});

describe("fitToSchema coercion", () => {
  it("coerces a family duration onto the model's enum", () => {
    const spec = ROUTER_CATALOG.find((s) => s.presetId === "ltx-2-5-fast");
    expect(spec).toBeDefined();
    const body = genericAdapter(spec!).buildInput({ params: { prompt: "p", duration: 7 }, images: {} });
    expect(body.duration).toBe(6);
  });

  it("drops an aspect the model's enum does not allow", () => {
    const spec = ROUTER_CATALOG.find((s) => s.presetId === "wan-2-7-t2v");
    const body = genericAdapter(spec!).buildInput({ params: { prompt: "p", aspect: "21:9" }, images: {} }) as {
      parameters?: Record<string, unknown>;
    };
    expect(body.parameters?.ratio).toBeUndefined();
  });
});
