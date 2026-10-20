import { getEnv } from "@/server/env";
import { apiError } from "@/server/errors";
import { openUpload } from "@/server/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const upload = await openUpload(getEnv().dataDir, id);
    return new Response(upload.stream, {
      headers: {
        "Content-Type": upload.mimeType,
        "Content-Length": String(upload.size),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
