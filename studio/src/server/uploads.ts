import "server-only";

import { createReadStream } from "node:fs";
import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { SocialError } from "@opencoredev/social-sdk";
import { Readable } from "node:stream";

const UPLOAD_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
} as const;

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_UPLOAD_BYTES = 500 * 1024 * 1024;

const UPLOAD_ID = /^[0-9a-f-]{36}\.(png|jpe?g|webp|mp4|mov|webm)$/;

const isVideoExt = (ext: string) =>
  ext === ".mp4" || ext === ".mov" || ext === ".webm";

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
  if (!ext) {
    throw invalid("Only png, jpg, webp images and mp4, mov, webm videos are accepted");
  }
  const maxBytes = isVideoExt(ext) ? MAX_VIDEO_UPLOAD_BYTES : MAX_UPLOAD_BYTES;
  if (file.size > maxBytes) {
    throw invalid(`File exceeds the ${isVideoExt(ext) ? "500 MB" : "25 MB"} limit`);
  }
  const id = `${newId()}${ext}`;
  const dir = uploadsDir(dataDir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, id), Buffer.from(await file.arrayBuffer()));
  return { uploadId: id, previewUrl: `/api/uploads/${id}` };
}

/** Copy an existing media file into ${dataDir}/uploads, same contract as saveUpload. */
export async function saveUploadFromPath(
  dataDir: string,
  absPath: string,
  newId: () => string,
): Promise<{ uploadId: string; previewUrl: string }> {
  const ext = path.extname(absPath).toLowerCase();
  if (!(ext in UPLOAD_TYPES)) {
    throw invalid("Only png, jpg, webp images and mp4, mov, webm videos are accepted");
  }
  const info = await stat(absPath);
  const maxBytes = isVideoExt(ext) ? MAX_VIDEO_UPLOAD_BYTES : MAX_UPLOAD_BYTES;
  if (!info.isFile() || info.size > maxBytes) {
    throw invalid(`File exceeds the ${isVideoExt(ext) ? "500 MB" : "25 MB"} limit`);
  }
  const id = `${newId()}${ext}`;
  const dir = uploadsDir(dataDir);
  await mkdir(dir, { recursive: true });
  await copyFile(absPath, path.join(dir, id));
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
