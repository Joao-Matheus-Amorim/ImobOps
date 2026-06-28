import { expect, type Page } from "@playwright/test";
import { loadLocalEnv } from "./env";

export const adminAuthFile = "playwright/.auth/admin.json";

export async function loginAsAdmin(page: Page) {
  loadLocalEnv();
  await page.goto("/login");

  const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const email = process.env.E2E_ADMIN_EMAIL ?? "admin@imobops.local";
  const password = process.env.E2E_ADMIN_PASSWORD ?? "mock-password";

  if (hasSupabase && (!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD)) {
    throw new Error(
      "E2E real requer E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD ou SUPABASE_SERVICE_ROLE_KEY para criar o admin automaticamente.",
    );
  }

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: /entrar/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
}
