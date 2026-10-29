import { NextResponse } from "next/server";
import { getZernioKey, listSocialAccounts, zernioClient } from "@/server/social/zernio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Connected accounts on the user's Zernio key. */
export async function GET() {
  const key = getZernioKey();
  if (!key) return NextResponse.json({ configured: false, accounts: [] });
  try {
    return NextResponse.json({ configured: true, accounts: await listSocialAccounts(zernioClient(key)) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load accounts" },
      { status: 502 },
    );
  }
}
