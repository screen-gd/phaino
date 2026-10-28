import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import pkg from "../../../package.json";
import { isDemoMode } from "@/lib/demo-mode";
import { getRunner } from "@/server/jobs/runner";
import { getStore } from "@/server/jobs/store";
import { getPreset, listPresets } from "@/server/presets/load";

const idSchema = z.object({ id: z.string().min(1) });
const workflowSchema = idSchema.extend({ format: z.enum(["ui", "api"]) });
// Match POST /api/jobs. The runner validates preset params and upload bindings.
const runSchema = z.object({
  presetId: z.string().min(1),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  inputs: z.record(z.string(), z.string()).default({}),
});

function requirePreset(id: string) {
  const loaded = getPreset(id);
  if (!loaded) throw new Error(`Unknown preset "${id}"`);
  return loaded;
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
      outputs: job.outputs.map((output) =>
        `/api/outputs/${output.split("/").map(encodeURIComponent).join("/")}`,
      ),
    };
  },
};

function toolResult(run: () => unknown): CallToolResult {
  try {
    return { content: [{ type: "text", text: JSON.stringify(run(), null, 2) }] };
  } catch (error) {
    return {
      isError: true,
      content: [{ type: "text", text: error instanceof Error ? error.message : "Tool failed" }],
    };
  }
}

/** Each HTTP request gets a fresh server and stateless transport. */
export function createMcpServer() {
  const server = new McpServer({ name: "phaino", version: pkg.version });
  const readOnly = { readOnlyHint: true, openWorldHint: false };
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
    description: "Start a preset using your configured Comfy account. Returns the job id and status immediately. Inputs map preset input keys to upload ids from POST /api/uploads.",
    inputSchema: runSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, (input) => toolResult(() => toolHandlers.run_preset(input)));
  server.registerTool("get_job", {
    description: "Read a job's status, progress and output download URLs.",
    inputSchema: idSchema,
    annotations: readOnly,
  }, (input) => toolResult(() => toolHandlers.get_job(input)));
  return server;
}
