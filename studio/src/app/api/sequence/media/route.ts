import { NextResponse } from "next/server";
import { z } from "zod";
import { layout } from "@/server/sequence/model";
import { getSequenceStore } from "@/server/sequence/store";
import { socialErrorResponse } from "@/server/social/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const importSchema = z.object({ path: z.string().min(1) });

/** Import an existing output or upload as media (probe + poster). */
export async function POST(request: Request) {
  try {
    const { path: relPath } = importSchema.parse(await request.json());
    const store = getSequenceStore();
    const media = await store.importMedia(relPath);
    const sequence = await store.getSequence();
    return NextResponse.json(
      { media, sequence, layout: layout(sequence) },
      { status: 201 },
    );
  } catch (err) {
    return socialErrorResponse(err);
  }
}
