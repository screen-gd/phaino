import { NextResponse } from "next/server";
import { listPresets } from "@/server/presets/load";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const presets = listPresets().map(
    ({ id, name, description, category, order, chip, model }) => ({
      id,
      name,
      description,
      category,
      order,
      chip,
      model,
    }),
  );
  return NextResponse.json({ presets });
}
