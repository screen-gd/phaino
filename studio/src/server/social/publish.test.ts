import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SocialError, createSocial } from "@opencoredev/social-sdk";
import { mockBackend } from "@opencoredev/social-sdk/testing";
import { aggregateAccounts } from "./client";
import type { StoredConnection } from "./connections";
import { buildTargets, publishOutput, type ListedAccount, type PublishDeps, type PublishInput } from "./publish";
import { FileIdempotencyStore } from "./store";

const CONNECTION: StoredConnection = {
  id: "conn1",
  provider: "mock",
  label: "Mock",
  credentials: {},
  createdAt: "2026-01-01T00:00:00.000Z",
};

function setup() {
  const dataDir = mkdtempSync(path.join(tmpdir(), "phaino-social-"));
  mkdirSync(path.join(dataDir, "outputs"), { recursive: true });
  writeFileSync(path.join(dataDir, "outputs", "frame.png"), Buffer.from([1, 2, 3, 4]));
  writeFileSync(path.join(dataDir, "outputs", "shot.mp4"), Buffer.from([5, 6, 7, 8]));

  const adapter = mockBackend({
    scenario: "immediate-text-success",
    backendInstance: "conn1",
  });
  const social = createSocial({
    backends: { conn1: adapter },
    idempotencyStore: new FileIdempotencyStore(
      path.join(dataDir, "social", "idempotency.json"),
    ),
  });
  const deps: PublishDeps = {
    social,
    authorization: { tenantId: "test" },
    listAccounts: () =>
      aggregateAccounts(social, [CONNECTION]).then((r) => r.accounts),
    dataDir,
  };
  return { adapter, deps, dataDir };
}

const draft = () => crypto.randomUUID();

describe("publishOutput", () => {
  it("rejects an unknown composite account id before dispatch", async () => {
    const { deps } = setup();
    await expect(
      publishOutput(deps, {
        draftId: draft(),
        output: "frame.png",
        text: "",
        accountIds: ["not-a-channel:x"],
      }),
    ).rejects.toMatchObject({
      code: "invalid_input",
      message: expect.stringContaining("Unknown account"),
    });
  });

  it("resolves composite ids, returns a summary without delivery refs and persists posts.json", async () => {
    const { deps, dataDir } = setup();
    const summary = await publishOutput(deps, {
      draftId: draft(),
      output: "frame.png",
      text: "hello",
      accountIds: ["conn1:mock-account-1"],
    });

    expect(summary.status).toBe("complete");
    expect(summary.targets).toHaveLength(1);
    const target = summary.targets[0]!;
    expect(target.state).toBe("published");
    expect(target.platform).toBe("x");
    expect(target.accountId).toBe("conn1:mock-account-1");
    expect(target).not.toHaveProperty("delivery");

    const stored = JSON.parse(
      readFileSync(path.join(dataDir, "social", "posts.json"), "utf8"),
    ) as Record<string, { targets: { delivery?: unknown }[] }>;
    const record = stored[summary.draftId];
    expect(record).toBeDefined();
    expect(record!.targets[0]!.delivery).toBeDefined();
  });

  it("replays the same draftId without a second dispatch", async () => {
    const { adapter, deps } = setup();
    const input = {
      draftId: draft(),
      output: "shot.mp4",
      text: "again",
      accountIds: ["conn1:mock-account-1", "conn1:mock-account-2"],
    };
    const first = await publishOutput(deps, input);
    const second = await publishOutput(deps, input);

    expect(second.status).toBe(first.status);
    const dispatches = adapter
      .testing.history()
      .filter((h) => h.operation === "posts.publishTarget");
    expect(dispatches).toHaveLength(2);
  });
});

describe("buildTargets", () => {
  const youtubeAccount: ListedAccount = {
    id: "c1:yt-1",
    backend: "c1",
    accountId: "yt-1",
    provider: "youtube",
    providerLabel: "YouTube",
    platform: "youtube",
    name: "YT",
  };

  const baseInput: PublishInput = {
    draftId: crypto.randomUUID(),
    output: "shot.mp4",
    text: "",
    accountIds: ["c1:yt-1"],
  };

  it("rejects a YouTube target without title and visibility", () => {
    expect(() => buildTargets([youtubeAccount], baseInput)).toThrowError(SocialError);
    expect(() => buildTargets([youtubeAccount], baseInput)).toThrowError(/YouTube/);
  });

  it("adds YouTube options when provided", () => {
    const targets = buildTargets(
      [youtubeAccount],
      { ...baseInput, youtube: { title: "Clip", visibility: "unlisted" } },
    );
    expect(targets[0]).toMatchObject({
      options: { title: "Clip", visibility: "unlisted", madeForKids: false },
    });
  });
});
