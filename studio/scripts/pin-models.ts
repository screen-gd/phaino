/**
 * Pin every Hugging Face model URL in models/manifest.json to a revision sha
 * and the file's sha256, so a re-uploaded weights file can't drift under the
 * same URL. Needs no ComfyUI: `pnpm models:pin`. sync-models calls pinModels
 * after writing the manifest so future syncs stay pinned.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(process.cwd(), "..");
const MANIFEST = path.join(ROOT, "models", "manifest.json");
const HF_URL =
  /^https:\/\/huggingface\.co\/([^/]+\/[^/]+)\/resolve\/[^/]+\/([^?\s]+)/;
const TIMEOUT_MS = 15_000;

type LicenseEntry = {
  model: string;
  url: string;
  license: string | null;
  gated?: boolean;
  revision?: string;
  sha256?: string;
};
type Manifest = {
  modes?: Record<string, { licenses?: LicenseEntry[] }>;
  tools?: Record<string, { licenses?: LicenseEntry[] }>;
};

async function resolveSha(repo: string): Promise<string> {
  const res = await fetch(
    `https://huggingface.co/api/models/${repo}/revision/main`,
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { sha?: string };
  if (!data.sha) throw new Error("no sha in revision response");
  return data.sha;
}

async function fileOids(
  repo: string,
  sha: string,
  paths: string[],
): Promise<Map<string, string>> {
  const res = await fetch(
    `https://huggingface.co/api/models/${repo}/paths-info/${sha}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = (await res.json()) as {
    path?: string;
    oid?: string;
    lfs?: { oid?: string };
  }[];
  const oids = new Map<string, string>();
  for (const row of rows) {
    const oid = row.lfs?.oid ?? row.oid;
    if (row.path && oid) oids.set(row.path, oid);
  }
  return oids;
}

/** Pin every licenses entry in the manifest in place and rewrite the file. */
export async function pinModels(): Promise<{
  pinned: number;
  failed: string[];
}> {
  const manifest = JSON.parse(
    fs.readFileSync(MANIFEST, "utf8"),
  ) as Manifest;
  const entries: LicenseEntry[] = [];
  for (const group of [manifest.modes, manifest.tools]) {
    for (const entry of Object.values(group ?? {})) {
      entries.push(...(entry.licenses ?? []));
    }
  }
  const wanted = new Map<string, Set<string>>();
  for (const entry of entries) {
    const m = HF_URL.exec(entry.url);
    if (!m) continue;
    const [, repo, filePath] = m;
    let paths = wanted.get(repo);
    if (!paths) wanted.set(repo, (paths = new Set()));
    paths.add(filePath);
  }

  const resolved = new Map<
    string,
    { sha: string; oids: Map<string, string> }
  >();
  const repoErrors = new Map<string, string>();
  for (const [repo, paths] of wanted) {
    try {
      const sha = await resolveSha(repo);
      resolved.set(repo, { sha, oids: await fileOids(repo, sha, [...paths]) });
    } catch (error) {
      repoErrors.set(
        repo,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  let pinned = 0;
  const failed: string[] = [];
  for (const entry of entries) {
    const m = HF_URL.exec(entry.url);
    if (!m) continue;
    const [, repo, filePath] = m;
    const r = resolved.get(repo);
    const oid = r?.oids.get(filePath);
    if (r && oid) {
      entry.revision = r.sha;
      entry.sha256 = oid;
      pinned++;
    } else {
      failed.push(
        `${entry.url} (${repoErrors.get(repo) ?? "file not in paths-info"})`,
      );
    }
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  return { pinned, failed };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { pinned, failed } = await pinModels();
  console.log(`pinned ${pinned} license entr${pinned === 1 ? "y" : "ies"}`);
  for (const f of failed) console.log(`FAILED ${f}`);
  if (failed.length > 0) process.exitCode = 1;
}
