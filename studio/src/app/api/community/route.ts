import { NextResponse } from "next/server";
import { communityFeedSchema } from "@/lib/community";
import data from "@/data/community.sample.json";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(communityFeedSchema.parse(data));
}
