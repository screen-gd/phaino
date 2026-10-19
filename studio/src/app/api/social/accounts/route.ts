import { NextResponse } from "next/server";
import { aggregateAccounts, getSocial } from "@/server/social/client";
import { socialErrorResponse } from "@/server/social/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Connected social channels aggregated across all stored connections. */
export async function GET() {
  try {
    const handle = await getSocial();
    if (!handle) {
      return NextResponse.json({ configured: false, accounts: [], errors: [] });
    }
    if (!handle.social) {
      return NextResponse.json({
        configured: true,
        accounts: [],
        errors: handle.errors,
      });
    }
    const { accounts, errors } = await aggregateAccounts(
      handle.social,
      handle.connections,
    );
    return NextResponse.json({
      configured: true,
      accounts: accounts.map((a) => ({
        id: a.id,
        connectionId: a.backend,
        provider: a.provider,
        providerLabel: a.providerLabel,
        platform: a.platform,
        name: a.name,
      })),
      errors: [...handle.errors, ...errors],
    });
  } catch (err) {
    return socialErrorResponse(err);
  }
}
