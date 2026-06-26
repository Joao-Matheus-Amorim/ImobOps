export type RuntimeCheck = {
  key: string;
  label: string;
  ready: boolean;
  detail: string;
  requiredVars: string[];
};

function hasEnv(name: string): boolean {
  const value = process.env[name];
  return Boolean(value && value.trim());
}

export function getRuntimeChecks(): RuntimeCheck[] {
  const aiProvider = process.env.AI_PROVIDER?.trim() || "mock";
  const aiReady =
    (aiProvider === "openai" && hasEnv("OPENAI_API_KEY")) ||
    (aiProvider === "anthropic" && hasEnv("ANTHROPIC_API_KEY")) ||
    (aiProvider === "openrouter" && hasEnv("OPENROUTER_API_KEY"));

  return [
    {
      key: "supabase",
      label: "Supabase",
      ready:
        hasEnv("NEXT_PUBLIC_SUPABASE_URL") &&
        hasEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") &&
        hasEnv("SUPABASE_SERVICE_ROLE_KEY"),
      detail: "Banco, auth, RLS e persistencia principal.",
      requiredVars: [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
      ],
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      ready:
        hasEnv("EVOLUTION_API_URL") &&
        hasEnv("EVOLUTION_API_TOKEN") &&
        hasEnv("EVOLUTION_INSTANCE") &&
        hasEnv("EVOLUTION_WEBHOOK_TOKEN"),
      detail: "Inbox real, webhook e disparo operacional.",
      requiredVars: [
        "EVOLUTION_API_URL",
        "EVOLUTION_API_TOKEN",
        "EVOLUTION_INSTANCE",
        "EVOLUTION_WEBHOOK_TOKEN",
      ],
    },
    {
      key: "ai",
      label: "IA",
      ready: aiReady,
      detail: `Provider atual: ${aiProvider}.`,
      requiredVars:
        aiProvider === "anthropic"
          ? ["AI_PROVIDER", "ANTHROPIC_API_KEY"]
          : aiProvider === "openrouter"
            ? ["AI_PROVIDER", "OPENROUTER_API_KEY", "OPENROUTER_MODEL"]
          : ["AI_PROVIDER", "OPENAI_API_KEY"],
    },
    {
      key: "billing",
      label: "Billing",
      ready:
        hasEnv("ASAAS_API_KEY") &&
        hasEnv("ASAAS_BASE_URL") &&
        hasEnv("ASAAS_WEBHOOK_TOKEN") &&
        hasEnv("CRON_SECRET"),
      detail: "Cobranca, webhook de pagamento e cron protegido.",
      requiredVars: [
        "ASAAS_API_KEY",
        "ASAAS_BASE_URL",
        "ASAAS_WEBHOOK_TOKEN",
        "CRON_SECRET",
      ],
    },
    {
      key: "rate-limit",
      label: "Rate limit",
      ready:
        hasEnv("UPSTASH_REDIS_REST_URL") &&
        hasEnv("UPSTASH_REDIS_REST_TOKEN"),
      detail: "Protecao distribuida para APIs e webhooks.",
      requiredVars: [
        "UPSTASH_REDIS_REST_URL",
        "UPSTASH_REDIS_REST_TOKEN",
      ],
    },
  ];
}

export function getRuntimeSummary() {
  const checks = getRuntimeChecks();
  const readyCount = checks.filter((check) => check.ready).length;

  return {
    checks,
    readyCount,
    totalCount: checks.length,
    appReady: readyCount === checks.length,
  };
}
