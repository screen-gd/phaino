import { NextResponse } from "next/server";
import { z } from "zod";
import { layout } from "@/server/sequence/model";
import { getSequenceStore } from "@/server/sequence/store";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const appendSchema = z.object({ path: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const { path: relPath } = appendSchema.parse(await request.json());
    const store = getSequenceStore();
    const sequence = await store.appendClip(relPath);
    return NextResponse.json({ sequence, layout: layout(sequence) }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
