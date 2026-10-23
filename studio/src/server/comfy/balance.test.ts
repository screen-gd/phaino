import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { StudioEnv } from "@/server/env";
import { clearBalanceCache, getComfyBalance, microsToCredits } from "./balance";

function envWithKey(): StudioEnv {
  const dataDir = mkdtempSync(path.join(tmpdir(), "phaino-data-"));
  return {
    comfyApiKey: "test-key",
    comfyBaseUrl: undefined,
    presetsDir: mkdtempSync(path.join(tmpdir(), "phaino-presets-")),
    dataDir,
    user: "local",
    siteUrl: "http://localhost:3000",
    ffmpegPath: "ffmpeg",
    ffprobePath: "ffprobe",
    forksDir: path.join(dataDir, "forks"),
    trackerFile: path.join(dataDir, "tasks.json"),
  };
}

describe("microsToCredits", () => {
  it("converts cents at 211 credits per dollar", () => {
    // 100 cents = $1 -> 211 credits
    expect(microsToCredits(100)).toBe(211);
    // $60 -> 6000 cents -> 12660 credits
    expect(microsToCredits(6_000)).toBe(12660);
  });
});

describe("getComfyBalance", () => {
  afterEach(() => clearBalanceCache());

  it("returns null when no key is configured", async () => {
    const env = { ...envWithKey(), comfyApiKey: undefined };
    const credits = await getComfyBalance(env, async () => {
      throw new Error("should not fetch");
    });
    expect(credits).toBeNull();
  });

  it("parses effective_balance_micros when present", async () => {
    const fetchImpl = async () =>
      new Response(
        JSON.stringify({
          amount_micros: 5_000_000,
          effective_balance_micros: 600_000,
          currency: "usd",
        }),
        { status: 200 },
      );
    const credits = await getComfyBalance(envWithKey(), fetchImpl as typeof fetch);
    expect(credits).toBe(microsToCredits(600_000));
  });

  it("falls back to amount_micros", async () => {
    const fetchImpl = async () =>
      new Response(
        JSON.stringify({ amount_micros: 1_000_000, currency: "usd" }),
        { status: 200 },
      );
    const credits = await getComfyBalance(envWithKey(), fetchImpl as typeof fetch);
    expect(credits).toBe(microsToCredits(1_000_000));
  });

  it("returns null on http errors and bad bodies", async () => {
    clearBalanceCache();
    const env = envWithKey();
    const denied = await getComfyBalance(
      env,
      (async () => new Response("nope", { status: 401 })) as typeof fetch,
    );
    expect(denied).toBeNull();

    clearBalanceCache();
    const bad = await getComfyBalance(
      env,
      (async () => new Response(JSON.stringify({ wrong: true }), { status: 200 })) as typeof fetch,
    );
    expect(bad).toBeNull();
  });
});
