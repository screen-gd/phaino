import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FileIdempotencyStore } from "./store";

const input = {
  scope: "tenant:test",
  key: "draft-1",
  fingerprint: "fp-1",
  targetKeys: ["t0", "t1"],
};

function tempFile() {
  return path.join(mkdtempSync(path.join(tmpdir(), "phaino-store-")), "idempotency.json");
}

describe("FileIdempotencyStore", () => {
  it("persists a claim a fresh instance on the same file can see", async () => {
    const file = tempFile();
    const first = await new FileIdempotencyStore(file).claim(input);
    expect(first.kind).toBe("new");

    const second = await new FileIdempotencyStore(file).claim(input);
    expect(second.kind).toBe("existing");
    if (second.kind === "existing" && first.kind === "new") {
      expect(second.claimId).toBe(first.claimId);
    }
  });

  it("serializes concurrent claims of the same key", async () => {
    const store = new FileIdempotencyStore(tempFile());
    const [a, b] = await Promise.all([store.claim(input), store.claim(input)]);
    expect([a.kind, b.kind].sort()).toEqual(["existing", "new"]);
  });

  it("reports a conflict when the fingerprint or targets change", async () => {
    const store = new FileIdempotencyStore(tempFile());
    await store.claim(input);
    expect(await store.claim({ ...input, fingerprint: "fp-2" })).toEqual({
      kind: "conflict",
    });
    expect(await store.claim({ ...input, targetKeys: ["t0"] })).toEqual({
      kind: "conflict",
    });
  });
});
