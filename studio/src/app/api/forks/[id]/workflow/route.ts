import { NextResponse } from "next/server";
import { ForkError, MAX_WORKFLOW_BYTES, replaceForkWorkflow } from "@/server/presets/forks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readPart(form: FormData, key: string): Promise<unknown> {
  const part = form.get(key);
  if (!(part instanceof File)) {
    throw new ForkError(`Missing "${key}" file`, 400, [`${key}: required`]);
  }
  if (part.size > MAX_WORKFLOW_BYTES) {
    throw new ForkError(`"${key}" is over 5 MB`, 400, [`${key}: too large`]);
  }
  try {
    return JSON.parse(await part.text());
  } catch {
    throw new ForkError(`"${key}" is not valid JSON`, 400, [`${key}: invalid JSON`]);
  }
}

/**
 * Replace a fork's workflow: multipart with `workflow` (ComfyUI JSON) and
 * `workflow_api` (API prompt), each up to 5 MB. The API graph is validated
 * against the preset's bindings and the object_info snapshot.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }
  try {
    const ui = await readPart(form, "workflow");
    const api = await readPart(form, "workflow_api");
    const preset = replaceForkWorkflow(id, ui, api);
    return NextResponse.json({ preset });
  } catch (error) {
    if (error instanceof ForkError) {
      return NextResponse.json(
        { error: error.message, problems: error.problems },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: "Invalid fork" }, { status: 400 });
  }
}
