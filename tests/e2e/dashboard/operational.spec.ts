import { expect, test } from "@playwright/test";

test.describe("dashboard operational cards", () => {
  test("loads all stat cards on admin dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading").first()).toBeVisible();

    const cards = [
      "Ocupação",
      "GMV do mês",
      "A receber",
      "Inadimplência",
      "Comissões a pagar",
      "Repasses pendentes",
      "Cobranças hoje",
      "Conversas abertas",
      "Repasses a fazer",
      "Locações a vencer",
      "Atividades hoje",
      "Clientes recentes",
      "Automações com erro",
    ];
    for (const label of cards) {
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
    }
  });

  test("shows quick actions bar", async ({ page }) => {
    await page.goto("/dashboard");
    const actions = ["Locação", "Boletos", "WhatsApp", "Clientes", "Imóveis", "Vendas", "Agenda"];
    for (const label of actions) {
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
    }
  });

  test("shows funnel summary", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Leads no funil")).toBeVisible();
  });

  test("shows overdue list", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Top inadimplentes")).toBeVisible();
  });

  test("shows reports shortcut", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Pendências da operação")).toBeVisible();
  });

  test("shows hoje na imobiliária block", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Hoje na imobiliária")).toBeVisible();
  });
});
