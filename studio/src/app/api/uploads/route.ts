import { NextResponse } from "next/server";
import { getEnv } from "@/server/env";
import { socialErrorResponse } from "@/server/social/errors";
import { saveUpload } from "@/server/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file field" }, { status: 400 });
    }
    const saved = await saveUpload(getEnv().dataDir, file, () =>
      crypto.randomUUID(),
    );
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    return socialErrorResponse(err);
  }
}
