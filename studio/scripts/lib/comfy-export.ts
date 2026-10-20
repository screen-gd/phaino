/**
 * Shared headless-ComfyUI helpers for scripts that load workflow JSONs and
 * call graphToPrompt. Never queues a prompt.
 */
import { chromium, type Browser, type Page } from "playwright";

export const COMFYUI_URL = (process.env.COMFYUI_URL ?? "http://127.0.0.1:8188").replace(/\/$/, "");
export const TEMPLATES_REPO = "Comfy-Org/workflow_templates";

export type UiWorkflow = {
  nodes?: { id?: unknown; mode?: number }[];
  [k: string]: unknown;
};

export async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

export async function fetchTemplateAtRef(
  name: string,
  ref: string,
): Promise<UiWorkflow> {
  return (await fetchJson(
    `https://raw.githubusercontent.com/${TEMPLATES_REPO}/${ref}/templates/${name}.json`,
  )) as UiWorkflow;
}

export async function fetchTemplate(name: string): Promise<UiWorkflow> {
  try {
    return (await fetchJson(`${COMFYUI_URL}/templates/${name}.json`)) as UiWorkflow;
  } catch {
    const res = (await fetchJson(
      `https://api.github.com/repos/${TEMPLATES_REPO}/commits/main`,
    )) as { sha?: string };
    if (!res.sha) throw new Error("could not resolve workflow_templates main sha");
    return fetchTemplateAtRef(name, res.sha);
  }
}

export async function comfyuiVersion(): Promise<string> {
  const stats = (await fetchJson(`${COMFYUI_URL}/system_stats`)) as {
    system?: { comfyui_version?: string };
  };
  return stats.system?.comfyui_version ?? "unknown";
}

export async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

/** Open ComfyUI and wait for the app to be ready to load graphs. */
export async function openComfyPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.goto(COMFYUI_URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => (window as { app?: { graph?: unknown } }).app?.graph != null,
    undefined,
    { timeout: 120_000 },
  );
  return page;
}

export async function frontendVersion(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const w = window as { __COMFYUI_FRONTEND_VERSION__?: string };
    return w.__COMFYUI_FRONTEND_VERSION__ ?? null;
  });
}

export async function graphToPrompt(
  page: Page,
  graph: UiWorkflow,
): Promise<{ workflow: unknown; output: unknown }> {
  return page.evaluate(async (graphJson) => {
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
}

export type ApiGraph = Record<string, { class_type?: string; [k: string]: unknown }>;

export async function fetchObjectInfo(): Promise<Record<string, unknown>> {
  return (await fetchJson(`${COMFYUI_URL}/object_info`)) as Record<string, unknown>;
}

/** The snapshot shape shared by the validator and presets.test.ts. */
export function buildSnapshot(
  objectInfo: Record<string, unknown>,
  usedClasses: Iterable<string>,
  meta: Record<string, unknown>,
): { meta: Record<string, unknown>; nodes: Record<string, unknown> } {
  const nodes: Record<string, unknown> = {};
  for (const cls of [...usedClasses].sort()) {
    if (objectInfo[cls]) nodes[cls] = objectInfo[cls];
    else console.warn(`object_info is missing class "${cls}"`);
  }
  return { meta, nodes };
}
