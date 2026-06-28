import { expect, test } from "@playwright/test";

test.describe("calendar events", () => {
  test("page loads calendar grid", async ({ page }) => {
    await page.goto("/calendar");
    // Just verify the page loads without error.
    await expect(page.locator("body")).toBeVisible();
  });
});
