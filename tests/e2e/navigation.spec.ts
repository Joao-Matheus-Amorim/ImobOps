import { expect, test } from "@playwright/test";

const routes = [
  ["Dashboard", "/dashboard"],
  ["Clientes", "/clients"],
  ["Imóveis", "/properties"],
  ["Locação", "/rentals"],
  ["Vendas", "/sales"],
  ["Financeiro", "/finance"],
  ["Relatórios", "/reports"],
  ["Documentos", "/documents"],
  ["CRM", "/crm"],
  ["Condomínios", "/condos"],
];

test.describe("real app navigation", () => {
  for (const [label, route] of routes) {
    test(`loads ${label}`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`${route}(\\?.*)?$`));
      await expect(page.getByRole("heading").first()).toBeVisible();
    });
  }
});
