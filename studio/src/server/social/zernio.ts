import "server-only";

import { openAsBlob, readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { createSocial, type AccountRecord, type DeliveryOutcome } from "@opencoredev/social-sdk";
import { zernio } from "@opencoredev/social-sdk/cloud/zernio";
import { z } from "zod";
import { maskKey } from "@/server/comfy/credentials";
import { getEnv, type StudioEnv } from "@/server/env";
import { QueuedJsonFile } from "@/server/jsonFile";
import { resolveOutput } from "@/server/outputs";

/**
 * Bring-your-own Zernio key for posting outputs to the user's connected
 * social accounts, through the Social SDK's Zernio backend. The key lives in
 * ${dataDir}/social.json and never leaves the server.
 */

const credentialsSchema = z.object({ apiKey: z.string().min(1), savedAt: z.string() });
type FileData = { zernio: z.infer<typeof credentialsSchema> | null };

const FILE = "social.json";

export function getZernioKey(env: StudioEnv = getEnv()): string | null {
  try {
    const raw = JSON.parse(readFileSync(path.join(env.dataDir, FILE), "utf8")) as FileData;
    return raw?.zernio ? credentialsSchema.parse(raw.zernio).apiKey : null;
  } catch {
    return null;
  }
}

function file(env: StudioEnv) {
  return new QueuedJsonFile<FileData>(path.join(env.dataDir, FILE), () => ({ zernio: null }));
}

export async function saveZernioKey(apiKey: string, env: StudioEnv = getEnv()): Promise<void> {
  await file(env).update((data) => {
    data.zernio = { apiKey, savedAt: new Date().toISOString() };
  });
}

export async function clearZernioKey(env: StudioEnv = getEnv()): Promise<void> {
  await file(env).update((data) => {
    data.zernio = null;
  });
}

export function zernioStatus(env: StudioEnv = getEnv()) {
  const key = getZernioKey(env);
  return { configured: key !== null, maskedKey: key ? maskKey(key) : null };
}

export type SocialClient = Pick<ReturnType<typeof createSocial>, "accounts" | "posts">;

export function zernioClient(apiKey: string): SocialClient {
  return createSocial({ backend: zernio({ apiKey }) });
}

export type SocialAccount = {
  id: string;
  platform: string;
  name: string;
  handle?: string;
  status: AccountRecord["status"];
};

async function allAccounts(social: SocialClient): Promise<AccountRecord[]> {
  const out: AccountRecord[] = [];
  let cursor: string | undefined;
  // Zernio pages accounts; a handful of pages covers any real setup.
  for (let i = 0; i < 10; i++) {
    const page = await social.accounts.list({ cursor, limit: 50 });
    out.push(...page.items);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return out;
}

export async function listSocialAccounts(social: SocialClient): Promise<SocialAccount[]> {
  return (await allAccounts(social)).map((a) => ({
    id: a.ref.accountId,
    platform: a.ref.platform,
    name: a.displayName,
    handle: a.handle,
    status: a.status,
  }));
}

export type PostResult = {
  accountId: string;
  platform: string;
  state: DeliveryOutcome["state"];
  url?: string;
  message?: string;
};

/** Publish one generated output with a caption to the chosen accounts. */
export async function postOutput(
  social: SocialClient,
  input: { path: string; text: string; accountIds: readonly string[] },
  env: StudioEnv = getEnv(),
): Promise<PostResult[]> {
  const resolved = resolveOutput(env.dataDir, input.path);
  const wanted = new Set(input.accountIds);
  const accounts = (await allAccounts(social)).filter((a) => wanted.has(a.ref.accountId));
  if (accounts.length === 0) throw new Error("Pick at least one connected account");
  // File-backed Blob: large videos are streamed from disk, not held in memory.
  const blob = await openAsBlob(resolved.absPath, { type: resolved.mimeType });
  const { size } = await stat(resolved.absPath);
  const filename = path.basename(resolved.absPath);
  const result = await social.posts.publish({
    targets: accounts.map((a) => ({ account: a.ref })),
    content: {
      text: input.text,
      media: [
        {
          kind: resolved.kind,
          mimeType: resolved.mimeType,
          filename,
          byteSize: size,
          source: { kind: "blob", blob, fingerprint: `${input.path}:${size}` },
        },
      ],
    },
    idempotencyKey: crypto.randomUUID(),
  });
  return result.outcomes.map(describeOutcome);
}

function describeOutcome(o: DeliveryOutcome): PostResult {
  const base = { accountId: o.account.accountId, platform: o.account.platform, state: o.state };
  switch (o.state) {
    case "published":
      return { ...base, url: o.url };
    case "failed":
      return { ...base, message: o.message };
    case "not-submitted":
      return {
        ...base,
        message: o.issues?.map((issue) => issue.message).join("; ") || `Not submitted (${o.reason})`,
      };
    case "unknown":
      return { ...base, message: o.diagnostic ?? "The provider did not confirm the post" };
    default:
      return base;
  }
}
