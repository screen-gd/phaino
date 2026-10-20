import { getComfyBalance } from "@/server/comfy/balance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Best-effort Comfy credit balance for the active key. Never fails loudly. */
export async function GET() {
  const credits = await getComfyBalance();
  return Response.json({ credits });
}
