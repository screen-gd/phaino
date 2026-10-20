import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

process.env.PHAINO_DATA_DIR = fs.mkdtempSync(
  path.join(os.tmpdir(), "phaino-api-"),
);

const { POST } = await import("./route");

describe("POST /api/jobs", () => {
  it("returns 409 not_connected when Comfy is unconfigured", async () => {
    const res = await POST(
      new Request("http://localhost/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ presetId: "dolly-in", params: {}, inputs: {} }),
      }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("not_connected");
    expect(body.message).toBe(
      "Comfy Cloud is not connected. Add your API key in Settings.",
    );
  });
});
