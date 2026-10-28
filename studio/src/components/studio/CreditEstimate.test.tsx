import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DemoProvider } from "@/components/DemoProvider";
import { EstimateCaption } from "./CreditEstimate";

const render = (ui: React.ReactElement, demo = false) =>
  renderToStaticMarkup(
    <DemoProvider enabled={demo}>{ui}</DemoProvider>,
  );

describe("EstimateCaption", () => {
  it("shows reported Router estimates for partner presets", () => {
    const markup = render(
      <EstimateCaption
        partner
        unit="clip"
        stats={{ kind: "router", count: 1, medianCredits: 4.5 }}
      />,
    );
    expect(markup).toContain("≈ 5 credits per clip");
    expect(markup).toContain('title="Router price of your last 1 run"');
  });

  it("shows per-run pricing before Router has reported a price", () => {
    const markup = render(
      <EstimateCaption
        partner
        unit="image"
        stats={{ kind: "router", count: 0, medianCredits: null }}
      />,
    );
    expect(markup).toContain("Priced per run");
    expect(markup).toContain('title="Router reports the price after each run"');
  });

  it("keeps the partner pricing link when Router stats are unavailable", () => {
    const markup = render(<EstimateCaption partner unit="image" />);
    expect(markup).toContain('href="https://comfy.org/pricing"');
    expect(markup).toContain("Partner pricing");
  });

  it("hides the estimate in demo mode", () => {
    const markup = render(
      <EstimateCaption
        unit="image"
        stats={{ kind: "gpu", count: 3, medianSeconds: 60 }}
      />,
      true,
    );
    expect(markup).toBe("");
  });
});
