import { test } from "@e2e-dev/web";
import { expect } from "e2e";

test("Settings explains how to connect Comfy Cloud", async ({ app, screen }) => {
  await app.open("/settings");
  await expect(screen.getByRole("heading", "Comfy Cloud", { exact: true })).toBeVisible();
  await expect(screen.getByRole("heading", "How to connect Comfy Cloud", { exact: true })).toBeVisible();
  await expect(screen.getByRole("heading", "About", { exact: true })).toBeVisible();
});
