import "server-only";

import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { Readable } from "node:stream";
import { SocialError, type MediaAttachment } from "@opencoredev/social-sdk";

const OUTPUT_TYPES = {
  ".mp4": { kind: "video", mimeType: "video/mp4" },
  ".mov": { kind: "video", mimeType: "video/quicktime" },
  ".png": { kind: "image", mimeType: "image/png" },
  ".jpg": { kind: "image", mimeType: "image/jpeg" },
  ".jpeg": { kind: "image", mimeType: "image/jpeg" },
  ".webp": { kind: "image", mimeType: "image/webp" },
} as const;

export type OutputKind = "image" | "video";

export type ResolvedOutput = {
  readonly absPath: string;
  readonly kind: OutputKind;
  readonly mimeType: string;
};

function invalid(message: string): SocialError {
  return new SocialError({ code: "invalid_input", operation: "outputs.resolve", message });
}

/**
 * Resolve a client-supplied relative path strictly inside
 * ${dataDir}/outputs. Absolute paths, `..` escapes and any extension
 * outside the allowlist are rejected.
 */
export function resolveOutput(dataDir: string, relPath: string): ResolvedOutput {
  if (typeof relPath !== "string" || relPath.length === 0) {
    throw invalid("Missing output path");
  }
  if (path.isAbsolute(relPath)) {
    throw invalid("Absolute paths are not allowed");
  }
  const outputsDir = path.join(dataDir, "outputs");
  const abs = path.resolve(outputsDir, relPath);
  const rel = path.relative(outputsDir, abs);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw invalid("Path escapes the outputs directory");
  }
  const type = OUTPUT_TYPES[path.extname(abs).toLowerCase() as keyof typeof OUTPUT_TYPES];
  if (!type) {
    throw invalid("Unsupported file type");
  }
  return { absPath: abs, ...type };
}

/** A replayable stream attachment with a sha256 fingerprint for one local output file. */
export async function toAttachment(dataDir: string, relPath: string): Promise<MediaAttachment> {
  const resolved = resolveOutput(dataDir, relPath);
  let size: number;
  try {
    size = (await stat(resolved.absPath)).size;
  } catch {
    throw new SocialError({
      code: "not_found",
      operation: "outputs.resolve",
      message: "Output file not found",
    });
  }
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(resolved.absPath)) {
    hash.update(chunk);
  }
  return {
    kind: resolved.kind,
    source: {
      kind: "stream",
      open: () =>
        Readable.toWeb(createReadStream(resolved.absPath)) as ReadableStream<Uint8Array>,
      fingerprint: hash.digest("hex"),
    },
    mimeType: resolved.mimeType,
    filename: path.basename(resolved.absPath),
    byteSize: size,
  };
}

export type OutputItem = {
  readonly relPath: string;
  readonly kind: OutputKind;
  readonly mimeType: string;
  readonly size: number;
  readonly mtimeMs: number;
};

/** Every allowed media file under ${dataDir}/outputs, newest first. */
export async function listOutputs(dataDir: string): Promise<OutputItem[]> {
  const items: OutputItem[] = [];
  async function walk(dir: string, prefix: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(path.join(dir, entry.name), relPath);
        continue;
      }
      if (!entry.isFile()) continue;
      try {
        const resolved = resolveOutput(dataDir, relPath);
        const s = await stat(resolved.absPath);
        items.push({
          relPath,
          kind: resolved.kind,
          mimeType: resolved.mimeType,
          size: s.size,
          mtimeMs: s.mtimeMs,
        });
      } catch {
        // Skip files outside the allowlist or unreadable.
      }
    }
  }
  await walk(path.join(dataDir, "outputs"), "");
  return items.sort((a, b) => b.mtimeMs - a.mtimeMs);
}
