import { describe, expect, it } from "vitest";
import { sortOutputsNewest } from "./socialUtils";

describe("sortOutputsNewest", () => {
  it("orders by mtime desc without mutating the input", () => {
    const items = [
      { relPath: "a", mtime: 10 },
      { relPath: "b", mtime: 30 },
      { relPath: "c", mtime: 20 },
    ];
    const sorted = sortOutputsNewest(items);
    expect(sorted.map((i) => i.relPath)).toEqual(["b", "c", "a"]);
    expect(items.map((i) => i.relPath)).toEqual(["a", "b", "c"]);
  });

  it("keeps input order for equal mtimes", () => {
    const items = [
      { relPath: "a", mtime: 5 },
      { relPath: "b", mtime: 5 },
    ];
    expect(sortOutputsNewest(items).map((i) => i.relPath)).toEqual(["a", "b"]);
  });
});
