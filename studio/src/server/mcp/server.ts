import "server-only";

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import pkg from "../../../package.json";
import { isDemoMode } from "@/lib/demo-mode";
import { extendVideo } from "@/server/edits/extend";
import { runFfmpeg } from "@/server/edits/prepare";
import { getEnv } from "@/server/env";
import { getRunner } from "@/server/jobs/runner";
import { getStore } from "@/server/jobs/store";
import { resolveOutput } from "@/server/outputs";
import { getPreset, listPresets } from "@/server/presets/load";
import { cancelExport, startExport } from "@/server/sequence/export";
import { audioClipSchema, clipSchema, layout, titleSchema } from "@/server/sequence/model";
import { UPLOAD_EXTS, UPLOAD_MAX_BYTES, getSequenceStore } from "@/server/sequence/store";
import { getZernioKey, listSocialAccounts, postOutput, zernioClient } from "@/server/social/zernio";
import { saveUpload, saveUploadFromPath } from "@/server/uploads";

const idSchema = z.object({ id: z.string().min(1) });
const workflowSchema = idSchema.extend({ format: z.enum(["ui", "api"]) });
// Match POST /api/jobs. The runner validates preset params and upload bindings.
const runSchema = z.object({
  presetId: z.string().min(1),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  inputs: z.record(z.string(), z.string()).default({}),
});
const listJobsSchema = z.object({
  category: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});
const pathSchema = z.object({ path: z.string().min(1) });
const uploadSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  base64: z.string().min(1),
});
const editorUploadSchema = z.object({
  filename: z.string().min(1),
  base64: z.string().min(1),
});
// Match PUT /api/sequence.
const sequencePatchSchema = z.object({
  fps: z.union([z.literal(24), z.literal(25), z.literal(30)]).optional(),
  resolution: z.enum(["1080p", "4K"]).optional(),
  aspect: z.enum(["16:9", "9:16", "1:1", "4:5"]).optional(),
  fit: z.enum(["contain", "cover"]).optional(),
  handles: z.union([z.literal(0), z.literal(12), z.literal(24)]).optional(),
  clips: z.array(clipSchema).optional(),
  audio: z.array(audioClipSchema).optional(),
  titles: z.array(titleSchema).optional(),
});
const exportSchema = z.object({
  action: z.enum(["render", "package"]).default("render"),
  codec: z.enum(["h264", "prores"]).default("h264"),
});
const socialPostSchema = z.object({
  path: z.string().min(1),
  text: z.string().max(5000).default(""),
  accountIds: z.array(z.string().min(1)).min(1),
});
const extendSchema = z.object({
  uploadId: z.string().min(1),
  modelId: z.string().min(1),
  prompt: z.string().optional(),
});

const INSTRUCTIONS = `Phaino makes images and videos with ComfyUI presets and edits them into a sequence.
To work toward a goal:
1. list_presets, then get_preset for the inputs and params you need.
2. run_preset. Image or video inputs take an uploadId from upload_media or use_output_as_input.
3. Poll get_job until status is succeeded, failed or cancelled. outputPaths feed the next step.
4. Build the cut: add_to_sequence for each shot, upload_to_editor or import_media for music, then update_sequence for order, trims, transitions, audio and titles.
5. export_sequence, then poll get_job for the rendered file.
Runs spend the user's Comfy credits. Confirm large batches with the user first.
To share a result, list_social_accounts and post_to_social. Posts are public: confirm the caption and accounts with the user first.`;

function requirePreset(id: string) {
  const loaded = getPreset(id);
  if (!loaded) throw new Error(`Unknown preset "${id}"`);
  return loaded;
}

function outputUrl(output: string) {
  return `/api/outputs/${output.split("/").map(encodeURIComponent).join("/")}`;
}

async function sequenceView() {
  const sequence = await getSequenceStore().getSequence();
  return { sequence, totalFrames: layout(sequence).totalFrames };
}

