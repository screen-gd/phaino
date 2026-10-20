import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@/server/env";
import { comfyTarget } from "@/server/comfy/client";
import {
  clearComfyCredentials,
  maskKey,
  saveCredentialsWithProbe,
} from "@/server/comfy/credentials";
import { socialErrorResponse } from "@/server/social/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const putSchema = z.object({
  apiKey: z.string().trim().min(8, "The key is too short"),
  baseUrl: z
    .string()
    .refine(
      (s) => {
        try {
          const url = new URL(s);
          if (url.protocol === "https:") return true;
          return (
            url.protocol === "http:" &&
            (url.hostname === "localhost" || url.hostname === "127.0.0.1")
          );
        } catch {
          return false;
        }
      },
      { message: "Use an https URL (http only for localhost)" },
    )
    .optional(),
});

function shape() {
  const target = comfyTarget(getEnv());
  return {
    configured: target.configured,
    source: target.source,
    maskedKey: target.apiKey ? maskKey(target.apiKey) : null,
    baseUrl: target.baseUrl,
  };
}

/** Resolved Comfy credentials state. Never returns the raw key. */
export async function GET() {
  return NextResponse.json(shape());
}

export async function PUT(request: Request) {
  try {
    const body = putSchema.parse(await request.json());
    const result = await saveCredentialsWithProbe({
      apiKey: body.apiKey,
      baseUrl: body.baseUrl,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: result.status },
      );
    }
    return NextResponse.json(shape());
  } catch (err) {
    return socialErrorResponse(err);
  }
}

export async function DELETE() {
  try {
    await clearComfyCredentials();
    return NextResponse.json(shape());
  } catch (err) {
    return socialErrorResponse(err);
  }
}
