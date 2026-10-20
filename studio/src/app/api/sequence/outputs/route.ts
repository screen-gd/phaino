import { NextResponse } from "next/server";
import path from "node:path";
import { getEnv } from "@/server/env";
import { listOutputs } from "@/server/social/media";
import { socialErrorResponse } from "@/server/social/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Recent video outputs the sequence can append, newest first. */
export async function GET() {
  try {
    const items = (await listOutputs(getEnv().dataDir))
      .filter((o) => o.kind === "video")
      .slice(0, 50)
      .map((o) => ({
        relPath: o.relPath,
        name: path.basename(o.relPath),
        mtime: o.mtimeMs,
      }));
    return NextResponse.json({ items });
  } catch (err) {
    return socialErrorResponse(err);
  }
}
