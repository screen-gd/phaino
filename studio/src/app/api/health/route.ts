import { NextResponse } from "next/server";
import { BACKENDS, type Backend } from "@/lib/backend";
import { probeBackend } from "@/server/comfy/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isBackend(value: string): value is Backend {
  return (BACKENDS as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  const param = new URL(request.url).searchParams.get("backend");
  if (param !== null && !isBackend(param)) {
    return NextResponse.json(
      { error: `Unknown backend "${param}". Expected one of: ${BACKENDS.join(", ")}` },
      { status: 400 },
    );
  }

  const backends = param === null ? BACKENDS : [param];
  const results = await Promise.all(backends.map((b) => probeBackend(b)));
  return NextResponse.json({ backends: results });
}
