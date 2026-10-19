import "server-only";

import { NextResponse } from "next/server";
import { SocialError, type SocialErrorCode } from "@opencoredev/social-sdk";
import { ZodError } from "zod";

const STATUS: Partial<Record<SocialErrorCode, number>> = {
  not_found: 404,
  idempotency_conflict: 409,
  invalid_config: 502,
  upstream_failure: 502,
  ambiguous_outcome: 502,
  rate_limited: 502,
  timeout: 502,
  media_error: 502,
};

/** Map errors thrown by the social server layer to short HTTP responses. */
export function socialErrorResponse(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Invalid request",
        issues: err.issues.map((i) => ({
          code: i.code,
          message: i.message,
          path: i.path.join("."),
        })),
      },
      { status: 400 },
    );
  }
  if (err instanceof SocialError) {
    return NextResponse.json(
      { error: err.message, code: err.code, issues: err.issues },
      { status: STATUS[err.code] ?? 400 },
    );
  }
  return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
}
