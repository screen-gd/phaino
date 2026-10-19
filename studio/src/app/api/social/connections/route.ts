import { NextResponse } from "next/server";
import { createSocial, SocialError } from "@opencoredev/social-sdk";
import { z } from "zod";
import { getEnv } from "@/server/env";
import { authorization } from "@/server/social/client";
import {
  addConnection,
  listConnections,
  maskConnection,
} from "@/server/social/connections";
import { socialErrorResponse } from "@/server/social/errors";
import {
  applyDefaults,
  credentialsSchema,
  providerById,
} from "@/server/social/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  provider: z.string().min(1),
  label: z.string().min(1).max(80),
  credentials: z.record(z.string(), z.string()),
});

function fail(message: string): SocialError {
  return new SocialError({
    code: "invalid_input",
    operation: "connections.test",
    message,
  });
}

function shortMessage(err: unknown): string {
  if (err instanceof SocialError) return err.message;
  if (err instanceof Error) return err.message;
  return "Connection test failed";
}

/** Masked list of stored connections. */
export async function GET() {
  try {
    const connections = await listConnections(getEnv().dataDir);
    return NextResponse.json({ connections: connections.map(maskConnection) });
  } catch (err) {
    return socialErrorResponse(err);
  }
}

/** Validate, test and store one connection. Saves only on success. */
export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json());
    const provider = providerById(body.provider);
    if (!provider) throw fail(`Unknown provider "${body.provider}"`);
    const credentials = applyDefaults(
      provider,
      credentialsSchema(provider).parse(body.credentials),
    );
    try {
      const adapter = await provider.build(credentials);
      const social = createSocial({ backend: adapter });
      const canList = social
        .capabilities()
        ["default"]?.capabilities.some(
          (d) => d.operation === "accounts.read" && d.availability === "available",
        );
      if (canList) {
        await social.accounts.list({ authorization: authorization() });
      }
    } catch (err) {
      throw fail(shortMessage(err));
    }
    const conn = await addConnection(getEnv().dataDir, {
      provider: provider.id,
      label: body.label,
      credentials,
    });
    return NextResponse.json(maskConnection(conn), { status: 201 });
  } catch (err) {
    return socialErrorResponse(err);
  }
}
