import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@/server/env";
import { apiError } from "@/server/errors";
import { resolveOutput } from "@/server/outputs";
import { saveUploadFromPath } from "@/server/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ path: z.string().min(1) });

/** Copy an existing generated output into uploads/ (Animate, Edit Video). */
export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }
    const env = getEnv();
    const resolved = resolveOutput(env.dataDir, parsed.data.path);
    const saved = await saveUploadFromPath(env.dataDir, resolved.absPath, () =>
      crypto.randomUUID(),
    );
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
