import { NextResponse } from "next/server";
import { layout } from "@/server/sequence/model";
import { getSequenceStore } from "@/server/sequence/store";
import { apiError } from "@/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const store = getSequenceStore();
    const sequence = await store.removeClip(id);
    return NextResponse.json({ sequence, layout: layout(sequence) });
  } catch (err) {
    return apiError(err);
  }
}
