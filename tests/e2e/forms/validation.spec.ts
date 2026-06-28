import { expect, test } from "@playwright/test";

test.describe("creation validation without mutating data", () => {
  test("property creation requires an owner client", async ({ page }) => {
    await page.goto("/properties");
    await page.getByRole("button", { name: /novo imóvel/i }).click();
    await page.getByLabel("Endereço").fill(`Rua E2E Sem Proprietário ${Date.now()}`);
    await page.getByRole("button", { name: /salvar imóvel/i }).click();
    await expect(page.locator("#ownerClientId:invalid")).toBeVisible();
  });
});
