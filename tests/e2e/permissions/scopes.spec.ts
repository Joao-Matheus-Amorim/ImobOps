import { expect, test } from "@playwright/test";

test.describe("broker permissions", () => {
  test.use({ storageState: "playwright/.auth/broker.json" });

  test("can access own pages", async ({ page }) => {
    const allowed = ["/dashboard", "/clients", "/properties", "/sales", "/crm", "/calendar", "/rentals", "/whatsapp", "/reports"];
    for (const route of allowed) {
      await page.goto(route);
      await expect(page.getByRole("heading").first()).toBeVisible();
    }
  });

  test("cannot access finance pages", async ({ page }) => {
    await page.goto("/finance");
    await expect(page).toHaveURL(/\/dashboard|\/login/);
  });
});

test.describe("finance permissions", () => {
  test.use({ storageState: "playwright/.auth/finance.json" });

  test("can access finance pages", async ({ page }) => {
    const allowed = ["/dashboard", "/finance", "/rentals", "/clients", "/properties", "/calendar", "/reports", "/documents"];
    for (const route of allowed) {
      await page.goto(route);
      await expect(page.getByRole("heading").first()).toBeVisible();
    }
  });

  test("cannot access whatsapp or crm", async ({ page }) => {
    await page.goto("/whatsapp");
    await expect(page).toHaveURL(/\/dashboard|\/login/);
    await page.goto("/crm");
    await expect(page).toHaveURL(/\/dashboard|\/login/);
  });

  test("cannot send whatsapp message", async ({ request }) => {
    const res = await request.post("/api/whatsapp/send", {
      data: { to: "5511999999999", body: "test" },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Permissão negada");
  });
});

test.describe("viewer permissions", () => {
  test.use({ storageState: "playwright/.auth/viewer.json" });

  test("can view all pages", async ({ page }) => {
    const routes = ["/dashboard", "/clients", "/properties", "/rentals", "/sales", "/finance", "/reports", "/documents", "/crm", "/condos"];
    for (const route of routes) {
      await page.goto(route);
      await expect(page.getByRole("heading").first()).toBeVisible();
    }
  });

  test("cannot access admin-only area", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard|\/login/);
  });

  test("cannot create client via API", async ({ request }) => {
    const res = await request.post("/api/clients", {
      data: { name: "Test" },
    });
    expect([401, 403]).toContain(res.status());
  });
});
