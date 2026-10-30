import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchTargetInfo,
  isOlder,
  targetProblems,
  type TargetInfo,
} from "./preflight";

const INFO: TargetInfo = {
  nodes: {
    CheckpointLoaderSimple: {
      input: {
        required: {
          ckpt_name: [["a.safetensors", "b.safetensors"], {}],
        },
      },
    },
    SaveVideo: {
      input: {
        required: { filename_prefix: ["STRING", {}] },
      },
    },
  },
  comfyuiVersion: "0.42.1",
};

const graph = {
  "1": {
    class_type: "CheckpointLoaderSimple",
    inputs: { ckpt_name: "a.safetensors" },
  },
  "9": {
    class_type: "SaveVideo",
    inputs: { filename_prefix: "out", video: ["5", 0] },
  },
};

describe("targetProblems", () => {
  it("flags a class the target doesn't have", () => {
    const problems = targetProblems(
      { "1": { class_type: "FluxUnknown", inputs: {} } },
      { inputs: [] },
      INFO,
    );
    expect(problems).toEqual(["node FluxUnknown is not installed"]);
  });

  it("flags a combo value the target doesn't offer", () => {
    const problems = targetProblems(
      {
        "1": {
          class_type: "CheckpointLoaderSimple",
          inputs: { ckpt_name: "missing.safetensors" },
        },
      },
      { inputs: [] },
      INFO,
    );
    expect(problems).toEqual([
      'CheckpointLoaderSimple.ckpt_name: "missing.safetensors" not found',
    ]);
  });

  it("passes a graph the target satisfies", () => {
    expect(targetProblems(graph, { inputs: [] }, INFO)).toEqual([]);
  });

  it("ignores fields bound to a preset input", () => {
    const problems = targetProblems(
      {
        "1": {
          class_type: "CheckpointLoaderSimple",
          inputs: { ckpt_name: "missing.safetensors" },
        },
      },
      { inputs: [{ bind: { node: "1", field: "ckpt_name" } }] },
      INFO,
    );
    expect(problems).toEqual([]);
  });

  it("ignores combo values that aren't model files", () => {
    const problems = targetProblems(
      {
        "1": {
          class_type: "CustomCombo",
          inputs: { choice: "Default" },
        },
      },
      { inputs: [] },
      {
        ...INFO,
        nodes: {
          ...INFO.nodes,
          CustomCombo: {
            input: { required: { choice: [["One", "Two"], {}] } },
          },
        },
      },
    );
    expect(problems).toEqual([]);
  });

  it("still reports a missing model file", () => {
    const problems = targetProblems(
      {
        "1": {
          class_type: "CheckpointLoaderSimple",
          inputs: { ckpt_name: "gone.safetensors" },
        },
      },
      { inputs: [] },
      INFO,
    );
    expect(problems).toEqual([
      'CheckpointLoaderSimple.ckpt_name: "gone.safetensors" not found',
    ]);
  });

  it("ignores literal fields that aren't combos", () => {
    const problems = targetProblems(
      {
        "9": {
          class_type: "SaveVideo",
          inputs: { filename_prefix: "anything goes" },
        },
      },
      { inputs: [] },
      INFO,
    );
    expect(problems).toEqual([]);
  });
});

describe("isOlder", () => {
  it("compares dotted versions", () => {
    expect(isOlder("0.41.9", "0.42.1")).toBe(true);
    expect(isOlder("0.42.1", "0.42.1")).toBe(false);
    expect(isOlder("0.43.0", "0.42.1")).toBe(false);
  });

  it("ignores a leading v", () => {
    expect(isOlder("v0.41.0", "0.42.1")).toBe(true);
    expect(isOlder("v0.43.2", "0.42.1")).toBe(false);
  });

  it("treats unparseable input as not older", () => {
    expect(isOlder("unknown", "0.42.1")).toBe(false);
    expect(isOlder("0.41.9", null)).toBe(false);
    expect(isOlder(null, "0.42.1")).toBe(false);
  });
});

describe("fetchTargetInfo", () => {
  afterEach(() => vi.unstubAllGlobals());

  const jsonRes = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status });

  it("returns null when both paths 404", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(jsonRes("not found", 404));
    vi.stubGlobal("fetch", fetchSpy);
    const info = await fetchTargetInfo({ baseUrl: "https://t404.test" });
    expect(info).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("returns null when fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );
    const info = await fetchTargetInfo({ baseUrl: "https://tthrow.test" });
    expect(info).toBeNull();
  });

  it("returns nodes and version when the target answers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("object_info")
          ? jsonRes({ SaveVideo: {} })
          : jsonRes({ system: { comfyui_version: "0.42.1" } }),
      ),
    );
    const info = await fetchTargetInfo({ baseUrl: "https://tok.test" });
    expect(info?.nodes.SaveVideo).toBeTruthy();
    expect(info?.comfyuiVersion).toBe("0.42.1");
  });
});
