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
