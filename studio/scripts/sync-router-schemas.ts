/**
 * Snapshot Router's published input schema for every catalog model into
 * src/server/router/schemas.json, trimmed to what request fitting needs:
 * required keys and, per property, type, enum, default, bounds and item type,
 * one level into nested objects (e.g. DashScope's input/parameters).
 *
 * `pnpm router:schemas` with a Comfy key in COMFY_API_KEY or .data/comfy.json.
 * Reads only; never runs a model. Models Router no longer serves are left
 * out, which hides them from the catalog.
 */
import fs from "node:fs";
import path from "node:path";

type Json = Record<string, unknown>;
export type PropSchema = {
  type?: string;
  enum?: unknown[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  items?: string;
  required?: string[];
  props?: Record<string, PropSchema>;
};
export type ModelSchema = { required: string[]; props: Record<string, PropSchema> } | null;

const root = path.resolve(import.meta.dirname, "..");
const key =
  process.env.COMFY_API_KEY ??
  (JSON.parse(fs.readFileSync(path.join(root, ".data/comfy.json"), "utf8")) as {
    credentials: { apiKey: string };
  }).credentials.apiKey;

function typeOf(s: Json): string | undefined {
  if (typeof s.type === "string") return s.type;
  for (const k of ["oneOf", "anyOf"] as const) {
    const opts = s[k] as Json[] | undefined;
    const t = opts?.map((o) => o.type).find((x) => typeof x === "string" && x !== "null");
    if (typeof t === "string") return t;
  }
  return s.properties ? "object" : undefined;
}

function trim(s: Json, depth: number): PropSchema {
  const out: PropSchema = {};
  const type = typeOf(s);
  if (type) out.type = type;
  if (Array.isArray(s.enum)) out.enum = s.enum;
  if ("default" in s) out.default = s.default;
  if (typeof s.minimum === "number") out.minimum = s.minimum;
  if (typeof s.maximum === "number") out.maximum = s.maximum;
  const items = s.items as Json | undefined;
  if (items) out.items = typeOf(items);
  if (depth === 0 && s.properties) {
    out.required = (s.required as string[] | undefined) ?? [];
    out.props = Object.fromEntries(
      Object.entries(s.properties as Record<string, Json>).map(([k, v]) => [k, trim(v, 1)]),
    );
  }
  return out;
}

/** Undefined when Router no longer serves the model. */
async function fetchSchema(model: string): Promise<ModelSchema | undefined> {
  const res = await fetch(`https://api.comfy.org/v2/models/${model}/openapi.json`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`${model}: HTTP ${res.status}`);
  const doc = (await res.json()) as Json;
  if (doc["x-comfy-input-schema-authored"] !== true) return null;
  const post = (Object.values(doc.paths as Json)[0] as Json).post as Json;
  const schema = ((post.requestBody as Json).content as Json)["application/json"] as Json;
  const s = schema.schema as Json;
  return {
    required: (s.required as string[] | undefined) ?? [],
    props: Object.fromEntries(
      Object.entries((s.properties as Record<string, Json>) ?? {}).map(([k, v]) => [k, trim(v, 0)]),
    ),
  };
}

const out: Record<string, ModelSchema> = {};
// Read ids from the adapter sources; catalog.ts imports this snapshot itself.
const models = [
  ...new Set(
    ["catalog.ts", "kawarimi.ts"].flatMap((file) =>
      [
        ...fs
          .readFileSync(path.join(root, "src/server/router", file), "utf8")
          .matchAll(/model: "([^"]+)"/g),
      ].map((m) => m[1]),
    ),
  ),
];
for (let i = 0; i < models.length; i += 12) {
  await Promise.all(
    models.slice(i, i + 12).map(async (m) => {
      const schema = await fetchSchema(m);
      if (schema === undefined) console.warn(`Not on Router: ${m}`);
      else out[m] = schema;
    }),
  );
}
const sorted = Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
fs.writeFileSync(
  path.join(root, "src/server/router/schemas.json"),
  `${JSON.stringify(sorted, null, 1)}\n`,
);
console.log(`Wrote ${models.length} schemas`);
