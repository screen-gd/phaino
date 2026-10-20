import { NextResponse } from "next/server";
import { probeComfy } from "@/server/comfy/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await probeComfy());
}
