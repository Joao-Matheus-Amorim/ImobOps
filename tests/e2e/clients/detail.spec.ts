import { expect, test } from "@playwright/test";

const hasMockStore = !process.env.NEXT_PUBLIC_SUPABASE_URL;

test.describe("clients", () => {
  test("page loads client list", async ({ page }) => {
    await page.goto("/clients");
    await expect(page.getByRole("heading", { name: /client/i }).first()).toBeVisible();
  });

  test("lists seeded clients in mock mode", async ({ page }) => {
    test.skip(!hasMockStore, "Supabase configured — no mock data");
    await page.goto("/clients");
    await expect(page.getByText("Carlos Locador Silva", { exact: false }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Daniela Locatária Souza", { exact: false }).first()).toBeVisible({ timeout: 5_000 });
  });

  test("client detail page loads in mock mode", async ({ page }) => {
    test.skip(!hasMockStore, "Supabase configured — no mock ID");
    await page.goto("/clients/client-00000001");
    await expect(page.getByRole("heading", { name: /carlos/i }).first()).toBeVisible();
  });
});
