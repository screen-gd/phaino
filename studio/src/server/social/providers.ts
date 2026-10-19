import "server-only";

import {
  SocialError,
  type Platform,
  type SocialAdapter,
} from "@opencoredev/social-sdk";
import { mockBackend } from "@opencoredev/social-sdk/testing";
import { zernio } from "@opencoredev/social-sdk/cloud/zernio";
import { postForMe } from "@opencoredev/social-sdk/cloud/post-for-me";
import { postfast } from "@opencoredev/social-sdk/cloud/postfast";
import { x } from "@opencoredev/social-sdk/x";
import { bluesky } from "@opencoredev/social-sdk/bluesky";
import { youtube } from "@opencoredev/social-sdk/youtube";
import { linkedin } from "@opencoredev/social-sdk/linkedin";
import { threads } from "@opencoredev/social-sdk/threads";
import { instagram } from "@opencoredev/social-sdk/instagram";
import { z } from "zod";

export type ProviderField = {
  readonly key: string;
  readonly label: string;
  readonly secret?: boolean;
  readonly optional?: boolean;
  readonly placeholder?: string;
  readonly default?: string;
  readonly choices?: readonly string[];
  readonly pattern?: { readonly re: RegExp; readonly message: string };
};

type FieldKeys<F extends readonly ProviderField[]> = F[number]["key"] & string;
type Credentials<F extends readonly ProviderField[]> = Record<FieldKeys<F>, string>;

export type ProviderEntry = {
  readonly id: string;
  readonly label: string;
  readonly kind: "managed" | "direct";
  readonly platforms: readonly Platform[];
  readonly fields: readonly ProviderField[];
  readonly docsUrl: string;
  readonly note?: string;
  /** Server-only: builds the adapter from validated credentials. */
  readonly build: (credentials: Record<string, string>) => Promise<SocialAdapter<unknown>>;
};

function define<F extends readonly ProviderField[]>(
  def: Omit<ProviderEntry, "fields" | "build"> & {
    readonly fields: F;
    readonly build: (credentials: Credentials<F>) => Promise<SocialAdapter<unknown>>;
  },
): ProviderEntry {
  return { ...def, build: (c) => def.build(c as Credentials<F>) };
}

const blank = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

/** Zod object for one provider's fields: required/optional, enums and patterns. */
export function credentialsSchema(
  provider: ProviderEntry,
): z.ZodType<Record<string, string>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of provider.fields) {
    let base: z.ZodTypeAny = field.choices
      ? z.enum(field.choices as [string, ...string[]])
      : z.string().min(1, `${field.label} is required`);
    if (field.pattern && base instanceof z.ZodString) {
      base = base.regex(field.pattern.re, field.pattern.message);
    }
    shape[field.key] = field.optional
      ? z.preprocess(blank, base.optional())
      : base;
  }
  return z.object(shape) as unknown as z.ZodType<Record<string, string>>;
}

/** Apply provider field defaults to a parsed credentials object. */
export function applyDefaults(
  provider: ProviderEntry,
  credentials: Record<string, string>,
): Record<string, string> {
  const out = { ...credentials };
  for (const field of provider.fields) {
    if (out[field.key] === undefined && field.default !== undefined) {
      out[field.key] = field.default;
    }
  }
  return out;
}

// --- Credential refresh helpers (injectable fetch + cache for tests) ---

export type SessionCache<T> = Map<string, { value: T; expiresAt: number }>;

const blueskySessions: SessionCache<{ did: string; accessJwt: string; handle?: string }> =
  new Map();

/** Bluesky app-password session, cached per (service, identifier) for 90 minutes. */
export async function blueskySession(
  service: string,
  identifier: string,
  appPassword: string,
  fetchFn: typeof fetch = fetch,
  cache: SessionCache<{ did: string; accessJwt: string; handle?: string }> = blueskySessions,
  now: () => number = Date.now,
): Promise<{ did: string; accessJwt: string; handle?: string }> {
  const key = `${service}|${identifier}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now()) return hit.value;
  const res = await fetchFn(`${service}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password: appPassword }),
  });
  if (!res.ok) {
    throw new SocialError({
      code: "upstream_failure",
      operation: "bluesky.session",
      message: `Bluesky session request failed (${res.status})`,
    });
  }
  const session = z
    .object({
      did: z.string(),
      accessJwt: z.string(),
      handle: z.string().optional(),
    })
    .parse(await res.json());
  cache.set(key, { value: session, expiresAt: now() + 90 * 60_000 });
  return session;
}

const youtubeTokens: SessionCache<string> = new Map();

