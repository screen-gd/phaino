import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@/server/env";
import { extendVideo } from "@/server/edits/extend";
import { runFfmpeg } from "@/server/edits/prepare";
import { getRunner } from "@/server/jobs/runner";
import { socialErrorResponse } from "@/server/social/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  uploadId: z.string().min(1),
  modelId: z.string().min(1),
  prompt: z.string().optional(),
});

/** Extend: last frame -> the model's i2v preset, filed under "edit". */
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const env = getEnv();
    const job = await extendVideo(env, body, {
      ffmpeg: runFfmpeg,
      startJob: (input) => getRunner().startJob(input),
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    return socialErrorResponse(err);
  }
}
