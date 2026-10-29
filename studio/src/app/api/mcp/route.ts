import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { allowedHostAndOrigin } from "@/lib/request-guard";
import { getEnv } from "@/server/env";
import { createMcpServer } from "@/server/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleRequest(request: Request) {
  if (!allowedHostAndOrigin(request, getEnv().siteUrl)) return Response.json({ error: "Forbidden host or origin" }, { status: 403 });
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
