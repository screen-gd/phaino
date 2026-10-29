import { NextResponse } from "next/server";
import { z } from "zod";
import { getZernioKey, postOutput, zernioClient } from "@/server/social/zernio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  path: z.string().min(1),
  text: z.string().max(5000).default(""),
  accountIds: z.array(z.string().min(1)).min(1, "Pick at least one account"),
});

/** Post a generated output to the chosen connected accounts. */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const key = getZernioKey();
  if (!key) {
    return NextResponse.json({ error: "Add a Zernio API key in Settings to post" }, { status: 409 });
  }
  try {
    return NextResponse.json({ results: await postOutput(zernioClient(key), parsed.data) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Posting failed" },
      { status: 502 },
    );
  }
}
