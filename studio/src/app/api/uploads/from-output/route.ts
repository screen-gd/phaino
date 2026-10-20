import { NextResponse } from "next/server";
import { z } from "zod";
import { SocialError } from "@opencoredev/social-sdk";
import { getEnv } from "@/server/env";
import { socialErrorResponse } from "@/server/social/errors";
import { resolveOutput } from "@/server/social/media";
import { saveUploadFromPath } from "@/server/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ path: z.string().min(1) });

/** Copy an existing generated image into uploads/, for "Animate this image". */
export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }
    const env = getEnv();
    const resolved = resolveOutput(env.dataDir, parsed.data.path);
    if (resolved.kind !== "image") {
      throw new SocialError({
        code: "invalid_input",
        operation: "uploads",
        message: "Only image outputs can be animated",
      });
    }
    const saved = await saveUploadFromPath(env.dataDir, resolved.absPath, () =>
      crypto.randomUUID(),
    );
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    return socialErrorResponse(err);
  }
}
