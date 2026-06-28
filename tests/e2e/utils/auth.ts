import { expect, type Page } from "@playwright/test";
import { loadLocalEnv } from "./env";

export const adminAuthFile = "playwright/.auth/admin.json";
export const brokerAuthFile = "playwright/.auth/broker.json";
export const financeAuthFile = "playwright/.auth/finance.json";
export const viewerAuthFile = "playwright/.auth/viewer.json";

const roleDefaults: Record<string, { emailVar: string; passVar: string; fallbackEmail: string }> = {
  admin: { emailVar: "E2E_ADMIN_EMAIL", passVar: "E2E_ADMIN_PASSWORD", fallbackEmail: "e2e.admin@imobops.local" },
  broker: { emailVar: "E2E_BROKER_EMAIL", passVar: "E2E_BROKER_PASSWORD", fallbackEmail: "e2e.broker@imobops.local" },
  finance: { emailVar: "E2E_FINANCE_EMAIL", passVar: "E2E_FINANCE_PASSWORD", fallbackEmail: "e2e.finance@imobops.local" },
  viewer: { emailVar: "E2E_VIEWER_EMAIL", passVar: "E2E_VIEWER_PASSWORD", fallbackEmail: "e2e.viewer@imobops.local" },
};

export async function loginAs(page: Page, role: string) {
  loadLocalEnv();
  const def = roleDefaults[role];
  if (!def) throw new Error(`Unknown role: ${role}`);

  const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!hasSupabase) return; // skip login — Supabase not available

  await page.goto("/login");

  const email = process.env[def.emailVar] ?? def.fallbackEmail;
  const password = process.env[def.passVar] ?? "ImobOpsE2E!123456";

  if (!process.env[def.emailVar] || !process.env[def.passVar]) {
    const needsServiceKey = !process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (needsServiceKey) {
      throw new Error(
        `E2E real requer ${def.emailVar}/${def.passVar} ou SUPABASE_SERVICE_ROLE_KEY para criar o usuário automaticamente.`,
      );
    }
  }

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: /entrar/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
}

export async function loginAsAdmin(page: Page) {
  await loginAs(page, "admin");
}
