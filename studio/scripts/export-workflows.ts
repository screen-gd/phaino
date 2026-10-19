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
import { chromium, type Browser } from "playwright";
import { presetSchema, type Preset } from "../src/server/presets/schema.ts";

const COMFYUI_URL = (process.env.COMFYUI_URL ?? "http://127.0.0.1:8188").replace(/\/$/, "");
const PRESETS_DIR = path.resolve(process.cwd(), "../presets");
const SNAPSHOT_FILE = path.resolve(process.cwd(), "src/server/comfy/object_info.snapshot.json");
const TEMPLATES_REPO = "Comfy-Org/workflow_templates";

type UiWorkflow = {
  nodes?: { id?: unknown; mode?: number }[];
  [k: string]: unknown;
};

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

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

let templatesSource = "";

async function fetchTemplate(name: string): Promise<UiWorkflow> {
  try {
    const json = (await fetchJson(`${COMFYUI_URL}/templates/${name}.json`)) as UiWorkflow;
    templatesSource = `served by ComfyUI at ${COMFYUI_URL}`;
    return json;
  } catch {
    const res = (await fetchJson(
      "https://api.github.com/repos/Comfy-Org/workflow_templates/commits/main",
    )) as { sha?: string };
    if (!res.sha) throw new Error("could not resolve workflow_templates main sha");
    templatesSource = `github ${TEMPLATES_REPO}@${res.sha}`;
    return (await fetchJson(
      `https://raw.githubusercontent.com/${TEMPLATES_REPO}/${res.sha}/templates/${name}.json`,
    )) as UiWorkflow;
  }
}

async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
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
  console.log(`templates: ${templateNames.join(", ")} (${templatesSource})`);

  const stats = (await fetchJson(`${COMFYUI_URL}/system_stats`)) as {
    system?: { comfyui_version?: string };
  };
  const comfyuiVersion = stats.system?.comfyui_version ?? "unknown";

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.goto(COMFYUI_URL, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => (window as { app?: { graph?: unknown } }).app?.graph != null,
      undefined,
      { timeout: 120_000 },
    );

    const frontendVersion = await page.evaluate(() => {
      const w = window as { __COMFYUI_FRONTEND_VERSION__?: string };
      return w.__COMFYUI_FRONTEND_VERSION__ ?? null;
    });

    const usedClasses = new Set<string>();
    for (const preset of presets) {
      const graph = structuredClone(templates.get(preset.source.template));
      if (!graph) throw new Error(`no template "${preset.source.template}"`);
      applyModes(graph, preset.source.modes);

      const result = await page.evaluate(async (graphJson) => {
        const app = (
          window as unknown as {
            app: {
              loadGraphData: (g: unknown) => Promise<unknown>;
              graphToPrompt: () => Promise<{ workflow: unknown; output: unknown }>;
            };
          }
        ).app;
        await app.loadGraphData(graphJson);
        return app.graphToPrompt();
      }, graph);

      const dir = path.join(PRESETS_DIR, preset.id);
      fs.writeFileSync(
        path.join(dir, "workflow.json"),
        JSON.stringify(result.workflow, null, 2) + "\n",
      );
      fs.writeFileSync(
        path.join(dir, "workflow_api.json"),
        JSON.stringify(result.output, null, 2) + "\n",
      );

      const api = result.output as Record<string, { class_type?: string }>;
      for (const node of Object.values(api)) {
        if (node.class_type) usedClasses.add(node.class_type);
      }
      console.log(`wrote presets/${preset.id}/workflow.json + workflow_api.json`);
    }

    const objectInfo = (await fetchJson(`${COMFYUI_URL}/object_info`)) as Record<string, unknown>;
    const nodes: Record<string, unknown> = {};
    for (const cls of [...usedClasses].sort()) {
      if (objectInfo[cls]) nodes[cls] = objectInfo[cls];
      else console.warn(`object_info is missing class "${cls}"`);
    }

    const snapshot = {
      meta: {
        comfyuiVersion,
        frontendVersion: frontendVersion ?? "unknown",
        templatesSource,
        generatedAt: new Date().toISOString(),
      },
      nodes,
    };
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2) + "\n");
    console.log(
      `wrote object_info snapshot (${Object.keys(nodes).length} classes) -> ${path.relative(process.cwd(), SNAPSHOT_FILE)}`,
    );
  } finally {
    await browser.close();
  }
}

await main();
