import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { ApiError } from "@/server/errors";
import { getEnv } from "@/server/env";
import {
  getSequenceStore,
  UPLOAD_EXTS,
  UPLOAD_MAX_BYTES,
} from "@/server/sequence/store";
import { layout } from "@/server/sequence/model";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Multipart upload into ${dataDir}/uploads/editor/, then import as media. */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file field" }, { status: 400 });
    }
    const ext = path.extname(file.name).toLowerCase();
    if (!UPLOAD_EXTS.includes(ext)) {
      throw new ApiError({
        code: "invalid_input",
        operation: "sequence.media.upload",
        message: `Unsupported file type "${ext || "?"}"`,
      });
    }
    if (file.size > UPLOAD_MAX_BYTES) {
      throw new ApiError({
        code: "invalid_input",
        operation: "sequence.media.upload",
        message: "File is larger than 500 MB",
      });
    }
    const env = getEnv();
    const relPath = `uploads/editor/${crypto.randomUUID()}${ext}`;
    const abs = path.join(env.dataDir, relPath);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, Buffer.from(await file.arrayBuffer()));
    const store = getSequenceStore();
    const media = await store.importMedia(relPath).catch(async (err) => {
      await rm(abs, { force: true });
      throw err;
    });
    const sequence = await store.getSequence();
    return NextResponse.json(
      { media, sequence, layout: layout(sequence) },
      { status: 201 },
    );
  } catch (err) {
    return apiError(err);
  }
}
