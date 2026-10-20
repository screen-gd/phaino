import "server-only";

import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { ApiError } from "./errors";

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

function invalid(message: string): ApiError {
  return new ApiError({ code: "invalid_input", operation: "outputs.resolve", message });
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
