import { z } from "zod";
import {
  RouterOutputError,
  type RouterAdapter,
  type RouterParams,
} from "./types";

const resolutions: ReadonlySet<string> = new Set(["480p", "720p", "1080p"]);

const ratios: ReadonlySet<string> = new Set([
  "adaptive",
  "16:9",
  "9:16",
  "1:1",
]);

const responseSchema = z
  .object({ content: z.object({ video_url: z.string() }).loose() })
  .loose();

function isResolution(
  value: RouterParams[string],
): value is "480p" | "720p" | "1080p" {
  return typeof value === "string" && resolutions.has(value);
}

function isRatio(
  value: RouterParams[string],
): value is "adaptive" | "16:9" | "9:16" | "1:1" {
  return typeof value === "string" && ratios.has(value);
}

function durationParam(params: RouterParams): number {
  const value = params.duration;
  return typeof value === "number" && Number.isInteger(value) ? value : 5;
}

function textParam(params: RouterParams, key: string): string {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

/** Router adapter for Seedance 2.5 first frame to video. */
export const seedanceAdapter: RouterAdapter = {
  presetId: "seedance25-i2v",
  model: "byteplus/dreamina-seedance-2-5-260628",
  buildInput: ({ params, images }) => {
    const image = images.image;
    const resolution = params.resolution;
    const ratio = params.ratio;
    return {
      content: [
        { type: "text", text: textParam(params, "prompt") },
        ...(image
          ? [
              {
                type: "image_url",
                image_url: { url: image },
                role: "first_frame",
              },
            ]
          : []),
      ],
      duration: durationParam(params),
      resolution: isResolution(resolution) ? resolution : "1080p",
      ratio: isRatio(ratio) ? ratio : "adaptive",
    };
  },
  readOutputs: (result) => {
    if (result.kind === "binary") {
      return [
        {
          kind: "base64",
          data: Buffer.from(result.data).toString("base64"),
          mimeType: result.contentType,
        },
      ];
    }
    const parsed = responseSchema.safeParse(result.data);
    if (!parsed.success) {
      throw new RouterOutputError("Unexpected Seedance 2.5 response");
    }
    return [{ kind: "url", url: parsed.data.content.video_url }];
  },
};
