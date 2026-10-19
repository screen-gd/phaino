import "server-only";

import path from "node:path";
import { QueuedJsonFile } from "./store";
import { providerById } from "./providers";

/**
 * Stored social connections. Credentials live in plain JSON under
 * ${dataDir}/social/connections.json — acceptable for this local,
 * single-user app; the file is already covered by the .data gitignore.
 */
export type StoredConnection = {
  id: string;
  provider: string;
  label: string;
  credentials: Record<string, string>;
  createdAt: string;
};

export type MaskedField = {
  key: string;
  label: string;
  secret: boolean;
  value: string;
};

/** Browser-safe connection: secrets masked, non-secret values as stored. */
export type MaskedConnection = {
  id: string;
  provider: string;
  providerLabel: string;
  label: string;
  createdAt: string;
  fields: MaskedField[];
};

const files = new Map<string, QueuedJsonFile<StoredConnection[]>>();

function connectionsFile(dataDir: string): QueuedJsonFile<StoredConnection[]> {
  const file = path.join(dataDir, "social", "connections.json");
  let store = files.get(file);
  if (!store) {
    store = new QueuedJsonFile(file, () => []);
    files.set(file, store);
  }
  return store;
}

export function listConnections(dataDir: string): Promise<StoredConnection[]> {
  return connectionsFile(dataDir).read();
}

export function addConnection(
  dataDir: string,
  input: Omit<StoredConnection, "id" | "createdAt">,
): Promise<StoredConnection> {
  const conn: StoredConnection = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  return connectionsFile(dataDir).update((list) => {
    list.push(conn);
    return conn;
  });
}

export function removeConnection(dataDir: string, id: string): Promise<boolean> {
  return connectionsFile(dataDir).update((list) => {
    const index = list.findIndex((c) => c.id === id);
    if (index < 0) return false;
    list.splice(index, 1);
    return true;
  });
}

function maskValue(value: string, secret: boolean): string {
  if (!secret) return value;
  return value.length >= 8 ? `••••${value.slice(-4)}` : "••••";
}

export function maskConnection(conn: StoredConnection): MaskedConnection {
  const provider = providerById(conn.provider);
  return {
    id: conn.id,
    provider: conn.provider,
    providerLabel: provider?.label ?? conn.provider,
    label: conn.label,
    createdAt: conn.createdAt,
    fields: (provider?.fields ?? []).map((f) => ({
      key: f.key,
      label: f.label,
      secret: f.secret === true,
      value: maskValue(conn.credentials[f.key] ?? "", f.secret === true),
    })),
  };
}
