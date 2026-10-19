import "server-only";

import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { SocialError } from "@opencoredev/social-sdk";
import { Readable } from "node:stream";

const UPLOAD_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
} as const;

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const UPLOAD_ID = /^[0-9a-f-]{36}\.(png|jpe?g|webp)$/;

function invalid(message: string): SocialError {
  return new SocialError({ code: "invalid_input", operation: "uploads", message });
}

export function uploadsDir(dataDir: string) {
  return path.join(dataDir, "uploads");
}

/** Save a multipart upload under ${dataDir}/uploads/<uuid>.<ext>. */
export async function saveUpload(
  dataDir: string,
  file: File,
  newId: () => string,
): Promise<{ uploadId: string; previewUrl: string }> {
  const mime = (file.type || "").toLowerCase();
  const ext = (Object.keys(UPLOAD_TYPES) as (keyof typeof UPLOAD_TYPES)[]).find(
    (e) => UPLOAD_TYPES[e] === mime,
  );
  if (!ext) throw invalid("Only png, jpg and webp images are accepted");
  if (file.size > MAX_UPLOAD_BYTES) throw invalid("File exceeds the 25 MB limit");
  const id = `${newId()}${ext}`;
  const dir = uploadsDir(dataDir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, id), Buffer.from(await file.arrayBuffer()));
  return { uploadId: id, previewUrl: `/api/uploads/${id}` };
}

/** Resolve an upload id strictly inside ${dataDir}/uploads. */
export function resolveUpload(
  dataDir: string,
  uploadId: string,
): { absPath: string; mimeType: string } {
  if (typeof uploadId !== "string" || !UPLOAD_ID.test(uploadId)) {
    throw invalid("Unknown upload");
  }
  const dir = uploadsDir(dataDir);
  const abs = path.resolve(dir, uploadId);
  const rel = path.relative(dir, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw invalid("Unknown upload");
  }
  return { absPath: abs, mimeType: UPLOAD_TYPES[path.extname(abs) as keyof typeof UPLOAD_TYPES] };
}

/** Stream an upload for preview, or 404-shaped SocialError when missing. */
export async function openUpload(dataDir: string, uploadId: string) {
  const resolved = resolveUpload(dataDir, uploadId);
  let size: number;
  try {
    size = (await stat(resolved.absPath)).size;
  } catch {
    throw new SocialError({
      code: "not_found",
      operation: "uploads.read",
      message: "Upload not found",
    });
  }
  return {
    stream: Readable.toWeb(createReadStream(resolved.absPath)) as ReadableStream<Uint8Array>,
    mimeType: resolved.mimeType,
    size,
  };
}
