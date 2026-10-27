import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getEnv } from "@/server/env";
import { createMcpServer } from "@/server/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCAL_HOST = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i;

function allowedRequest(request: Request) {
  try {
    const site = new URL(getEnv().siteUrl);
    const host = request.headers.get("host");
    if (!host || (!LOCAL_HOST.test(host) && host.toLowerCase() !== site.host.toLowerCase())) {
      return false;
    }
    const originHeader = request.headers.get("origin");
    if (originHeader === null) return true;
    const origin = new URL(originHeader);
    return origin.origin === originHeader &&
      (origin.protocol === "http:" || origin.protocol === "https:") &&
      (LOCAL_HOST.test(origin.host) || origin.origin === site.origin);
  } catch {
    return false;
  }
}

async function handleRequest(request: Request) {
  if (!allowedRequest(request)) return Response.json({ error: "Forbidden host or origin" }, { status: 403 });
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    const response = await transport.handleRequest(request);
    // GET may hold an SSE stream open. Close it when the caller disconnects.
    if (response.headers.get("content-type")?.startsWith("text/event-stream")) {
      request.signal.addEventListener("abort", () => { void server.close(); }, { once: true });
    } else {
      await server.close();
    }
    return response;
  } catch (error) {
    await server.close();
    throw error;
  }
}

export { handleRequest as GET, handleRequest as POST, handleRequest as DELETE };
