import { describe, expect, it } from "vitest";
import { maskConnection, type StoredConnection } from "./connections";
import {
  blueskySession,
  credentialsSchema,
  providerById,
  youtubeAccessToken,
} from "./providers";

describe("credentialsSchema", () => {
  const linkedin = providerById("linkedin")!;
  const schema = credentialsSchema(linkedin);

  it("rejects a missing required field", () => {
    expect(() => schema.parse({ author: "urn:li:person:1" })).toThrowError();
  });

  it("rejects a bad LinkedIn author URN", () => {
    expect(() =>
      schema.parse({ author: "urn:li:other:1", accessToken: "t" }),
    ).toThrowError(/urn:li:(person|organization)/);
  });

  it("accepts optional fields left blank and a valid URN", () => {
    const parsed = schema.parse({
      author: "urn:li:organization:123",
      accessToken: "token",
      apiVersion: "",
    });
    expect(parsed.author).toBe("urn:li:organization:123");
    expect(parsed.apiVersion).toBeUndefined();
  });
});

describe("maskConnection", () => {
  const conn: StoredConnection = {
    id: "c1",
    provider: "x",
    label: "My X",
    credentials: { userId: "u-1", accessToken: "supersecrettoken123", handle: "me" },
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  it("masks secrets and keeps non-secret values", () => {
    const masked = maskConnection(conn);
    const token = masked.fields.find((f) => f.key === "accessToken")!;
    expect(token.value).toBe("••••n123");
    expect(JSON.stringify(masked)).not.toContain("supersecrettoken123");
    expect(masked.fields.find((f) => f.key === "userId")!.value).toBe("u-1");
    expect(masked.fields.find((f) => f.key === "handle")!.value).toBe("me");
  });

  it("fully masks secrets shorter than 8 characters", () => {
    const short = maskConnection({
      ...conn,
      credentials: { userId: "u-1", accessToken: "short" },
    });
    expect(short.fields.find((f) => f.key === "accessToken")!.value).toBe("••••");
  });
});

describe("blueskySession", () => {
  it("posts identifier and password, returns session fields and caches", async () => {
    const bodies: unknown[] = [];
    const fakeFetch: typeof fetch = async (_url, init) => {
      bodies.push(JSON.parse(init?.body as string));
      return new Response(
        JSON.stringify({ did: "did:plc:1", accessJwt: "jwt-1", handle: "me.bsky.social" }),
        { status: 200 },
      );
    };
    const cache = new Map();
    const first = await blueskySession(
      "https://bsky.social", "me.bsky.social", "pw", fakeFetch, cache,
    );
    expect(first.did).toBe("did:plc:1");
    expect(first.accessJwt).toBe("jwt-1");
    expect(bodies[0]).toEqual({ identifier: "me.bsky.social", password: "pw" });

    const second = await blueskySession(
      "https://bsky.social", "me.bsky.social", "pw", fakeFetch, cache,
    );
    expect(second).toBe(first);
    expect(bodies).toHaveLength(1);
  });
});

describe("youtubeAccessToken", () => {
  it("caches the token until expiry minus 60 seconds", async () => {
    let calls = 0;
    const fakeFetch: typeof fetch = async () => {
      calls += 1;
      return new Response(
        JSON.stringify({ access_token: "yt-token", expires_in: 3600 }),
        { status: 200 },
      );
    };
    const cache = new Map();
    let now = 0;
    const clock = () => now;

    const first = await youtubeAccessToken("cid", "sec", "rt", fakeFetch, cache, clock);
    expect(first).toBe("yt-token");
    const second = await youtubeAccessToken("cid", "sec", "rt", fakeFetch, cache, clock);
    expect(second).toBe("yt-token");
    expect(calls).toBe(1);

    now = (3600 - 60) * 1000 + 1; // past expiry minus 60s
    await youtubeAccessToken("cid", "sec", "rt", fakeFetch, cache, clock);
    expect(calls).toBe(2);
  });
});
