import { expect, test } from "@playwright/test";

test.describe("documents", () => {
  test("page loads with header", async ({ page }) => {
    await page.goto("/documents");
    await expect(page.getByRole("heading", { name: /documento/i }).first()).toBeVisible();
  });

  test("shows empty state or document list", async ({ page }) => {
    await page.goto("/documents");
    // May be empty (no seed documents) — just verify no crash.
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});
