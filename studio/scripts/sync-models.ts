/**
 * Sync the template-backed model modes from Comfy-Org/workflow_templates:
 * fetch each template at the pinned ref, run graphToPrompt headless, gate it
 * (no api nodes, public model downloads, bindings detected, snapshot-valid),
 * and write models/cache + models/manifest.json.
 *
 * `pnpm models:sync`           use the pinned TEMPLATES_REF
 * `pnpm models:sync -- --update-ref`  resolve main and rewrite TEMPLATES_REF
 *
 * Reads only and never queues a prompt. Needs a running ComfyUI.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  detectPreset,
  detectSwapPreset,
  detectToolPreset,
} from "../src/server/models/bindings.ts";
import {
  MODEL_REGISTRY,
  TEMPLATES_REF,
  modePresetId,
  type ModelMode,
} from "../src/server/models/registry.ts";
import { EDIT_TOOLS, toolPresetId } from "../src/server/models/tools.ts";
import { validateWorkflowApi } from "../src/server/presets/validate.ts";
import { pinModels } from "./pin-models.ts";
import {
  buildSnapshot,
  comfyuiVersion,
  fetchJson,
  fetchObjectInfo,
  fetchTemplateAtRef,
  frontendVersion,
  graphToPrompt,
  launchBrowser,
  openComfyPage,
  COMFYUI_URL,
  TEMPLATES_REPO,
  type ApiGraph,
  type UiWorkflow,
} from "./lib/comfy-export.ts";

const ROOT = path.resolve(process.cwd(), "..");
const CACHE_DIR = path.join(ROOT, "models", "cache");
const MANIFEST = path.join(ROOT, "models", "manifest.json");
const SNAPSHOT_FILE = path.resolve(process.cwd(), "src/server/comfy/object_info.snapshot.json");
const REGISTRY_FILE = path.resolve(process.cwd(), "src/server/models/registry.ts");

type ModeManifest = {
  template: string;
  gate: "pass" | "fail";
  reasons: string[];
  licenses: {
    model: string;
    url: string;
    license: string | null;
    gated?: boolean;
    revision?: string;
    sha256?: string;
  }[];
};

async function resolveMainRef(): Promise<string> {
  const res = (await fetchJson(
    `https://api.github.com/repos/${TEMPLATES_REPO}/commits/main`,
  )) as { sha?: string };
  if (!res.sha) throw new Error("could not resolve workflow_templates main sha");
  return res.sha;
}

function updateRefInRegistry(ref: string) {
  const src = fs.readFileSync(REGISTRY_FILE, "utf8");
  const next = src.replace(
    /export const TEMPLATES_REF = "[0-9a-f]+";/,
    `export const TEMPLATES_REF = "${ref}";`,
  );
  if (next === src) throw new Error("TEMPLATES_REF not found in registry.ts");
  fs.writeFileSync(REGISTRY_FILE, next);
}

/**
 * HEAD the url. Public when it answers 2xx without auth; when Hugging Face
 * answers 401/403, a repo with `gated: "auto"` still counts as open weights
 * (click-through terms, then a free download).
 */
async function isPublic(url: string): Promise<{ ok: boolean; gated?: boolean }> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return { ok: true };
    if (
      (res.status !== 401 && res.status !== 403) ||
      !url.includes("huggingface.co")
    ) {
      return { ok: false };
    }
    const m = /huggingface\.co\/([^/]+\/[^/]+)\//.exec(url);
    if (!m) return { ok: false };
    const info = (await fetchJson(
      `https://huggingface.co/api/models/${m[1]}`,
    )) as { gated?: string | boolean };
    return info.gated === "auto" ? { ok: true, gated: true } : { ok: false };
  } catch {
    return { ok: false };
  }
}

/** Licence tag from the HF model card API, or null when unknown. */
async function hfLicense(url: string): Promise<string | null> {
  const m = /huggingface\.co\/(?:models\/)?([^/]+\/[^/]+)/.exec(url);
  if (!m) return null;
  try {
    const res = (await fetchJson(
      `https://huggingface.co/api/models/${m[1]}`,
    )) as { cardData?: { license?: string | string[] } };
    const lic = res.cardData?.license;
    return Array.isArray(lic) ? lic.join(",") : (lic ?? null);
  } catch {
    return null;
  }
}

