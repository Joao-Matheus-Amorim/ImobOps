import { expect, test } from "@playwright/test";

test.describe("CRM leads", () => {
  test("page loads with header", async ({ page }) => {
    await page.goto("/crm");
    await expect(page.getByRole("heading", { name: /crm|lead/i }).first()).toBeVisible();
  });

  test("shows funnel columns", async ({ page }) => {
    await page.goto("/crm");
    // CRM should display Kanban columns for funnel stages.
    const stages = ["Novo", "Qualificado", "Visita", "Proposta"];
    for (const stage of stages) {
      await expect(page.getByText(stage, { exact: false }).first()).toBeVisible();
    }
  });
});
