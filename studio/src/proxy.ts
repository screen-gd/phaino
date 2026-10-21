import { NextResponse, type NextRequest } from "next/server";
import { isDemoMode } from "@/lib/demo-mode";
import { DEMO_MESSAGE } from "@/lib/demo";

/** Hosted mockups never submit jobs, accept credentials, or write server files. */
export function proxy(request: NextRequest) {
  if (!isDemoMode()) return NextResponse.next();
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.json({ error: "demo_mode", message: DEMO_MESSAGE }, { status: 403 });
  }
  const pathname = request.nextUrl.pathname;
  if (pathname === "/api/jobs") return NextResponse.json({ jobs: [] });
  if (pathname.startsWith("/api/jobs/")) {
    return NextResponse.json({ error: "demo_mode", message: DEMO_MESSAGE }, { status: 404 });
  }
  if (pathname === "/api/health") {
    return NextResponse.json({ status: "not_configured", target: "cloud", host: "cloud.comfy.org", latencyMs: null, message: DEMO_MESSAGE });
  }
  if (pathname === "/api/comfy/credentials") {
    return NextResponse.json({ configured: false, source: null, maskedKey: null, baseUrl: "" });
  }
  if (pathname === "/api/comfy/balance") return NextResponse.json({ credits: null });
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
