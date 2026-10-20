import { NextResponse } from "next/server";
import { subscribeJob, getRunner } from "@/server/jobs/runner";
import { getStore, type JobRecord } from "@/server/jobs/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TERMINAL = new Set(["succeeded", "failed", "cancelled"]);

/** SSE: current row, then every update until a terminal status. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = getStore().get(id);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  getRunner(); // ensure resume ran once

  const encoder = new TextEncoder();
  let off: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (row: JobRecord) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(row)}\n\n`),
        );
      };
      const cleanup = () => {
        if (closed) return;
        closed = true;
        off?.();
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      send(job);
      off = subscribeJob(id, (row) => {
        send(row);
        if (TERMINAL.has(row.status)) cleanup();
      });
      heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": hb\n\n"));
      }, 15_000);
      request.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      off?.();
      if (heartbeat) clearInterval(heartbeat);
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
