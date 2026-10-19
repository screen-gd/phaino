import "server-only";

import path from "node:path";
import { z } from "zod";
import {
  SocialError,
  connectedAccountRef,
  type AuthorizationContext,
  type DeliveryOutcome,
  type DeliveryRef,
  type Platform,
  type PublishRequest,
  type PublishResult,
  type PublishTarget,
  type SocialClient,
} from "@opencoredev/social-sdk";
import { toAttachment } from "./media";
import { QueuedJsonFile } from "./store";

const PENDING_STATES = new Set(["scheduled", "accepted", "processing"]);

const inputSchema = z.object({
  draftId: z.uuid(),
  output: z.string().min(1),
  text: z.string().max(5000),
  accountIds: z.array(z.string().min(1)).min(1),
  youtube: z
    .object({
      title: z.string().min(1).max(100),
      visibility: z.enum(["public", "unlisted", "private"]),
    })
    .optional(),
});

export type PublishInput = z.infer<typeof inputSchema>;

/** The slice of SocialClient the publish flow uses (per-backend generic stays out). */
export type SocialApi = Pick<SocialClient, "accounts" | "posts" | "capabilities">;

/** One selectable channel. `id` is the composite `${connectionId}:${accountId}` shown to the browser. */
export type ListedAccount = {
  id: string;
  /** Connection id, which is also the backend instance name. */
  backend: string;
  /** Provider-side account id inside the backend. */
  accountId: string;
  provider: string;
  providerLabel: string;
  platform: Platform;
  name: string;
};

export type PublishDeps = {
  social: SocialApi;
  authorization: AuthorizationContext;
  listAccounts: () => Promise<readonly ListedAccount[]>;
  dataDir: string;
};

export type StoredTarget = {
  accountId: string;
  platform: string;
  name: string;
  state: string;
  url?: string;
  code?: string;
  message?: string;
  retryDisposition?: string;
  /** Server-side delivery reference for status reads. Never sent to the browser. */
  delivery?: DeliveryRef;
};

export type StoredPost = {
  draftId: string;
  status: string;
  updatedAt: string;
  targets: StoredTarget[];
};

/** Browser-safe publish summary: no delivery refs, tokens or backend records. */
export type PublishSummary = {
  draftId: string;
  status: string;
  targets: Omit<StoredTarget, "delivery">[];
};

const postsFiles = new Map<string, QueuedJsonFile<Record<string, StoredPost>>>();

function postsFile(dataDir: string): QueuedJsonFile<Record<string, StoredPost>> {
  const file = path.join(dataDir, "social", "posts.json");
  let store = postsFiles.get(file);
  if (!store) {
    store = new QueuedJsonFile(file, () => ({}));
    postsFiles.set(file, store);
  }
  return store;
}

function fail(message: string): SocialError {
  return new SocialError({ code: "invalid_input", operation: "posts.publish", message });
}

/**
 * Map the requested composite account ids through the aggregated account list
 * into publish targets. The list lookup is the tenant check: an id that is
 * not connected for this tenant can never reach a ref. YouTube targets must
 * carry title and visibility.
 */
export function buildTargets(
  accounts: readonly ListedAccount[],
  input: PublishInput,
): PublishTarget[] {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  return input.accountIds.map((id) => {
    const record = byId.get(id);
    if (!record) throw fail(`Unknown account: ${id}`);
    const account = connectedAccountRef({
      backend: record.backend,
      platform: record.platform,
      accountId: record.accountId,
    });
    if (record.platform === "youtube") {
      if (!input.youtube) {
        throw fail("A YouTube target requires a title and visibility");
      }
      return {
        account,
        options: {
          title: input.youtube.title,
          visibility: input.youtube.visibility,
          madeForKids: false,
        },
      };
    }
    return { account };
  });
}