export const toolHandlers = {
  list_presets() {
    return listPresets().map((preset) => ({
      id: preset.id,
      name: preset.name,
      category: preset.category,
      model: preset.model.label,
      chip: preset.chip,
      inputs: preset.inputs.map((input) => input.key),
      params: preset.params.map((param) => param.key),
    }));
  },
  get_preset(input: z.infer<typeof idSchema>) {
    return requirePreset(idSchema.parse(input).id).preset;
  },
  get_workflow(input: z.infer<typeof workflowSchema>) {
    const { id, format } = workflowSchema.parse(input);
    const loaded = requirePreset(id);
    return format === "ui" ? loaded.workflowUi : loaded.workflowApi;
  },
  run_preset(input: z.input<typeof runSchema>) {
    const body = runSchema.parse(input);
    if (isDemoMode()) throw new Error("The hosted demo cannot run jobs. Use a local Phaino install.");
    const job = getRunner().startJob(body);
    return { id: job.id, status: job.status };
  },
  get_job(input: z.infer<typeof idSchema>) {
    const job = getStore().get(idSchema.parse(input).id);
    if (!job) throw new Error("Job not found");
    return {
      ...job,
      outputs: job.outputs.map(outputUrl),
      // Relative paths for add_to_sequence, import_media and use_output_as_input.
      outputPaths: job.outputs,
    };
  },
  list_jobs(input: z.input<typeof listJobsSchema>) {
    return getStore().list(listJobsSchema.parse(input)).map((job) => ({
      id: job.id,
      presetId: job.presetId,
      category: job.category,
      status: job.status,
      outputPaths: job.outputs,
      createdAt: job.createdAt,
    }));
  },
  async cancel_job(input: z.infer<typeof idSchema>) {
    const { id } = idSchema.parse(input);
    const job = getStore().get(id);
    if (!job) throw new Error("Job not found");
    const updated =
      job.category === "export" ? await cancelExport(id) : await getRunner().cancelJob(id);
    return { id, status: updated?.status ?? job.status };
  },
  upload_media(input: z.infer<typeof uploadSchema>) {
    const { filename, mimeType, base64 } = uploadSchema.parse(input);
    const file = new File([Buffer.from(base64, "base64")], filename, { type: mimeType });
    return saveUpload(getEnv().dataDir, file, () => crypto.randomUUID());
  },
  use_output_as_input(input: z.infer<typeof pathSchema>) {
    const env = getEnv();
    const resolved = resolveOutput(env.dataDir, pathSchema.parse(input).path);
    return saveUploadFromPath(env.dataDir, resolved.absPath, () => crypto.randomUUID());
  },
  async extend_video(input: z.infer<typeof extendSchema>) {
    const job = await extendVideo(getEnv(), extendSchema.parse(input), {
      ffmpeg: runFfmpeg,
      startJob: (start) => getRunner().startJob(start),
    });
    return { id: job.id, status: job.status };
  },
  get_sequence() {
    return sequenceView();
  },
  async add_to_sequence(input: z.infer<typeof pathSchema>) {
    await getSequenceStore().appendClip(pathSchema.parse(input).path);
    return sequenceView();
  },
  // Mirrors POST /api/sequence/media/upload, e.g. for a music track.
  async upload_to_editor(input: z.infer<typeof editorUploadSchema>) {
    const { filename, base64 } = editorUploadSchema.parse(input);
    const ext = path.extname(filename).toLowerCase();
    if (!UPLOAD_EXTS.includes(ext)) throw new Error(`Unsupported file type "${ext || "?"}"`);
    const bytes = Buffer.from(base64, "base64");
    if (bytes.length > UPLOAD_MAX_BYTES) throw new Error("File is larger than 500 MB");
    const relPath = `uploads/editor/${crypto.randomUUID()}${ext}`;
    const abs = path.join(getEnv().dataDir, relPath);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, bytes);
    const media = await getSequenceStore().importMedia(relPath).catch(async (err) => {
      await rm(abs, { force: true });
      throw err;
    });
    return { media };
  },
  async import_media(input: z.infer<typeof pathSchema>) {
    return { media: await getSequenceStore().importMedia(pathSchema.parse(input).path) };
  },
  async update_sequence(input: z.input<typeof sequencePatchSchema>) {
    await getSequenceStore().updateSequence(sequencePatchSchema.parse(input));
    return sequenceView();
  },
  async remove_clip(input: z.infer<typeof idSchema>) {
    await getSequenceStore().removeClip(idSchema.parse(input).id);
    return sequenceView();
  },
  list_social_accounts() {
    const key = getZernioKey();
    if (!key) throw new Error("Add a Zernio API key in Phaino Settings to post");
    return listSocialAccounts(zernioClient(key));
  },
  post_to_social(input: z.input<typeof socialPostSchema>) {
    const key = getZernioKey();
    if (!key) throw new Error("Add a Zernio API key in Phaino Settings to post");
    return postOutput(zernioClient(key), socialPostSchema.parse(input));
  },
  async export_sequence(input: z.input<typeof exportSchema>) {
    const job = await startExport(exportSchema.parse(input));
    return { id: job.id, status: job.status };
  },
};

async function toolResult(run: () => unknown): Promise<CallToolResult> {
  try {
    return { content: [{ type: "text", text: JSON.stringify(await run(), null, 2) }] };
  } catch (error) {
    return {
      isError: true,
      content: [{ type: "text", text: error instanceof Error ? error.message : "Tool failed" }],
    };
  }
}

