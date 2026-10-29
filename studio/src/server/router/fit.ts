import schemas from "./schemas.json" with { type: "json" };

/**
 * Fit a guessed Router request body to the model's published input schema
 * (snapshot in schemas.json, refreshed by `pnpm router:schemas`): move the
 * prompt, media, duration and aspect onto the field names the model uses,
 * fill required fields from schema defaults or enums, and drop fields the
 * model does not declare. Models without an authored schema pass through.
 */

type Prop = {
  type?: string;
  enum?: unknown[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  items?: string;
  required?: string[];
  props?: Record<string, Prop>;
};
type Schema = { required: string[]; props: Record<string, Prop> } | null;
type Json = Record<string, unknown>;

const SCHEMAS = schemas as unknown as Record<string, Schema>;

const PROMPT_KEYS = ["prompt", "promptText", "prompt_text", "positivePrompt", "text_prompt", "instruction", "text"];
const IMAGE_KEYS = ["image", "image_url", "img_url", "input_image", "promptImage", "image_ref", "first_frame_image", "start_image"];
const IMAGE_LIST_KEYS = ["image_urls", "images", "reference_images", "input_images"];
const VIDEO_KEYS = ["video", "video_url", "input_video", "videoUri", "video_uri", "start_video", "source_uri"];
const DURATION_KEYS = ["duration", "duration_s", "durationSeconds", "seconds"];
const ASPECT_KEYS = ["aspect_ratio", "ratio", "aspectRatio"];

export type FitInput = {
  prompt: string;
  image?: string;
  video?: string;
  duration?: number;
  aspect?: string;
};

/** The published schema, null when unauthored, undefined when Router lacks the model. */
export function schemaFor(model: string): Schema | undefined {
  return model in SCHEMAS ? SCHEMAS[model] : undefined;
}

const has = (props: Record<string, Prop>, keys: readonly string[]) => keys.find((k) => k in props);

function coerceNumber(p: Prop, n: number): unknown {
  if (Array.isArray(p.enum) && p.enum.length > 0) {
    const nums = p.enum.map(Number).filter((x) => Number.isFinite(x));
    if (nums.length === 0) return undefined;
    const best = nums.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a));
    return p.enum.find((e) => Number(e) === best);
  }
  let v = n;
  if (p.minimum !== undefined) v = Math.max(p.minimum, v);
  if (p.maximum !== undefined) v = Math.min(p.maximum, v);
  return p.type === "string" ? String(v) : v;
}

/** A value for a required field nobody set, or undefined when none is safe. */
function fillRequired(key: string, p: Prop): unknown {
  if (p.default !== undefined) return p.default;
  if (Array.isArray(p.enum) && p.enum.length > 0) {
    if (key === "resolution") {
      const pick = p.enum.find((e) => /1080/.test(String(e))) ?? p.enum.find((e) => /720/.test(String(e)));
      if (pick !== undefined) return pick;
    }
    return p.enum[0];
  }
  if (key === "seed" && (p.type === "integer" || p.type === "number")) {
    return Math.floor(Math.random() * Math.min(p.maximum ?? 2147483647, 2147483647));
  }
  return undefined;
}

/** Place the canonical values onto one object level of the schema. */
function placeOnto(out: Json, props: Record<string, Prop>, input: FitInput, level: "top" | "input" | "parameters") {
  const set = (key: string | undefined, value: unknown) => {
    if (key && value !== undefined && out[key] === undefined) out[key] = value;
  };
  if (level !== "parameters") {
    if (input.prompt !== "" && !has(props, PROMPT_KEYS.filter((k) => out[k] !== undefined))) {
      const key = has(props, PROMPT_KEYS);
      if (key && (props[key].type === undefined || props[key].type === "string")) set(key, input.prompt);
    }
    if (input.image && !Object.keys(out).some((k) => IMAGE_KEYS.includes(k) || IMAGE_LIST_KEYS.includes(k))) {
      const single = has(props, IMAGE_KEYS);
      const list = has(props, IMAGE_LIST_KEYS);
      if (single) set(single, input.image);
      else if (list) set(list, [input.image]);
    }
    if (input.video && !Object.keys(out).some((k) => VIDEO_KEYS.includes(k))) {
      set(has(props, VIDEO_KEYS), input.video);
    }
  }
  if (level !== "input") {
    const dKey = has(props, DURATION_KEYS);
    if (dKey && input.duration !== undefined && out[dKey] === undefined) {
      set(dKey, coerceNumber(props[dKey], input.duration));
    }
    const aKey = has(props, ASPECT_KEYS);
    if (aKey && input.aspect && out[aKey] === undefined) {
      const p = props[aKey];
      if (!Array.isArray(p.enum) || p.enum.includes(input.aspect)) set(aKey, input.aspect);
    }
  }
}

/** Drop keys the schema does not declare. */
function strip(out: Json, props: Record<string, Prop> | undefined) {
  if (!props || Object.keys(props).length === 0) return;
  for (const k of Object.keys(out)) if (!(k in props)) delete out[k];
}

/** Fill required keys from defaults or enums. Returns the ones still missing. */
function settle(out: Json, schema: { required?: string[]; props?: Record<string, Prop> }): string[] {
  const props = schema.props ?? {};
  const missing: string[] = [];
  for (const key of schema.required ?? []) {
    if (out[key] !== undefined) continue;
    const value = props[key] ? fillRequired(key, props[key]) : undefined;
    if (value === undefined) missing.push(key);
    else out[key] = value;
  }
  return missing;
}

export function fitToSchema(model: string, body: Json, input: FitInput): { body: Json; missing: string[] } {
  const schema = schemaFor(model);
  if (!schema) return { body, missing: [] };
  const out: Json = { ...body };
  strip(out, schema.props);
  const missing: string[] = [];
  for (const level of ["input", "parameters"] as const) {
    const p = schema.props[level];
    if (p?.type === "object" && p.props) {
      const nested: Json = { ...((out[level] as Json | undefined) ?? {}) };
      strip(nested, p.props);
      placeOnto(nested, p.props, input, level);
      missing.push(...settle(nested, p).map((k) => `${level}.${k}`));
      if (Object.keys(nested).length > 0 || schema.required.includes(level)) out[level] = nested;
    }
  }
  placeOnto(out, schema.props, input, "top");
  missing.push(...settle(out, schema));
  return { body: out, missing };
}
