import { test } from "@e2e-dev/web";
import { expect } from "e2e";

test("Explore opens the workflow catalog", async ({ app, browser, screen }) => {
  await app.open("/");
  await expect(browser.locator("h1")).toHaveText("Explore");
  await expect(screen.getByRole("heading", "Trending presets", { exact: true })).toBeVisible();
  await screen.getByRole("link", "View all presets", { exact: true }).click();
  await expect(browser).toHaveURL("/workflows");
  await expect(screen.getByRole("heading", "Workflows", { exact: true })).toBeVisible();
});
