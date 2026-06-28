import { expect, test } from "@playwright/test";
import { expectNoCriticalA11yViolations } from "../utils/a11y";

test.describe("@a11y login page", () => {
  test("login page has no serious or critical WCAG violations", async ({ page }, testInfo) => {
    await page.goto("/login");
    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expectNoCriticalA11yViolations(page, testInfo);
  });
});
