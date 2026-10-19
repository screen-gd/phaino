import { NextResponse } from "next/server";
import { SocialError } from "@opencoredev/social-sdk";
import { getEnv } from "@/server/env";
import {
  aggregateAccounts,
  authorization,
  getSocial,
} from "@/server/social/client";
import { socialErrorResponse } from "@/server/social/errors";
import { refreshPost } from "@/server/social/publish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Re-read pending delivery states for one published draft. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const { draftId } = await params;
    const handle = await getSocial();
    if (!handle?.social) {
      throw new SocialError({
        code: "invalid_config",
        operation: "posts.status",
        message: "No working social connections",
      });
    }
    const summary = await refreshPost(
      {
        social: handle.social,
        authorization: authorization(),
        listAccounts: () =>
          aggregateAccounts(handle.social!, handle.connections).then(
            (r) => r.accounts,
          ),
        dataDir: getEnv().dataDir,
      },
      draftId,
    );
    return NextResponse.json(summary);
  } catch (err) {
    return socialErrorResponse(err);
  }
}
