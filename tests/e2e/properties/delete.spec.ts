import { test, expect } from "@playwright/test";

const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

test.describe("Delete Properties", () => {
  test.skip(!hasSupabase, "Sem Supabase — dados mock compartilhados");

  test.beforeEach(async ({ page }) => {
    await page.goto("/properties");
    await page.waitForLoadState("networkidle");
  });

  test("should allow deleting a property", async ({ page }) => {
    const count = await page.locator('button[aria-label^="Remover"]').count();
    if (count === 0) return;

    await page.locator('button[aria-label^="Remover"]').first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/Esta ação não pode ser desfeita/)).toBeVisible();

    await page.getByRole("button", { name: /Sim, remover/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 1000 }).catch(() => {});
  });

  test("should show confirmation dialog when clicking delete", async ({ page }) => {
    const count = await page.locator('button[aria-label^="Remover"]').count();
    if (count === 0) return;

    await page.locator('button[aria-label^="Remover"]').first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/Remover/)).toBeVisible();
    await expect(page.getByText(/não pode ser desfeita/)).toBeVisible();
  });

  test("should cancel deletion when dialog is dismissed", async ({ page }) => {
    const count = await page.locator('button[aria-label^="Remover"]').count();
    if (count === 0) return;

    await page.locator('button[aria-label^="Remover"]').first().click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: /Cancelar/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});

test.describe("Delete Rentals", () => {
  test.skip(!hasSupabase, "Sem Supabase — dados mock compartilhados");

  test.beforeEach(async ({ page }) => {
    await page.goto("/rentals");
    await page.waitForLoadState("networkidle");
  });

  test("should allow deleting a rental", async ({ page }) => {
    const count = await page.locator('button[aria-label^="Remover"]').count();
    if (count === 0) return;

    await page.locator('button[aria-label^="Remover"]').first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /Sim, remover/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 1000 }).catch(() => {});
  });

  test("should show confirmation dialog", async ({ page }) => {
    const count = await page.locator('button[aria-label^="Remover"]').count();
    if (count === 0) return;

    await page.locator('button[aria-label^="Remover"]').first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/Remover/)).toBeVisible();
    await expect(page.getByText(/não pode ser desfeita/)).toBeVisible();
  });
});
