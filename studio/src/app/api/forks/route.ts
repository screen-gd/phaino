import { NextResponse } from "next/server";
import { z } from "zod";
import { createFork, ForkError } from "@/server/presets/forks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ presetId: z.string().min(1) });

/** Copy a preset into the user's forks. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "presetId required" }, { status: 400 });
  }
  try {
    const preset = createFork(parsed.data.presetId);
    return NextResponse.json({ preset }, { status: 201 });
  } catch (error) {
    if (error instanceof ForkError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
