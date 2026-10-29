import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { RouterOutputError, type RouterOutput } from "./adapters";

const urlExtension = z.enum([
  ".png", ".jpg", ".jpeg", ".webp", ".mp4", ".mov", ".webm",
]);

/** File extension for a media MIME type, ignoring case and parameters. */
export function extForMime(mime: string): string {
  switch (mime.split(";")[0].trim().toLowerCase()) {
    case "image/png": return ".png";
    case "image/jpeg": return ".jpg";
    case "image/webp": return ".webp";
    case "video/mp4": return ".mp4";
    case "video/quicktime": return ".mov";
    case "video/webm": return ".webm";
    default: return ".bin";
  }
}

/** Read a resolved upload into a data URL for a Router model. */
export async function uploadDataUrl(
  upload: { absPath: string; mimeType: string },
): Promise<string> {
  const bytes = await readFile(upload.absPath);
  return `data:${upload.mimeType};base64,${bytes.toString("base64")}`;
}

const storageSchema = z.object({
  upload_url: z.string(),
  download_url: z.string(),
});

/**
 * Upload a resolved upload to Comfy storage and return its public https URL,
 * for Router models that refuse base64 video.
 */
export async function uploadComfyMedia(
  upload: { absPath: string; mimeType: string },
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const bytes = await readFile(upload.absPath);
  const res = await fetchImpl("https://api.comfy.org/customers/storage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_name: path.basename(upload.absPath),
      content_type: upload.mimeType,
    }),
  });
  if (!res.ok) {
    throw new RouterOutputError(`Storage request failed (${res.status})`);
  }
  const { upload_url, download_url } = storageSchema.parse(await res.json());
  const put = await fetchImpl(upload_url, {
    method: "PUT",
    headers: { "Content-Type": upload.mimeType },
    body: new Uint8Array(bytes),
  });
  if (!put.ok) {
    throw new RouterOutputError(`Storage upload failed (${put.status})`);
  }
  return download_url;
}

/** Save Router media with its resolved extension and return the written path. */
export async function saveRouterOutput(
  output: RouterOutput,
  destNoExt: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  let bytes: Buffer;
  let ext: string;
  if (output.kind === "url") {
    const response = await fetchImpl(output.url);
    if (!response.ok) {
      throw new RouterOutputError(`Download failed (${response.status})`);
    }
    ext = extForMime(response.headers.get("content-type") ?? "");
    if (ext === ".bin") {
      const parsed = urlExtension.safeParse(
        path.extname(new URL(output.url).pathname).toLowerCase(),
      );
      if (parsed.success) {
        ext = parsed.data === ".jpeg" ? ".jpg" : parsed.data;
      }
    }
    bytes = Buffer.from(await response.arrayBuffer());
  } else {
    ext = extForMime(output.mimeType);
    bytes = Buffer.from(output.data, "base64");
  }
  const dest = `${destNoExt}${ext}`;
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, bytes);
  return dest;
}
