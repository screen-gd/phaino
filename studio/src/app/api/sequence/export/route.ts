import { NextResponse } from "next/server";
import { z } from "zod";
import { startExport } from "@/server/sequence/export";
import { socialErrorResponse } from "@/server/social/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const exportSchema = z.object({ codec: z.enum(["h264", "prores"]) });

export async function POST(request: Request) {
  try {
    const { codec } = exportSchema.parse(await request.json());
    const job = await startExport({ codec });
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    return socialErrorResponse(err);
  }
}
