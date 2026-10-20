import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteFork, ForkError, updateFork } from "@/server/presets/forks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  defaults: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

function errorResponse(error: unknown) {
  if (error instanceof ForkError) {
    return NextResponse.json(
      { error: error.message, problems: error.problems },
      { status: error.status },
    );
  }
  return NextResponse.json({ error: "Invalid fork" }, { status: 400 });
}

/** Update a fork's name, description and param defaults. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }
  try {
    const preset = updateFork(id, parsed.data);
    return NextResponse.json({ preset });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Delete the fork folder. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    deleteFork(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
