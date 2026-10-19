import { NextResponse } from "next/server";
import { SocialError } from "@opencoredev/social-sdk";
import { getEnv } from "@/server/env";
import { removeConnection } from "@/server/social/connections";
import { socialErrorResponse } from "@/server/social/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Remove one stored connection by id. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const removed = await removeConnection(getEnv().dataDir, id);
    if (!removed) {
      throw new SocialError({
        code: "not_found",
        operation: "connections.remove",
        message: "Unknown connection",
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return socialErrorResponse(err);
  }
}
