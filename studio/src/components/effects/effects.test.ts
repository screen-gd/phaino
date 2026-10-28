import { describe, expect, it } from "vitest";
import { toStudioPreset } from "@/components/toolStudioData";
import { syntheticToolPreset } from "@/server/models/resolve";
import { availableEffects, effectPreset, VIDEO_EFFECTS } from "./effects";

const presets = [...new Set(VIDEO_EFFECTS.map((effect) => effect.presetId))].flatMap((id) => {
  const resolved = syntheticToolPreset(id);
  return resolved ? [toStudioPreset(resolved.preset)] : [];
});

describe("video effects", () => {
  it("composes the curated prompt and defaults on a real edit preset", () => {
    const effect = VIDEO_EFFECTS.find((entry) => entry.id === "square-frame");
    const preset = presets.find((entry) => entry.id === effect?.presetId);
    expect(effect).toBeDefined();
    expect(preset).toBeDefined();
    if (!effect || !preset) throw new Error("Missing square-frame template");

    const configured = effectPreset(preset, effect, "  Continue the brick wall.  ");
    expect(configured.id).toBe("edit-reframe");
    expect(configured.inputs).toEqual(preset.inputs);
    expect(configured.params.find((param) => param.key === "prompt")).toMatchObject({
      default: `${effect.prompt}\n\nContinue the brick wall.`,
    });
    expect(configured.params.find((param) => param.key === "aspect")).toMatchObject({ default: "1:1" });
    expect(effectPreset(preset, effect, "   ").params.find((param) => param.key === "prompt")).toMatchObject({ default: effect.prompt });
    expect(preset.params.find((param) => param.key === "aspect")).toMatchObject({ default: "9:16" });
  });

  it("ships eight passing video-only configurations and hides unavailable templates", () => {
    expect(availableEffects(presets).map((effect) => effect.id)).toEqual(VIDEO_EFFECTS.map((effect) => effect.id));
    expect(VIDEO_EFFECTS).toHaveLength(8);
    expect(availableEffects([])).toEqual([]);
    const needsReference = presets.map((preset) => ({
      ...preset,
      inputs: [...preset.inputs, { key: "reference", type: "image" as const, label: "Reference", required: true }],
    }));
    expect(availableEffects(needsReference)).toEqual([]);
    const withoutChoices = presets.map((preset) => ({ ...preset, params: preset.params.filter((param) => param.type !== "choice") }));
    expect(availableEffects(withoutChoices).some((effect) => Object.keys(effect.choices).length > 0)).toBe(false);
  });
});