function objectInfoIsApiNode(info: unknown): boolean {
  const node = info as { api_node?: boolean; name?: string } | undefined;
  return node?.api_node === true || /Comfy Cloud.*BETA/i.test(node?.name ?? "");
}

async function main() {
  const updateRef = process.argv.includes("--update-ref");
  const ref = updateRef ? await resolveMainRef() : TEMPLATES_REF;
  if (updateRef) {
    updateRefInRegistry(ref);
    console.log(`TEMPLATES_REF -> ${ref}`);
  }
  console.log(`models:sync at ${TEMPLATES_REPO}@${ref}, ComfyUI ${COMFYUI_URL}`);

  const items: {
    id: string;
    template: string;
    bucket: "modes" | "tools";
    detect: (api: ApiGraph, ui: UiWorkflow) => {
      preset: unknown;
      problems: string[];
      models: { name: string; url: string }[];
    };
  }[] = [];
  for (const model of MODEL_REGISTRY) {
    for (const [mode, src] of Object.entries(model.modes)) {
      if (src && "template" in src) {
        items.push({
          id: modePresetId(model, mode as ModelMode),
          template: src.template,
          bucket: "modes",
          detect: (api, ui) =>
            mode === "swap"
              ? detectSwapPreset(model, api, ui, {
                  nodes: objectInfoRef.current as never,
                })
              : detectPreset(model, mode as ModelMode, api, ui, {
                  nodes: objectInfoRef.current as never,
                }),
        });
      }
    }
  }
  for (const tool of EDIT_TOOLS) {
    if (!tool.template) continue;
    items.push({
      id: toolPresetId(tool),
      template: tool.template,
      bucket: "tools",
      detect: (api, ui) =>
        detectToolPreset(tool, api, ui, { nodes: objectInfoRef.current as never }),
    });
  }
  const objectInfoRef = { current: {} as Record<string, unknown> };
  console.log(
    `${items.length} template-backed entries (${items.filter((i) => i.bucket === "modes").length} modes, ${items.filter((i) => i.bucket === "tools").length} tools)`,
  );

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const templates = new Map<string, unknown>();
  for (const { template } of items) {
    if (!templates.has(template)) {
      templates.set(template, await fetchTemplateAtRef(template, ref));
      console.log(`fetched ${template}.json`);
    }
  }

  const version = await comfyuiVersion();
  const objectInfo = await fetchObjectInfo();
  objectInfoRef.current = objectInfo;
  const browser = await launchBrowser();
  const manifest: Record<string, ModeManifest> = {};
  const toolManifest: Record<string, ModeManifest> = {};
  const usedClasses = new Set<string>();
  const templateHashes: Record<string, string> = {};

  try {
    const page = await openComfyPage(browser);
    const feVersion = await frontendVersion(page);

    // Cache files are keyed by the template content hash: an unchanged
    // template reuses its converted graphs instead of re-serializing them
    // (graphToPrompt output embeds random UUIDs, so a naive rewrite churns).
    const prev = fs.existsSync(MANIFEST)
      ? (JSON.parse(fs.readFileSync(MANIFEST, "utf8")) as {
          templates?: Record<string, string>;
        })
      : {};
    const prevHashes = prev.templates ?? {};

    for (const { id, template, bucket, detect } of items) {
      const reasons: string[] = [];
      const ui = templates.get(template) as UiWorkflow;
      const target = bucket === "tools" ? toolManifest : manifest;
      const hash = createHash("sha256")
        .update(JSON.stringify(ui))
        .digest("hex")
        .slice(0, 16);
      templateHashes[template] = hash;
      const apiFile = path.join(CACHE_DIR, `${template}.api.json`);
      const uiFile = path.join(CACHE_DIR, `${template}.ui.json`);
      let api: ApiGraph;
      if (
        prevHashes[template] === hash &&
        fs.existsSync(apiFile) &&
        fs.existsSync(uiFile)
      ) {
        api = JSON.parse(fs.readFileSync(apiFile, "utf8"));
      } else {
        try {
          const result = await graphToPrompt(page, structuredClone(ui));
          api = result.output as ApiGraph;
          fs.writeFileSync(
            uiFile,
            JSON.stringify(result.workflow, null, 2) + "\n",
          );
          fs.writeFileSync(
            apiFile,
            JSON.stringify(result.output, null, 2) + "\n",
          );
        } catch (error) {
          target[id] = {
            template,
            gate: "fail",
            reasons: [
              `graphToPrompt: ${error instanceof Error ? error.message : String(error)}`,
            ],
            licenses: [],
          };
          console.log(`${id}: FAIL (graphToPrompt)`);
          continue;
        }
      }

      // Gate 1: no partner/API/Comfy Cloud nodes.
      for (const [nodeId, node] of Object.entries(api)) {
        const cls = node.class_type ?? "?";
        const info = (objectInfo as Record<string, unknown>)[cls];
        if (!info) {
          reasons.push(`node ${nodeId} (${cls}) not in object_info`);
        } else if (objectInfoIsApiNode(info)) {
          reasons.push(`node ${nodeId} (${cls}) is an API/partner node`);
        }
      }

      // Detect binds, then gate 3 checks its result.
      const detection = detect(api, ui);
      reasons.push(...detection.problems);

      // Gate 2: every model file is publicly downloadable; HF repos with
      // gated: "auto" count as open weights and are marked in the manifest.
      const licenses: ModeManifest["licenses"] = [];
      for (const m of detection.models) {
        const pub = await isPublic(m.url);
        if (!pub.ok) {
          reasons.push(`model ${m.name} is not publicly downloadable (${m.url})`);
        }
        licenses.push({
          model: m.name,
          url: m.url,
          license: await hfLicense(m.url),
          ...(pub.gated ? { gated: true } : {}),
        });
      }

      // Gate 4: validator against the object_info snapshot.
      if (detection.preset) {
        const problems = validateWorkflowApi(api, detection.preset as never, {
          nodes: objectInfo as never,
        });
        reasons.push(...problems);
        for (const cls of Object.values(api).map((n) => n.class_type)) {
          if (cls) usedClasses.add(cls);
        }
      }

      // Thumb from the template preview image.
      if (detection.preset && detection.problems.length === 0) {
        try {
          const res = await fetch(
            `https://raw.githubusercontent.com/${TEMPLATES_REPO}/${ref}/templates/${template}-1.webp`,
          );
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            execFileSync("ffmpeg", [
              "-y", "-v", "error",
              "-i", "pipe:0",
              "-vf", "scale=640:360:force_original_aspect_ratio=increase,crop=640:360",
              "-c:v", "libwebp", "-quality", "80",
              path.join(CACHE_DIR, `${template}.webp`),
            ], { input: buf });
          }
        } catch {
          /* no preview is fine */
        }
      }

      const gate = reasons.length === 0 && detection.preset ? "pass" : "fail";
      target[id] = { template, gate, reasons, licenses };
      console.log(`${id}: ${gate.toUpperCase()}${reasons.length ? ` (${reasons.join("; ")})` : ""}`);
    }

    // Snapshot covers every class used by the passing modes plus the presets.
    const presetsDir = path.join(ROOT, "presets");
    for (const entry of fs.readdirSync(presetsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const apiFile = path.join(presetsDir, entry.name, "workflow_api.json");
      if (!fs.existsSync(apiFile)) continue;
      const api = JSON.parse(fs.readFileSync(apiFile, "utf8")) as ApiGraph;
      for (const cls of Object.values(api).map((n) => n.class_type)) {
        if (cls) usedClasses.add(cls);
      }
    }
    const snapshot = buildSnapshot(objectInfo, usedClasses, {
      comfyuiVersion: version,
      frontendVersion: feVersion ?? "unknown",
      templatesRef: ref,
      generatedAt: new Date().toISOString(),
    });
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2) + "\n");
  } finally {
    await browser.close();
  }

  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  fs.writeFileSync(
    MANIFEST,
    JSON.stringify(
      { ref, modes: manifest, tools: toolManifest, templates: templateHashes },
      null,
      2,
    ) + "\n",
  );
  const passing = Object.values(manifest).filter((m) => m.gate === "pass").length;
  const toolsPassing = Object.values(toolManifest).filter((m) => m.gate === "pass").length;
  console.log(
    `manifest: ${passing}/${Object.keys(manifest).length} modes, ${toolsPassing}/${Object.keys(toolManifest).length} tools pass`,
  );
  const { pinned, failed } = await pinModels();
  console.log(`pinned ${pinned} license entries`);
  for (const f of failed) console.log(`FAILED ${f}`);
}

await main();
