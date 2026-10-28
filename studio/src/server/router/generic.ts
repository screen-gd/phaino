import type { RunResult } from "@comfyorg/sdk";
import type { RouterModelSpec } from "./catalog";
import {
  RouterInputError,
  RouterOutputError,
  type RouterAdapter,
  type RouterOutput,
  type RouterParams,
} from "./types";

/**
 * Generic Router adapter for partner models without a bespoke adapter.
 * Maps the preset's shared params onto the provider family's payload shape,
 * then merges the advanced "Options (JSON)" param so any native field the
 * mapping misses can still be set. Outputs are read with a media scan over
 * the provider's native payload.
 */

function textParam(params: RouterParams, key: string): string {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

function intParam(params: RouterParams, key: string): number | undefined {
  const value = params[key];
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) ? n : undefined;
}

function bareBase64(dataUrl: string): string {
  return dataUrl.replace(/^data:[^;]+;base64,/, "");
}

function aspectParam(params: RouterParams): string | undefined {
  const value = params.aspect;
  return typeof value === "string" && value !== "auto" && value !== "adaptive"
    ? value
    : undefined;
}

/** Parse the raw Options (JSON) param; throws unless it is a JSON object. */
export function parseOptions(params: RouterParams): Record<string, unknown> {
  const raw = textParam(params, "options").trim();
  if (raw === "") return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new RouterInputError("Options must be a JSON object");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new RouterInputError("Options must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

/** Merge the user's raw Options (JSON) object into the request body. */
function mergeOptions(
  body: Record<string, unknown>,
  params: RouterParams,
): Record<string, unknown> {
  return { ...body, ...parseOptions(params) };
}

function buildBody(spec: RouterModelSpec, params: RouterParams, images: Record<string, string>): Record<string, unknown> {
  const prompt = textParam(params, "prompt");
  const image = images.image;
  const videoInput = images.video;
  const duration = intParam(params, "duration");
  const aspect = aspectParam(params);
  switch (spec.shape) {
    case "seedance":
      return {
        content: [
          { type: "text", text: prompt },
          ...(image
            ? [{ type: "image_url", image_url: { url: image }, role: "first_frame" }]
            : []),
        ],
        ...(duration !== undefined ? { duration } : {}),
        ...(aspect !== undefined ? { ratio: aspect } : {}),
      };
    case "kling":
      return {
        prompt,
        ...(duration !== undefined ? { duration: String(duration) } : {}),
        ...(aspect !== undefined ? { aspect_ratio: aspect } : {}),
        ...(image
          ? { image_list: [{ image_url: bareBase64(image), type: "first_frame" }] }
          : {}),
      };
    case "veo":
      return {
        instances: [
          {
            prompt,
            ...(image ? { image: { bytesBase64Encoded: bareBase64(image) } } : {}),
          },
        ],
        parameters: {
          ...(aspect !== undefined ? { aspectRatio: aspect } : {}),
          // Veo accepts 4, 6 or 8 seconds; anything else uses its default.
          ...(duration === 4 || duration === 6 || duration === 8
            ? { durationSeconds: duration }
            : {}),
          sampleCount: 1,
        },
      };
    case "gemini-image":
      return {
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              ...(image
                ? [
                    {
                      inlineData: {
                        data: bareBase64(image),
                        mimeType: image.match(/^data:([^;]+);/)?.[1] ?? "image/png",
                      },
                    },
                  ]
                : []),
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            ...(aspect !== undefined ? { aspectRatio: aspect } : {}),
          },
        },
      };
    case "openai-image":
      return { prompt };
    case "runway":
      return {
        promptText: prompt,
        ...(image ? { promptImage: [{ uri: image }] } : {}),
        ...(videoInput ? { videoUri: videoInput } : {}),
        ...(aspect !== undefined ? { ratio: aspect } : {}),
        ...(duration !== undefined ? { duration } : {}),
      };
    case "bfl":
      return {
        ...(prompt !== "" ? { prompt } : {}),
        ...(image ? { input_image: image } : {}),
        ...(videoInput ? { input_video: videoInput } : {}),
        ...(duration !== undefined ? { duration } : {}),
        ...(aspect !== undefined ? { aspect_ratio: aspect } : {}),
      };
    case "generic":
      return {
        ...(prompt !== "" ? { prompt } : {}),
        ...(image ? { image } : {}),
        ...(videoInput ? { video: videoInput } : {}),
        ...(duration !== undefined ? { duration } : {}),
        ...(aspect !== undefined ? { aspect_ratio: aspect } : {}),
      };
  }
}

// ----- Generic output scan -----

const URLISH_KEY = /(url|uri|video|image|sample|output|result|poster|file|mp4|webm|png|jpe?g|webp)/i;
const B64_KEY = /(b64|base64|bytes|inline|blob|^data$)/i;
const MIME_KEY = /^(mime_?type|content_?type|media_?type)$/i;
const MEDIA_EXT = /\.(png|jpe?g|webp|mp4|mov|webm|gif)(\?|$)/i;
/** Polling and callback links, never media. */
const CONTROL_KEY = /(status|cancel|callback|response|webhook|poll)_?ur[il]/i;

function scanMedia(
  node: unknown,
  category: "image" | "video",
  out: RouterOutput[],
  seen: Set<string>,
  depth: number,
): void {
  if (depth > 8 || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) scanMedia(item, category, out, seen, depth + 1);
    return;
  }
  const obj = node as Record<string, unknown>;
  // A sibling key that supplies the MIME type for base64 fields in this object.
  let siblingMime: string | undefined;
  for (const [k, v] of Object.entries(obj)) {
    if (MIME_KEY.test(k) && typeof v === "string") siblingMime = v;
  }
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value !== "string") continue;
    if (
      !CONTROL_KEY.test(key) &&
      (URLISH_KEY.test(key) || MEDIA_EXT.test(value)) &&
      /^https?:\/\//.test(value) &&
      !seen.has(value)
    ) {
      seen.add(value);
      out.push({ kind: "url", url: value });
      continue;
    }
    if (B64_KEY.test(key) && value.length > 512 && /^[A-Za-z0-9+/=\s]+$/.test(value)) {
      const dedupe = `${key}:${value.length}:${value.slice(0, 64)}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      out.push({
        kind: "base64",
        data: value.replace(/\s+/g, ""),
        mimeType:
          siblingMime ??
          (category === "video" ? "video/mp4" : "image/png"),
      });
      continue;
    }
  }
  for (const value of Object.values(obj)) {
    if (typeof value === "object") scanMedia(value, category, out, seen, depth + 1);
  }
}

/** Read any provider-native payload into media outputs. */
export function readGenericOutputs(
  result: RunResult,
  category: "image" | "video",
): RouterOutput[] {
  if (result.kind === "binary") {
    return [
      {
        kind: "base64",
        data: Buffer.from(result.data).toString("base64"),
        mimeType: result.contentType,
      },
    ];
  }
  const out: RouterOutput[] = [];
  scanMedia(result.data, category, out, new Set(), 0);
  if (out.length === 0) {
    throw new RouterOutputError("No media found in the model response");
  }
  return out.slice(0, 8);
}

/** Build the adapter for a catalog entry. */
export function genericAdapter(spec: RouterModelSpec): RouterAdapter {
  return {
    presetId: spec.presetId,
    model: spec.model,
    buildInput: ({ params, images }) =>
      mergeOptions(buildBody(spec, params, images), params),
    readOutputs: (result) => readGenericOutputs(result, spec.category),
  };
}
