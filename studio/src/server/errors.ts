import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** App-level error thrown by the server layer and mapped to HTTP responses. */
export class ApiError extends Error {
  readonly code: string;
  readonly operation?: string;
  readonly issues?: unknown[];

  constructor(opts: {
    code: string;
    message: string;
    operation?: string;
    issues?: unknown[];
  }) {
    super(opts.message);
    this.code = opts.code;
    this.operation = opts.operation;
    this.issues = opts.issues;
  }
}

const STATUS: Record<string, number> = {
  not_found: 404,
  idempotency_conflict: 409,
};

/** Map errors thrown by the server layer to short HTTP responses. */
export function apiError(err: unknown): NextResponse {
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
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: err.message, code: err.code, issues: err.issues },
      { status: STATUS[err.code] ?? 400 },
    );
  }
  return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
}
