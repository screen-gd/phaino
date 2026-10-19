import { NextResponse } from "next/server";
import { z } from "zod";
import { socialErrorResponse } from "@/server/social/errors";
import {
  JobInputError,
  NotConnected,
  getRunner,
} from "@/server/jobs/runner";
import { getStore } from "@/server/jobs/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  presetId: z.string().min(1),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  inputs: z.record(z.string(), z.string()).default({}),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const job = getRunner().startJob(body);
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    if (err instanceof NotConnected) {
      return NextResponse.json(
        { error: "not_connected", message: err.message },
        { status: 409 },
      );
    }
    if (err instanceof JobInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return socialErrorResponse(err);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category") ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  const jobs = getStore().list({
    category,
    limit: Number.isFinite(limit) ? limit : undefined,
  });
  return NextResponse.json({ jobs });
}
