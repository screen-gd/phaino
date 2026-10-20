import { createReadStream, existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { ApiError } from "@/server/errors";
import yazl from "yazl";
import { getEnv } from "@/server/env";
import { getStore } from "@/server/jobs/store";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Streamed zip of the whole export folder. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const job = getStore().get(id);
    if (!job || job.category !== "export") {
      throw new ApiError({
        code: "not_found",
        operation: "exports.zip",
        message: "Export not found",
      });
    }
    const dir = path.join(getEnv().dataDir, "exports", id);
    if (!existsSync(dir)) {
      throw new ApiError({
        code: "not_found",
        operation: "exports.zip",
        message: "Export not found",
      });
    }

    const zip = new yazl.ZipFile();
    async function addDir(current: string, prefix: string): Promise<void> {
      const entries = await readdir(path.join(dir, current), { withFileTypes: true });
      for (const entry of entries) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        const abs = path.join(dir, rel);
        if (entry.isDirectory()) await addDir(rel, rel);
        else if (entry.isFile()) zip.addFile(abs, rel);
      }
    }
    await addDir("", "");
    zip.end();

    const stream = Readable.toWeb(
      Readable.from(zip.outputStream as unknown as NodeJS.ReadableStream),
    ) as ReadableStream<Uint8Array>;
    return new Response(stream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="phaino_sequence_${id}.zip"`,
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
