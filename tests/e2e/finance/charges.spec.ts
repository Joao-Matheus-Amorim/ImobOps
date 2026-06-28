import { expect, test } from "@playwright/test";

const hasMockStore = !process.env.NEXT_PUBLIC_SUPABASE_URL;

test.describe("finance charges", () => {
  test("page loads with header", async ({ page }) => {
    await page.goto("/finance");
    await expect(page.getByRole("heading", { name: /boletos?|cobrança|financeir/i }).first()).toBeVisible();
  });

  test("lists at least one charge row in mock mode", async ({ page }) => {
    test.skip(!hasMockStore, "Supabase configured — no mock data");
    await page.goto("/finance");
    await expect(page.getByText("R$", { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  });
});
