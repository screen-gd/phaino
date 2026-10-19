import { NextResponse } from "next/server";
import { getPreset } from "@/server/presets/load";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const loaded = getPreset(id);
    if (!loaded) {
      return NextResponse.json({ error: `Unknown preset "${id}"` }, { status: 404 });
    }
    return NextResponse.json(loaded);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid preset" },
      { status: 500 },
    );
  }
}
