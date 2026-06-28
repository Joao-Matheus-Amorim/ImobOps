import { expect, test } from "@playwright/test";
import { expectNoCriticalA11yViolations } from "../utils/a11y";

const pages = [
  ["dashboard", "/dashboard"],
  ["clients", "/clients"],
  ["properties", "/properties"],
  ["rentals", "/rentals"],
  ["sales", "/sales"],
  ["finance", "/finance"],
  ["documents", "/documents"],
  ["crm", "/crm"],
  ["condos", "/condos"],
  ["reports overview", "/reports?tab=overview"],
  ["reports finance", "/reports?tab=finance"],
  ["reports rentals", "/reports?tab=rentals"],
  ["reports sales", "/reports?tab=sales"],
  ["reports crm", "/reports?tab=crm"],
  ["reports documents", "/reports?tab=documents"],
  ["reports condos", "/reports?tab=condos"],
];

test.describe("@a11y page accessibility", () => {
  for (const [name, path] of pages) {
    test(`${name} has no serious or critical WCAG violations`, async ({ page }, testInfo) => {
      await page.goto(path);
      await expect(page.getByRole("heading").first()).toBeVisible();
      await expectNoCriticalA11yViolations(page, testInfo);
    });
  }
});
