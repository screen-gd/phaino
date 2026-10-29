import { NextResponse, type NextRequest } from "next/server";
import { isDemoMode } from "@/lib/demo-mode";
import { DEMO_MESSAGE } from "@/lib/demo";
import { allowedHostAndOrigin, allowedWriteContentType, siteUrlFrom } from "@/lib/request-guard";

/** The local studio API is unauthenticated, so only same-site browser pages and local tools may drive it. */
function localGuard(request: NextRequest) {
  if (!allowedHostAndOrigin(request, siteUrlFrom())) {
    return NextResponse.json({ error: "Forbidden host or origin" }, { status: 403 });
  }
  if (!allowedWriteContentType(request)) {
    return NextResponse.json({ error: "Expected application/json or multipart/form-data" }, { status: 415 });
  }
  return NextResponse.next();
}

/** Hosted mockups never submit jobs, accept credentials, or write server files. */
export function proxy(request: NextRequest) {
  if (!isDemoMode()) return localGuard(request);
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
  // Never use or reveal a server-side Zernio key on the hosted demo.
  if (pathname === "/api/social/credentials") {
    return NextResponse.json({ configured: false, maskedKey: null });
  }
  if (pathname === "/api/social/accounts") {
    return NextResponse.json({ configured: false, accounts: [] });
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
