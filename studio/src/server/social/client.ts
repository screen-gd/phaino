import "server-only";

import path from "node:path";
import {
  createSocial,
  type AuthorizationContext,
  type SocialAdapter,
} from "@opencoredev/social-sdk";
import { getEnv } from "@/server/env";
import { listConnections, type StoredConnection } from "./connections";
import type { ListedAccount, SocialApi } from "./publish";
import { providerById } from "./providers";
import { FileIdempotencyStore } from "./store";

export type ConnectionError = {
  connectionId: string;
  label: string;
  message: string;
};

export type SocialHandle = {
  /** Null when every connection failed to build. */
  social: SocialApi | null;
  connections: StoredConnection[];
  errors: ConnectionError[];
};

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Connection failed";
}

/**
 * Builds one backend adapter per stored connection into a mixed-mode client.
 * Rebuilt on every call — only the OAuth/token/session caches persist.
 * A Zernio HMAC webhook route can replace delivery polling later.
 */
export async function getSocial(): Promise<SocialHandle | null> {
  const connections = await listConnections(getEnv().dataDir);
  if (connections.length === 0) return null;
  const backends: Record<string, SocialAdapter<unknown>> = {};
  const errors: ConnectionError[] = [];
  for (const conn of connections) {
    const provider = providerById(conn.provider);
    if (!provider) {
      errors.push({
        connectionId: conn.id,
        label: conn.label,
        message: `Unknown provider "${conn.provider}"`,
      });
      continue;
    }
    try {
      backends[conn.id] = await provider.build(conn.credentials);
    } catch (err) {
      errors.push({
        connectionId: conn.id,
        label: conn.label,
        message: errorMessage(err),
      });
    }
  }
  const social =
    Object.keys(backends).length > 0
      ? createSocial({
          backends,
          idempotencyStore: new FileIdempotencyStore(
            path.join(getEnv().dataDir, "social", "idempotency.json"),
          ),
        })
      : null;
  return { social, connections, errors };
}

/** Tenant context scoping idempotency claims and account lookups. */
export function authorization(): AuthorizationContext {
  return { tenantId: getEnv().user };
}

function synthesizeAccountId(conn: StoredConnection): string {
  const c = conn.credentials;
  return (
    c.userId ?? c.channelId ?? c.accountId ?? c.author ?? c.did ?? conn.id
  );
}

/**
 * Accounts across every connection, ids composite as `${connectionId}:${accountId}`.
 * Adapters without `accounts.read` get one synthesized account from their
 * credentials. The aggregated lookup is the tenant authorization check for
 * publishing.
 */
export async function aggregateAccounts(
  social: SocialApi,
  connections: readonly StoredConnection[],
): Promise<{ accounts: ListedAccount[]; errors: ConnectionError[] }> {
  const accounts: ListedAccount[] = [];
  const errors: ConnectionError[] = [];
  const manifests = social.capabilities();
  for (const conn of connections) {
    const manifest = manifests[conn.id];
    if (!manifest) continue; // build failed; already reported in handle.errors
    const provider = providerById(conn.provider);
    const canList = manifest.capabilities.some(
      (d) => d.operation === "accounts.read" && d.availability === "available",
    );
    if (!canList) {
      if (provider && provider.platforms.length === 1) {
        const accountId = synthesizeAccountId(conn);
        accounts.push({
          id: `${conn.id}:${accountId}`,
          backend: conn.id,
          accountId,
          provider: conn.provider,
          providerLabel: provider.label,
          platform: provider.platforms[0]!,
          name: conn.label,
        });
      }
      continue;
    }
    try {
      const page = await social.accounts.list({
        backend: conn.id,
        authorization: authorization(),
      });
      for (const item of page.items) {
        accounts.push({
          id: `${conn.id}:${item.ref.accountId}`,
          backend: conn.id,
          accountId: item.ref.accountId,
          provider: conn.provider,
          providerLabel: provider?.label ?? conn.provider,
          platform: item.ref.platform,
          name: item.displayName,
        });
      }
    } catch (err) {
      errors.push({
        connectionId: conn.id,
        label: conn.label,
        message: errorMessage(err),
      });
    }
  }
  return { accounts, errors };
}
