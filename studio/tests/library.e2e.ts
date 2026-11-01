import { test } from "@e2e-dev/web";
import { expect } from "e2e";

test("Library shows the bundled demo samples", async ({ app, screen }) => {
  await app.open("/library");
  await expect(screen.getByRole("heading", "Library", { exact: true })).toBeVisible();
  await expect(screen.getByText("FLUX.2 Klein · Sample", { exact: true })).toBeVisible();
  await expect(screen.getByText("LTX 2.5 · Sample", { exact: true })).toBeVisible();
});