/** YouTube OAuth access token, cached until expires_in minus 60 seconds. */
export async function youtubeAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  fetchFn: typeof fetch = fetch,
  cache: SessionCache<string> = youtubeTokens,
  now: () => number = Date.now,
): Promise<string> {
  const key = `${clientId}|${refreshToken}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now()) return hit.value;
  const res = await fetchFn("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new SocialError({
      code: "upstream_failure",
      operation: "youtube.token",
      message: `YouTube token request failed (${res.status})`,
    });
  }
  const token = z
    .object({ access_token: z.string(), expires_in: z.number() })
    .parse(await res.json());
  cache.set(key, {
    value: token.access_token,
    expiresAt: now() + (token.expires_in - 60) * 1000,
  });
  return token.access_token;
}

// --- Registry ---

// TikTok direct is intentionally absent: its adapter needs public, verified
// HTTPS media origins that a local studio cannot serve. TikTok publishing
// works through the managed providers below.
const MANAGED_PLATFORMS: readonly Platform[] = [
  "x",
  "threads",
  "bluesky",
  "youtube",
  "tiktok",
  "instagram",
  "linkedin",
  "facebook",
];

export const PROVIDERS: readonly ProviderEntry[] = [
  define({
    id: "zernio",
    label: "Zernio",
    kind: "managed",
    platforms: MANAGED_PLATFORMS,
    fields: [{ key: "apiKey", label: "API key", secret: true }],
    docsUrl: "https://social-sdk.dev/docs/backends/zernio",
    build: async (c) => zernio({ apiKey: c.apiKey }),
  }),
  define({
    id: "post-for-me",
    label: "Post for Me",
    kind: "managed",
    platforms: MANAGED_PLATFORMS,
    fields: [{ key: "apiKey", label: "API key", secret: true }],
    docsUrl: "https://social-sdk.dev/docs/backends/post-for-me",
    build: async (c) => postForMe({ apiKey: c.apiKey }),
  }),
  define({
    id: "postfast",
    label: "PostFast",
    kind: "managed",
    platforms: MANAGED_PLATFORMS,
    note: "Schedules only — every publish needs a future time.",
    fields: [{ key: "apiKey", label: "API key", secret: true }],
    docsUrl: "https://social-sdk.dev/docs/backends/postfast",
    build: async (c) => postfast({ apiKey: c.apiKey }),
  }),
  define({
    id: "x",
    label: "X",
    kind: "direct",
    platforms: ["x"],
    fields: [
      { key: "userId", label: "User ID" },
      { key: "accessToken", label: "Access token", secret: true },
      { key: "handle", label: "Handle", optional: true, placeholder: "@name" },
    ],
    docsUrl: "https://social-sdk.dev/docs/platforms/x",
    build: async (c) =>
      x({
        auth: {
          userId: c.userId,
          accessToken: c.accessToken,
          handle: c.handle || undefined,
        },
      }),
  }),
  define({
    id: "bluesky",
    label: "Bluesky",
    kind: "direct",
    platforms: ["bluesky"],
    fields: [
      { key: "handle", label: "Handle", placeholder: "name.bsky.social" },
      { key: "appPassword", label: "App password", secret: true },
      {
        key: "service",
        label: "Service URL",
        optional: true,
        default: "https://bsky.social",
      },
    ],
    docsUrl: "https://social-sdk.dev/docs/platforms/bluesky",
    build: async (c) => {
      const service = c.service || "https://bsky.social";
      const session = await blueskySession(service, c.handle, c.appPassword);
      return bluesky({
        auth: {
          service,
          did: session.did,
          accessJwt: session.accessJwt,
          handle: session.handle ?? c.handle,
        },
      });
    },
  }),
  define({
    id: "youtube",
    label: "YouTube",
    kind: "direct",
    platforms: ["youtube"],
    fields: [
      { key: "channelId", label: "Channel ID" },
      { key: "clientId", label: "OAuth client ID" },
      { key: "clientSecret", label: "OAuth client secret", secret: true },
      { key: "refreshToken", label: "Refresh token", secret: true },
    ],
    docsUrl: "https://social-sdk.dev/docs/platforms/youtube",
    build: async (c) => {
      const accessToken = await youtubeAccessToken(
        c.clientId,
        c.clientSecret,
        c.refreshToken,
      );
      return youtube({ auth: { accessToken, channelId: c.channelId } });
    },
  }),
  define({
    id: "linkedin",
    label: "LinkedIn",
    kind: "direct",
    platforms: ["linkedin"],
    fields: [
      {
        key: "author",
        label: "Author URN",
        placeholder: "urn:li:person:123 or urn:li:organization:123",
        pattern: {
          re: /^urn:li:(person|organization):.+$/,
          message: "Use urn:li:person:<id> or urn:li:organization:<id>",
        },
      },
      { key: "accessToken", label: "Access token", secret: true },
      {
        key: "apiVersion",
        label: "API version",
        optional: true,
        default: "202609",
      },
    ],
    docsUrl: "https://social-sdk.dev/docs/platforms/linkedin",
    build: async (c) =>
      linkedin({
        auth: {
          accessToken: c.accessToken,
          author: c.author as `urn:li:person:${string}` | `urn:li:organization:${string}`,
        },
        apiVersion: c.apiVersion || "202609",
      }),
  }),
  define({
    id: "threads",
    label: "Threads",
    kind: "direct",
    platforms: ["threads"],
    fields: [
      { key: "userId", label: "User ID" },
      { key: "accessToken", label: "Access token", secret: true },
    ],
    docsUrl: "https://social-sdk.dev/docs/platforms/threads",
    build: async (c) =>
      threads({ auth: { userId: c.userId, accessToken: c.accessToken } }),
  }),
  define({
    id: "instagram",
    label: "Instagram",
    kind: "direct",
    platforms: ["instagram"],
    fields: [
      { key: "accountId", label: "Account ID" },
      { key: "accessToken", label: "Access token", secret: true },
      {
        key: "flavor",
        label: "Login type",
        optional: true,
        choices: ["instagram-login", "facebook-login"],
        default: "instagram-login",
      },
    ],
    docsUrl: "https://social-sdk.dev/docs/platforms/instagram",
    build: async (c) =>
      instagram({
        auth: {
          accessToken: c.accessToken,
          accountId: c.accountId,
          flavor: (c.flavor || "instagram-login") as
            | "instagram-login"
            | "facebook-login",
        },
      }),
  }),
  define({
    id: "mock",
    label: "Test (mock)",
    kind: "direct",
    platforms: ["x", "threads"],
    fields: [],
    docsUrl: "https://social-sdk.dev/docs",
    build: async () => mockBackend({ scenario: "immediate-text-success" }),
  }),
];

export function providerById(id: string): ProviderEntry | undefined {
  return PROVIDERS.find((p) => p.id === id);
}