/** Each HTTP request gets a fresh server and stateless transport. */
export function createMcpServer() {
  const server = new McpServer(
    { name: "phaino", version: pkg.version },
    { instructions: INSTRUCTIONS },
  );
  const readOnly = { readOnlyHint: true, openWorldHint: false };
  const localWrite = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
  const localReplace = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false };
  const paidRun = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true };
  server.registerTool("list_presets", {
    description: "List presets with model labels and input and parameter keys.",
    inputSchema: z.object({}),
    annotations: readOnly,
  }, () => toolResult(() => toolHandlers.list_presets()));
  server.registerTool("get_preset", {
    description: "Read a preset, including inputs, parameters and defaults.",
    inputSchema: idSchema,
    annotations: readOnly,
  }, (input) => toolResult(() => toolHandlers.get_preset(input)));
  server.registerTool("get_workflow", {
    description: "Read a preset's ComfyUI graph or API workflow as JSON.",
    inputSchema: workflowSchema,
    annotations: readOnly,
  }, (input) => toolResult(() => toolHandlers.get_workflow(input)));
  server.registerTool("run_preset", {
    description: "Start a preset using your configured Comfy account. Returns the job id and status immediately. Inputs map preset input keys to upload ids from upload_media or use_output_as_input.",
    inputSchema: runSchema,
    annotations: paidRun,
  }, (input) => toolResult(() => toolHandlers.run_preset(input)));
  server.registerTool("get_job", {
    description: "Read a job's status, progress, output download URLs and outputPaths.",
    inputSchema: idSchema,
    annotations: readOnly,
  }, (input) => toolResult(() => toolHandlers.get_job(input)));
  server.registerTool("list_jobs", {
    description: "List recent jobs, newest first, with output paths. Filter by category: image, video, camera, edit or export.",
    inputSchema: listJobsSchema,
    annotations: readOnly,
  }, (input) => toolResult(() => toolHandlers.list_jobs(input)));
  server.registerTool("cancel_job", {
    description: "Cancel a queued or running job or export.",
    inputSchema: idSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  }, (input) => toolResult(() => toolHandlers.cancel_job(input)));
  server.registerTool("upload_media", {
    description: "Upload a PNG, JPEG, WebP, MP4, MOV or WebM file as base64. Returns an uploadId for run_preset inputs.",
    inputSchema: uploadSchema,
    annotations: localWrite,
  }, (input) => toolResult(() => toolHandlers.upload_media(input)));
  server.registerTool("use_output_as_input", {
    description: "Copy a generated output (a path from outputPaths) into uploads and return its uploadId, e.g. to animate an image.",
    inputSchema: pathSchema,
    annotations: localWrite,
  }, (input) => toolResult(() => toolHandlers.use_output_as_input(input)));
  server.registerTool("extend_video", {
    description: "Continue an uploaded video from its last frame with a video model id such as ltx25. Returns the new job.",
    inputSchema: extendSchema,
    annotations: paidRun,
  }, (input) => toolResult(() => toolHandlers.extend_video(input)));
  server.registerTool("get_sequence", {
    description: "Read the Editor timeline: media, video clips (in and out frames, fades, transitions), audio clips and titles.",
    inputSchema: z.object({}),
    annotations: readOnly,
  }, () => toolResult(() => toolHandlers.get_sequence()));
  server.registerTool("add_to_sequence", {
    description: "Append a generated output (a path from outputPaths) to the end of the Editor's video track.",
    inputSchema: pathSchema,
    annotations: localWrite,
  }, (input) => toolResult(() => toolHandlers.add_to_sequence(input)));
  server.registerTool("import_media", {
    description: "Import an output or upload into the Editor's media bin without placing it. Use the media id in update_sequence audio clips.",
    inputSchema: pathSchema,
    annotations: localWrite,
  }, (input) => toolResult(() => toolHandlers.import_media(input)));
  server.registerTool("upload_to_editor", {
    description: "Upload a file (MP3, WAV, M4A, MP4, MOV, WebM, PNG, JPEG or WebP) as base64 into the Editor's media bin, e.g. a music track. Returns the media; place it with update_sequence.",
    inputSchema: editorUploadSchema,
    annotations: localWrite,
  }, (input) => toolResult(() => toolHandlers.upload_to_editor(input)));
  server.registerTool("update_sequence", {
    description: "Replace any of: settings (fps, resolution, aspect, fit, handles), clips (order, trims, fades, transitions), audio or titles. Frames use the sequence fps. Read get_sequence first and send whole arrays.",
    inputSchema: sequencePatchSchema,
    annotations: localReplace,
  }, (input) => toolResult(() => toolHandlers.update_sequence(input)));
  server.registerTool("remove_clip", {
    description: "Remove a clip from the Editor's video track by clip id.",
    inputSchema: idSchema,
    annotations: localReplace,
  }, (input) => toolResult(() => toolHandlers.remove_clip(input)));
  server.registerTool("export_sequence", {
    description: "Render the Editor timeline to a video file (render) or an NLE package (package). Returns an export job; poll get_job for the file.",
    inputSchema: exportSchema,
    annotations: localWrite,
  }, (input) => toolResult(() => toolHandlers.export_sequence(input)));
  server.registerTool("list_social_accounts", {
    description: "List the social accounts connected to the user's Zernio key (platform, name, handle, status).",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, () => toolResult(() => toolHandlers.list_social_accounts()));
  server.registerTool("post_to_social", {
    description: "Publicly post one output (a path from outputPaths) with a caption to connected accounts by id. Confirm with the user first. Returns each account's outcome and post URL.",
    inputSchema: socialPostSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, (input) => toolResult(() => toolHandlers.post_to_social(input)));
  return server;
}
