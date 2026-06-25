// App-wide constants and runtime-mode helpers.

export const APP_NAME = "ImobOps";
export const APP_TAGLINE = "Sistema operacional da sua imobiliária";

// The single demo tenancy used in mock mode and seed.
export const DEMO_TENANCY_ID = "tenancy-00000001";
export const DEMO_TENANCY_SLUG = "imobiliaria-demonstracao";
export const DEMO_TENANCY_NAME = "Imobiliária Demonstração";

// Demo users (ids match mock-data and seed).
export const DEMO_USERS = {
  admin: "user-00000001",
  broker: "user-00000002",
  finance: "user-00000003",
} as const;

// True when Supabase env is configured; otherwise the app runs in mock mode.
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

// Selected AI provider; "mock" when unset.
export function aiProvider(): "openai" | "anthropic" | "mock" {
  const p = process.env.AI_PROVIDER;
  if (p === "openai" || p === "anthropic") return p;
  return "mock";
}

// True when WhatsApp (Evolution API) is configured.
export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_TOKEN);
}

// True when the billing gateway (Asaas) is configured; otherwise billing runs in
// mock mode.
export function isBillingConfigured(): boolean {
  return Boolean(process.env.ASAAS_API_KEY);
}

export const CURRENCY = "BRL";
export const LOCALE = "pt-BR";
