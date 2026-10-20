import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@/server/env";
import { joinInEditor } from "@/server/edits/extend";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  uploadId: z.string().min(1),
  result: z.string().min(1),
});

/** Append the source upload plus the extend result to the editor's V1. */
export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    await joinInEditor(getEnv(), body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
