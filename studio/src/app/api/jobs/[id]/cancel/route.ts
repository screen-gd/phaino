import { NextResponse } from "next/server";
import { getRunner } from "@/server/jobs/runner";
import { getStore } from "@/server/jobs/store";
import { cancelExport } from "@/server/sequence/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = getStore().get(id);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  const updated =
    job.category === "export"
      ? await cancelExport(id)
      : await getRunner().cancelJob(id);
  return NextResponse.json({ job: updated });
}
