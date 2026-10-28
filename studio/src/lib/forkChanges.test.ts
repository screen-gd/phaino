import { describe, expect, it } from "vitest";
import { forkChanges } from "./forkChanges";

const params = (defs: [string, string, string | number | boolean][]) =>
  defs.map(([key, label, d]) => ({ type: "text" as const, key, label, default: d }));

describe("forkChanges", () => {
  it("lists params whose default differs from the source", () => {
    const source = {
      params: params([
        ["prompt", "Prompt", "a"],
        ["steps", "Steps", "4"],
      ]),
    };
    const fork = {
      params: params([
        ["prompt", "Prompt", "a"],
        ["steps", "Steps", "8"],
      ]),
    };
    expect(forkChanges(fork, source)).toEqual([
      { key: "steps", label: "Steps", from: "4", to: "8" },
    ]);
  });

  it("returns empty when nothing changed", () => {
    const source = { params: params([["prompt", "Prompt", "a"]]) };
    const fork = { params: params([["prompt", "Prompt", "a"]]) };
    expect(forkChanges(fork, source)).toEqual([]);
  });

  it("ignores seed params", () => {
    const source = {
      params: [
        ...params([["prompt", "Prompt", "a"]]),
        { type: "seed", key: "seed", label: "Seed" },
      ],
    };
    const fork = {
      params: [
        ...params([["prompt", "Prompt", "a"]]),
        { type: "seed", key: "seed", label: "Seed" },
      ],
    };
    expect(forkChanges(fork, source)).toEqual([]);
  });

  it("reports params the source does not have", () => {
    const source = { params: params([["prompt", "Prompt", "a"]]) };
    const fork = {
      params: params([
        ["prompt", "Prompt", "a"],
        ["extra", "Extra", "on"],
      ]),
    };
    expect(forkChanges(fork, source)).toEqual([
      { key: "extra", label: "Extra", from: undefined, to: "on" },
    ]);
  });
});
