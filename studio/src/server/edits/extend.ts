import "server-only";

import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { SocialError } from "@opencoredev/social-sdk";
import type { StudioEnv } from "@/server/env";
import { modelById, modePresetId } from "@/server/models/registry";
import { getPreset } from "@/server/presets/load";
import { openSequenceStore, type SequenceStore } from "@/server/sequence/store";
import { resolveUpload, uploadsDir } from "@/server/uploads";
import type { JobRecord } from "@/server/jobs/store";

function invalid(message: string): SocialError {
  return new SocialError({ code: "invalid_input", operation: "edits", message });
}

export type ExtendDeps = {
  ffmpeg: (args: string[]) => Promise<void>;
  startJob: (input: {
    presetId: string;
    params: Record<string, string | number | boolean>;
    inputs: Record<string, string>;
    category?: string;
  }) => JobRecord;
};

/** The last frame of a video as a png upload; returns the uploadId. */
export async function extractLastFrame(
  env: StudioEnv,
  absPath: string,
  deps: Pick<ExtendDeps, "ffmpeg">,
): Promise<string> {
  const dir = uploadsDir(env.dataDir);
  await mkdir(dir, { recursive: true });
  const uploadId = `${crypto.randomUUID()}.png`;
  const out = path.join(dir, uploadId);
  // Seek from the end; keep one frame.
  await deps.ffmpeg([
    "-y",
    "-sseof", "-0.2",
    "-i", absPath,
    "-frames:v", "1",
    "-update", "1",
    "-q:v", "2",
    out,
  ]);
  return uploadId;
}

/**
 * Extend: pull the clip's last frame, then run the model's i2v preset with
 * it as the first frame. The job lands in the "edit" category.
 */
export async function extendVideo(
  env: StudioEnv,
  input: { uploadId: string; modelId: string; prompt?: string },
  deps: ExtendDeps,
): Promise<JobRecord> {
  const resolved = resolveUpload(env.dataDir, input.uploadId);
  if (!resolved.mimeType.startsWith("video/")) {
    throw invalid("Extend needs a video upload");
  }
  const model = modelById(input.modelId);
  if (!model || !model.modes.i2v) {
    throw invalid("That model has no image-to-video mode");
  }
  const presetId = modePresetId(model, "i2v");
  const loaded = getPreset(presetId, env);
  if (!loaded) throw invalid("That model is not available");
  const imageInput = loaded.preset.inputs.find((i) => i.type === "image");
  if (!imageInput) throw invalid("That model takes no image input");
  const promptKey = loaded.preset.params.find(
    (p) => p.type === "text" && p.key === "prompt",
  )?.key;

  const frameUploadId = await extractLastFrame(env, resolved.absPath, deps);
  const params: Record<string, string | number | boolean> = {};
  if (promptKey && input.prompt?.trim()) params[promptKey] = input.prompt.trim();
  return deps.startJob({
    presetId,
    params,
    inputs: { [imageInput.key]: frameUploadId },
    category: "edit",
  });
}

/**
 * Join in Editor: copy the source upload into the editor uploads and append
 * it plus the extend result to the video track, source first. The result's
 * first frame duplicates the source's last, so its clip starts one frame in.
 */
export async function joinInEditor(
  env: StudioEnv,
  input: { uploadId: string; result: string },
  deps: { store?: SequenceStore } = {},
): Promise<void> {
  const up = resolveUpload(env.dataDir, input.uploadId);
  const editorRel = `uploads/editor/${crypto.randomUUID()}${path.extname(up.absPath)}`;
  const editorAbs = path.join(env.dataDir, editorRel);
  await mkdir(path.dirname(editorAbs), { recursive: true });
  await copyFile(up.absPath, editorAbs);
  const store = deps.store ?? openSequenceStore(env);
  await store.appendClip(editorRel);
  const seq = await store.appendClip(input.result);
  const last = seq.clips[seq.clips.length - 1];
  if (last && last.in === 0 && last.out - last.in > 1) {
    await store.updateSequence({
      clips: seq.clips.map((c) =>
        c.id === last.id ? { ...c, in: 1 } : c,
      ),
    });
  }
}
