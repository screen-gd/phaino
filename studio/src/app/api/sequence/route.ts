import { NextResponse } from "next/server";
import { z } from "zod";
import { layout } from "@/server/sequence/model";
import { getSequenceStore } from "@/server/sequence/store";
import { socialErrorResponse } from "@/server/social/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  fps: z.union([z.literal(24), z.literal(25), z.literal(30)]).optional(),
  resolution: z.enum(["1080p", "4K"]).optional(),
  handles: z.union([z.literal(0), z.literal(12), z.literal(24)]).optional(),
  clips: z
    .array(
      z.object({
        id: z.string(),
        in: z.number().int().nonnegative(),
        out: z.number().int().nonnegative(),
      }),
    )
    .optional(),
});

export async function GET() {
  const store = getSequenceStore();
  const sequence = await store.getSequence();
  return NextResponse.json({ sequence, layout: layout(sequence) });
}

export async function PUT(request: Request) {
  try {
    const body = patchSchema.parse(await request.json());
    const store = getSequenceStore();
    const sequence = await store.updateSequence(body);
    return NextResponse.json({ sequence, layout: layout(sequence) });
  } catch (err) {
    return socialErrorResponse(err);
  }
}
