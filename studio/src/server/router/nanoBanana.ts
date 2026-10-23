import { z } from "zod";
import {
  RouterOutputError,
  type RouterAdapter,
  type RouterOutput,
  type RouterParams,
} from "./types";

const imageSizes: ReadonlySet<string> = new Set(["1K", "2K", "4K"]);

const inlineDataSchema = z
  .object({ data: z.string(), mimeType: z.string() })
  .loose();

const partSchema = z.object({ inlineData: inlineDataSchema.optional() }).loose();

const candidateSchema = z
  .object({
    content: z.object({ parts: z.array(partSchema).optional() }).loose().optional(),
  })
  .loose();

const responseSchema = z
  .object({ candidates: z.array(candidateSchema) })
  .loose();

function isImageSize(value: RouterParams[string]): value is "1K" | "2K" | "4K" {
  return typeof value === "string" && imageSizes.has(value);
}

function textParam(params: RouterParams, key: string): string {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

/** Router adapter for Nano Banana 2 text to image. */
export const nanoBananaAdapter: RouterAdapter = {
  presetId: "nano-banana-2",
  model: "vertexai/gemini-3.1-flash-image",
  buildInput: ({ params }) => {
    const aspect = params.aspect;
    const resolution = params.resolution;
    return {
      contents: [
        { role: "user", parts: [{ text: textParam(params, "prompt") }] },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          ...(typeof aspect === "string" && aspect !== "auto"
            ? { aspectRatio: aspect }
            : {}),
          imageSize: isImageSize(resolution) ? resolution : "1K",
        },
      },
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
      throw new RouterOutputError("Unexpected Nano Banana 2 response");
    }
    const outputs: RouterOutput[] = [];
    for (const candidate of parsed.data.candidates) {
      for (const part of candidate.content?.parts ?? []) {
        if (part.inlineData) {
          outputs.push({
            kind: "base64",
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          });
        }
      }
    }
    return outputs;
  },
};
