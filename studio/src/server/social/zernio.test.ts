import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSocial } from "@opencoredev/social-sdk";
import { mockBackend } from "@opencoredev/social-sdk/testing";
import { afterEach, describe, expect, it } from "vitest";
import { getEnv } from "@/server/env";
import {
  clearZernioKey,
  getZernioKey,
  listSocialAccounts,
  postOutput,
  saveZernioKey,
  zernioStatus,
} from "./zernio";

const dirs: string[] = [];
function tempEnv() {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), "phaino-social-"));
  dirs.push(dataDir);
  return { ...getEnv(), dataDir };
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe("Zernio key storage", () => {
  it("saves, masks and clears the key", async () => {
    const env = tempEnv();
    expect(zernioStatus(env)).toEqual({ configured: false, maskedKey: null });
    await saveZernioKey("zk_live_1234567890", env);
    expect(getZernioKey(env)).toBe("zk_live_1234567890");
    expect(zernioStatus(env)).toEqual({ configured: true, maskedKey: "••••7890" });
    await clearZernioKey(env);
    expect(getZernioKey(env)).toBeNull();
  });
});

describe("posting outputs", () => {
  it("lists accounts and publishes an output to the picked ones", async () => {
    const env = tempEnv();
    mkdirSync(path.join(env.dataDir, "outputs", "image"), { recursive: true });
    writeFileSync(path.join(env.dataDir, "outputs", "image", "shot.png"), Buffer.from([137, 80, 78, 71]));
    const social = createSocial({ backend: mockBackend() });

    const accounts = await listSocialAccounts(social);
    expect(accounts.length).toBeGreaterThan(0);
    const first = accounts[0];

    const results = await postOutput(
      social,
      { path: "image/shot.png", text: "hello", accountIds: [first.id] },
      env,
    );
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ accountId: first.id, platform: first.platform });
    expect(results[0].state).not.toBe("not-submitted");
  });

  it("rejects unknown accounts and paths outside outputs", async () => {
    const env = tempEnv();
    const social = createSocial({ backend: mockBackend() });
    await expect(
      postOutput(social, { path: "../comfy.json", text: "", accountIds: ["x"] }, env),
    ).rejects.toThrow();
    mkdirSync(path.join(env.dataDir, "outputs"), { recursive: true });
    writeFileSync(path.join(env.dataDir, "outputs", "a.png"), Buffer.from([1]));
    await expect(
      postOutput(social, { path: "a.png", text: "", accountIds: ["nope"] }, env),
    ).rejects.toThrow("Pick at least one connected account");
  });
});
