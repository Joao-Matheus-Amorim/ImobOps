import { expect, test } from "@playwright/test";

const hasMockStore = !process.env.NEXT_PUBLIC_SUPABASE_URL;

test.describe("properties", () => {
  test("page loads property list", async ({ page }) => {
    await page.goto("/properties");
    await expect(page.getByRole("heading", { name: /imóvei/i }).first()).toBeVisible();
  });

  test("lists seeded properties in mock mode", async ({ page }) => {
    test.skip(!hasMockStore, "Supabase configured — no mock data");
    await page.goto("/properties");
    await expect(page.getByText("Rua das Flores", { exact: false }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Rua dos Ipês", { exact: false }).first()).toBeVisible({ timeout: 5_000 });
  });

  test("shows status badges in mock mode", async ({ page }) => {
    test.skip(!hasMockStore, "Supabase configured — no mock data");
    await page.goto("/properties");
    await expect(page.getByText("Alugado", { exact: false }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Disponível", { exact: false }).first()).toBeVisible({ timeout: 5_000 });
  });
});
