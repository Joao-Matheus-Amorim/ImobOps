import { expect, test } from "@playwright/test";

const hasMockStore = !process.env.NEXT_PUBLIC_SUPABASE_URL;

test.describe("rental contracts", () => {
  test("page loads contract list", async ({ page }) => {
    await page.goto("/rentals");
    await expect(page.getByRole("heading", { name: /locaç/i }).first()).toBeVisible();
  });

  test("shows seeded contract in mock mode", async ({ page }) => {
    test.skip(!hasMockStore, "Supabase configured — no mock data");
    await page.goto("/rentals");
    await expect(page.getByText("R$ 2.800,00", { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("contract detail page loads in mock mode", async ({ page }) => {
    test.skip(!hasMockStore, "Supabase configured — no mock ID");
    await page.goto("/rentals/rental-00000001");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
});
