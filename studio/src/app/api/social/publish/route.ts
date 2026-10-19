import { NextResponse } from "next/server";
import { SocialError } from "@opencoredev/social-sdk";
import { getEnv } from "@/server/env";
import {
  aggregateAccounts,
  authorization,
  getSocial,
} from "@/server/social/client";
import { socialErrorResponse } from "@/server/social/errors";
import { publishOutput } from "@/server/social/publish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Publish one generated output to the selected social accounts. */
export async function POST(request: Request) {
  try {
    const handle = await getSocial();
    if (!handle?.social) {
      throw new SocialError({
        code: "invalid_config",
        operation: "posts.publish",
        message: "No working social connections",
      });
    }
    const body: unknown = await request.json();
    const summary = await publishOutput(
      {
        social: handle.social,
        authorization: authorization(),
        listAccounts: () =>
          aggregateAccounts(handle.social!, handle.connections).then(
            (r) => r.accounts,
          ),
        dataDir: getEnv().dataDir,
      },
      body,
    );
    return NextResponse.json(summary);
  } catch (err) {
    return socialErrorResponse(err);
  }
}
