import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getEnv, type StudioEnv } from "@/server/env";
import {
  createFork,
  deleteFork,
  ForkError,
  replaceForkWorkflow,
  updateFork,
} from "./forks";
import { getPreset, listPresets } from "./load";

function env(): StudioEnv {
  const base = getEnv();
  return {
    ...base,
    forksDir: fs.mkdtempSync(path.join(os.tmpdir(), "phaino-forks-")),
  };
}

describe("forks", () => {
  it("create copies the preset folder with a valid id", () => {
    const e = env();
    const fork = createFork("orbit", e);
    expect(fork.id).toMatch(/^orbit-fork-[a-z0-9]{6}$/);
    expect(fork.name).toBe("Orbit (fork)");
    expect(fork.forkOf).toBe("orbit");
    expect(fork.origin).toBe("fork");
    const dir = path.join(e.forksDir, fork.id);
    for (const f of ["preset.json", "workflow.json", "workflow_api.json", "thumb.webp"]) {
      expect(fs.existsSync(path.join(dir, f)), f).toBe(true);
    }
    // The fork loads and lists like a preset.
    expect(getPreset(fork.id, e)?.preset.origin).toBe("fork");
    expect(listPresets(e).some((p) => p.id === fork.id)).toBe(true);
  });

  it("create 404s for missing presets", () => {
    const e = env();
    expect(() => createFork("nope", e)).toThrowError(ForkError);
  });

  it("update validates name, description and defaults", () => {
    const e = env();
    const fork = createFork("orbit", e);
    const ok = updateFork(fork.id, { name: "My orbit", defaults: { fps: 24 } }, e);
    expect(ok.name).toBe("My orbit");
    expect(
      (getPreset(fork.id, e)!.preset.params.find((p) => p.key === "fps") as { default?: unknown })
        ?.default,
    ).toBe(24);
    expect(() =>
      updateFork(fork.id, { defaults: { aspect: "bogus" } }, e),
    ).toThrowError(ForkError);
    expect(() =>
      updateFork(fork.id, { defaults: { fps: 999 } }, e),
    ).toThrowError(ForkError);
    expect(() =>
      updateFork(fork.id, { defaults: { nope: 1 } }, e),
    ).toThrowError(ForkError);
  });

  it("replaceForkWorkflow rejects a graph missing a bound node, accepts the original", () => {
    const e = env();
    const fork = createFork("orbit", e);
    const dir = path.join(e.forksDir, fork.id);
    const ui = JSON.parse(fs.readFileSync(path.join(dir, "workflow.json"), "utf8"));
    const api = JSON.parse(fs.readFileSync(path.join(dir, "workflow_api.json"), "utf8"));
    const broken = structuredClone(api) as Record<string, unknown>;
    delete broken["398:376"];
    try {
      replaceForkWorkflow(fork.id, ui, broken, e);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ForkError);
      expect((err as ForkError).problems?.some((p) => p.includes("398:376"))).toBe(true);
    }
    // The original files pass validation.
    replaceForkWorkflow(fork.id, ui, api, e);
  });

  it("delete removes only the fork folder and rejects traversal", () => {
    const e = env();
    const fork = createFork("orbit", e);
    deleteFork(fork.id, e);
    expect(fs.existsSync(path.join(e.forksDir, fork.id))).toBe(false);
    expect(getPreset(fork.id, e)).toBeNull();
    for (const bad of ["../orbit", "..", "orbit", "a/b", "orbit-fork-../../x"]) {
      expect(() => deleteFork(bad, e)).toThrowError(ForkError);
    }
    // Built-in presets are untouched.
    expect(getPreset("orbit", e)).not.toBeNull();
  });
});
