import { z } from "zod";
import {
  RouterInputError,
  RouterOutputError,
  type RouterAdapter,
  type RouterParams,
} from "./types";

const responseSchema = z
  .object({
    data: z
      .object({
        task_result: z
          .object({ videos: z.array(z.object({ url: z.string() }).loose()) })
          .loose(),
      })
      .loose(),
  })
  .loose();

function textParam(params: RouterParams, key: string): string {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

function durationParam(params: RouterParams, key: string, fallback: number): number {
  const value = params[key];
  return typeof value === "number" && Number.isInteger(value) ? value : fallback;
}

/** Router adapter for Kling 3.0 first frame to video. */
export const klingAdapter: RouterAdapter = {
  presetId: "kling3-video",
  model: "kling/kling-v3-omni",
  buildInput: ({ params, images }) => {
    const p1 = textParam(params, "prompt");
    const p2 = textParam(params, "prompt2");
    const d1 = durationParam(params, "duration", 2);
    const d2 = durationParam(params, "duration2", 3);
    const total = d1 + d2;
    if (total < 3 || total > 15) {
      throw new RouterInputError("Kling 3.0 total length must be 3 to 15 seconds");
    }
    const image = images.image;
    const common = {
      duration: String(total),
      mode: params.resolution === "720p" ? "std" : "pro",
      ...(image
        ? {
            image_list: [
              {
                image_url: image.replace(/^data:[^;]+;base64,/, ""),
                type: "first_frame",
              },
            ],
          }
        : {}),
    };
    if (p2.trim()) {
      return {
        multi_shot: true,
        shot_type: "customize",
        multi_prompt: [
          { index: 1, prompt: p1, duration: String(d1) },
          { index: 2, prompt: p2, duration: String(d2) },
        ],
        ...common,
      };
    }
    return { prompt: p1, ...common };
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
      throw new RouterOutputError("Unexpected Kling 3.0 response");
    }
    return parsed.data.data.task_result.videos.map(({ url }) => ({
      kind: "url",
      url,
    }));
  },
};
