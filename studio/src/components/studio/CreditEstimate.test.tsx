import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EstimateCaption } from "./CreditEstimate";

describe("EstimateCaption", () => {
  it("shows reported Router estimates for partner presets", () => {
    const markup = renderToStaticMarkup(
      <EstimateCaption partner stats={{ kind: "router", count: 1, medianCredits: 4.5 }} />,
    );
    expect(markup).toContain("≈ 5 credits");
    expect(markup).toContain('title="Router price of your last 1 run"');
  });

  it("shows per-run pricing before Router has reported a price", () => {
    const markup = renderToStaticMarkup(
      <EstimateCaption partner stats={{ kind: "router", count: 0, medianCredits: null }} />,
    );
    expect(markup).toContain("Priced per run");
    expect(markup).toContain('title="Router reports the price after each run"');
  });

  it("keeps the partner pricing link when Router stats are unavailable", () => {
    const markup = renderToStaticMarkup(<EstimateCaption partner />);
    expect(markup).toContain('href="https://comfy.org/pricing"');
    expect(markup).toContain("Partner pricing");
  });
});
