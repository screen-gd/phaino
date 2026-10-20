/**
 * Regenerate presets/<id>/workflow.json (UI format) and workflow_api.json
 * (API format) by loading each preset's source template into a headless
 * ComfyUI and calling app.graphToPrompt(). Also snapshots the object_info
 * entries for the node classes the exports actually use.
 *
 * Reads only and never queues a prompt. Needs a running ComfyUI
 * (COMFYUI_URL, default http://127.0.0.1:8188); a CPU-only install is enough.
 */
import fs from "node:fs";
import path from "node:path";
import { presetSchema, type Preset } from "../src/server/presets/schema.ts";
import {
  buildSnapshot,
  comfyuiVersion,
  fetchObjectInfo,
  fetchTemplate,
  frontendVersion,
  graphToPrompt,
  launchBrowser,
  openComfyPage,
  COMFYUI_URL,
  type ApiGraph,
  type UiWorkflow,
} from "./lib/comfy-export.ts";

const PRESETS_DIR = path.resolve(process.cwd(), "../presets");
const SNAPSHOT_FILE = path.resolve(process.cwd(), "src/server/comfy/object_info.snapshot.json");

function readPresets(): Preset[] {
  const out: Preset[] = [];
  for (const entry of fs.readdirSync(PRESETS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(PRESETS_DIR, entry.name, "preset.json");
    if (!fs.existsSync(file)) continue;
    const preset = presetSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
    if (preset.id !== entry.name) {
      throw new Error(`presets/${entry.name}: id "${preset.id}" does not match the folder name`);
    }
    out.push(preset);
  }
  return out;
}

/** Apply source.modes: set top-level node `mode` by id in the UI graph. */
function applyModes(template: UiWorkflow, modes: Record<string, number> | undefined) {
  if (!modes) return;
  const nodes = template.nodes ?? [];
  for (const [id, mode] of Object.entries(modes)) {
    const node = nodes.find((n) => String(n.id) === id);
    if (!node) throw new Error(`mode override: node "${id}" not in template`);
    node.mode = mode;
  }
}

async function main() {
  const presets = readPresets();
  console.log(`export:workflows: ${presets.length} presets, ComfyUI at ${COMFYUI_URL}`);

  const templateNames = [...new Set(presets.map((p) => p.source.template))];
  const templates = new Map<string, UiWorkflow>();
  for (const name of templateNames) {
    templates.set(name, await fetchTemplate(name));
  }
  console.log(`templates: ${templateNames.join(", ")}`);

  const version = await comfyuiVersion();
  const browser = await launchBrowser();
  try {
    const page = await openComfyPage(browser);
    const feVersion = await frontendVersion(page);

    const usedClasses = new Set<string>();
    for (const preset of presets) {
      const graph = structuredClone(templates.get(preset.source.template));
      if (!graph) throw new Error(`no template "${preset.source.template}"`);
      applyModes(graph, preset.source.modes);

      const result = await graphToPrompt(page, graph);

      const dir = path.join(PRESETS_DIR, preset.id);
      fs.writeFileSync(
        path.join(dir, "workflow.json"),
        JSON.stringify(result.workflow, null, 2) + "\n",
      );
      fs.writeFileSync(
        path.join(dir, "workflow_api.json"),
        JSON.stringify(result.output, null, 2) + "\n",
      );

      const api = result.output as ApiGraph;
      for (const node of Object.values(api)) {
        if (node.class_type) usedClasses.add(node.class_type);
      }
      console.log(`wrote presets/${preset.id}/workflow.json + workflow_api.json`);
    }

    const objectInfo = await fetchObjectInfo();
    const snapshot = buildSnapshot(objectInfo, usedClasses, {
      comfyuiVersion: version,
      frontendVersion: feVersion ?? "unknown",
      generatedAt: new Date().toISOString(),
    });
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2) + "\n");
    console.log(
      `wrote object_info snapshot (${Object.keys(snapshot.nodes).length} classes) -> ${path.relative(process.cwd(), SNAPSHOT_FILE)}`,
    );
  } finally {
    await browser.close();
  }
}

await main();
