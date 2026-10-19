import { NextResponse } from "next/server";
import { PROVIDERS } from "@/server/social/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Provider registry metadata (fields, docs links) for the connection dialog. */
export async function GET() {
  return NextResponse.json({
    providers: PROVIDERS.map((p) => ({
      id: p.id,
      label: p.label,
      kind: p.kind,
      platforms: p.platforms,
      fields: p.fields,
      docsUrl: p.docsUrl,
      note: p.note,
    })),
  });
}