function outcomeFields(o: DeliveryOutcome): Partial<StoredTarget> & { state: string } {
  switch (o.state) {
    case "published":
      return { state: o.state, url: o.url };
    case "failed":
      return {
        state: o.state,
        code: o.code,
        message: o.message,
        retryDisposition: o.retryDisposition.kind,
      };
    case "unknown":
      return { state: o.state, code: o.reason, message: "Check the platform before retrying" };
    case "not-submitted":
      return { state: o.state, code: o.reason };
    case "cancelled":
      return { state: o.state, message: o.reason };
    default:
      return { state: o.state };
  }
}

function statusOf(targets: readonly StoredTarget[]): string {
  if (targets.every((t) => t.state === "published")) return "complete";
  if (targets.every((t) => PENDING_STATES.has(t.state))) return "pending";
  return "partial";
}

function storedRecord(
  draftId: string,
  accounts: ReadonlyMap<string, ListedAccount>,
  result: PublishResult,
): StoredPost {
  return {
    draftId,
    status: result.status,
    updatedAt: new Date().toISOString(),
    targets: result.outcomes.map((o) => {
      const composite = `${o.account.backend}:${o.account.accountId}`;
      return {
        accountId: composite,
        platform: o.account.platform,
        name: accounts.get(composite)?.name ?? o.account.accountId,
        delivery: o.delivery,
        ...outcomeFields(o),
      };
    }),
  };
}

function summarize(record: StoredPost): PublishSummary {
  return {
    draftId: record.draftId,
    status: record.status,
    targets: record.targets.map((t) => ({
      accountId: t.accountId,
      platform: t.platform,
      name: t.name,
      state: t.state,
      url: t.url,
      code: t.code,
      message: t.message,
      retryDisposition: t.retryDisposition,
    })),
  };
}

/** Validate, prepare and publish one output to the selected accounts, then persist it. */
export async function publishOutput(
  deps: PublishDeps,
  rawInput: unknown,
): Promise<PublishSummary> {
  const input = inputSchema.parse(rawInput);
  const attachment = await toAttachment(deps.dataDir, input.output);
  const accounts = await deps.listAccounts();
  const targets = buildTargets(accounts, input);
  const request: PublishRequest = {
    targets,
    content: { text: input.text || undefined, media: [attachment] },
    idempotencyKey: input.draftId,
  };
  const prep = deps.social.posts.prepare(request);
  if (!prep.ok) {
    throw new SocialError({
      code: "invalid_input",
      operation: "posts.prepare",
      message: "The request does not pass platform preparation",
      issues: prep.issues,
    });
  }
  const result = await deps.social.posts.publish(request, {
    authorization: deps.authorization,
  });
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const record = storedRecord(input.draftId, byId, result);
  await postsFile(deps.dataDir).update((data) => {
    data[input.draftId] = record;
  });
  return summarize(record);
}

/** Re-read pending targets through posts.getDelivery and persist the updated record. */
export async function refreshPost(
  deps: PublishDeps,
  draftId: string,
): Promise<PublishSummary> {
  const file = postsFile(deps.dataDir);
  const existing = (await file.read())[draftId];
  if (!existing) {
    throw new SocialError({
      code: "not_found",
      operation: "posts.status",
      message: "Unknown draft",
    });
  }
  const manifest = deps.social.capabilities()["default"]?.capabilities ?? [];
  const statusAvailable = (platform: string) =>
    manifest.some(
      (d) =>
        d.operation === "posts.status" &&
        (d.platform === platform || d.platform === "*") &&
        d.availability === "available",
    );
  const record = await file.update(async (data) => {
    const rec = data[draftId];
    if (!rec) return existing;
    for (const target of rec.targets) {
      if (!PENDING_STATES.has(target.state)) continue;
      if (!target.delivery || !statusAvailable(target.platform)) continue;
      try {
        const outcome = await deps.social.posts.getDelivery(target.delivery, {
          authorization: deps.authorization,
        });
        Object.assign(
          target,
          { delivery: outcome.delivery ?? target.delivery },
          outcomeFields(outcome),
        );
      } catch {
        // Keep the stored state when a status read fails.
      }
    }
    rec.status = statusOf(rec.targets);
    rec.updatedAt = new Date().toISOString();
    return rec;
  });
  return summarize(record);
}
