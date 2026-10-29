import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/errors";
import {
  clearZernioKey,
  listSocialAccounts,
  saveZernioKey,
  zernioClient,
  zernioStatus,
} from "@/server/social/zernio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const putSchema = z.object({ apiKey: z.string().trim().min(8, "The key is too short") });

/** Zernio key state. Never returns the raw key. */
export async function GET() {
  return NextResponse.json(zernioStatus());
}

/** Check the key against Zernio by listing accounts, then save it. */
export async function PUT(request: Request) {
  try {
    const { apiKey } = putSchema.parse(await request.json());
    try {
      await listSocialAccounts(zernioClient(apiKey));
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Zernio rejected the key" },
        { status: 400 },
      );
    }
    await saveZernioKey(apiKey);
    return NextResponse.json(zernioStatus());
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE() {
  try {
    await clearZernioKey();
    return NextResponse.json(zernioStatus());
  } catch (err) {
    return apiError(err);
  }
}
