import { join } from "node:path";
import { parseEnvFile } from "./env-utils.mjs";

const root = process.cwd();

const rootEnv = parseEnvFile(join(root, ".env"));
const evolutionEnv = parseEnvFile(join(root, "infra", "evolution", ".env"));

let failures = 0;
let warnings = 0;

function ok(label, detail = "") {
  console.log(`OK    ${label}${detail ? ` - ${detail}` : ""}`);
}

function warn(label, detail = "") {
  warnings += 1;
  console.log(`WARN  ${label}${detail ? ` - ${detail}` : ""}`);
}

function fail(label, detail = "") {
  failures += 1;
  console.log(`FAIL  ${label}${detail ? ` - ${detail}` : ""}`);
}

function present(env, key) {
  return Boolean(env.values[key] && env.values[key].trim());
}

function requireKeys(env, label, keys) {
  const missing = keys.filter((key) => !present(env, key));
  if (missing.length) fail(label, `missing: ${missing.join(", ")}`);
  else ok(label);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value ?? "",
  );
}

console.log("ImobOps runtime config check");
console.log("");

if (!rootEnv.exists) {
  fail(".env", "file not found");
} else {
  ok(".env", "found");
}

if (!evolutionEnv.exists) {
  fail("infra/evolution/.env", "file not found; copy infra/evolution/.env.example");
} else {
  ok("infra/evolution/.env", "found");
}

if (rootEnv.exists) {
  requireKeys(rootEnv, "Supabase", [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_DEFAULT_TENANCY_ID",
  ]);
  if (present(rootEnv, "SUPABASE_DEFAULT_TENANCY_ID")) {
    if (isUuid(rootEnv.values.SUPABASE_DEFAULT_TENANCY_ID)) {
      ok("Supabase default tenancy", "valid UUID");
    } else {
      fail("Supabase default tenancy", "must be a real UUID from public.tenancies");
    }
  }

  requireKeys(rootEnv, "OpenRouter", [
    "AI_PROVIDER",
    "OPENROUTER_API_KEY",
    "OPENROUTER_MODEL",
  ]);
  if (rootEnv.values.AI_PROVIDER && rootEnv.values.AI_PROVIDER !== "openrouter") {
    warn("AI provider", `current value is ${rootEnv.values.AI_PROVIDER}`);
  }

  requireKeys(rootEnv, "Asaas", [
    "ASAAS_API_KEY",
    "ASAAS_BASE_URL",
    "ASAAS_WEBHOOK_TOKEN",
    "CRON_SECRET",
  ]);
  if (/^ASAAS_API_KEY=\$[^\r\n]+/m.test(rootEnv.raw)) {
    warn("ASAAS_API_KEY", "value starts with $ and should be quoted in .env");
  }

  requireKeys(rootEnv, "Evolution", [
    "EVOLUTION_API_URL",
    "EVOLUTION_API_TOKEN",
    "EVOLUTION_INSTANCE",
    "EVOLUTION_WEBHOOK_TOKEN",
  ]);

  const hasUpstash =
    present(rootEnv, "UPSTASH_REDIS_REST_URL") &&
    present(rootEnv, "UPSTASH_REDIS_REST_TOKEN");
  if (hasUpstash) ok("Upstash rate limit");
  else warn("Upstash rate limit", "missing; local fallback is OK for local dev");
}

if (rootEnv.exists && evolutionEnv.exists) {
  const appToken = rootEnv.values.EVOLUTION_API_TOKEN;
  const evolutionToken = evolutionEnv.values.AUTHENTICATION_API_KEY;
  if (!appToken || !evolutionToken) {
    fail("Evolution API key match", "missing EVOLUTION_API_TOKEN or AUTHENTICATION_API_KEY");
  } else if (appToken === evolutionToken) {
    ok("Evolution API key match");
  } else {
    fail("Evolution API key match", "EVOLUTION_API_TOKEN must equal AUTHENTICATION_API_KEY");
  }
}

console.log("");
if (failures) {
  console.log(`Config check failed: ${failures} failure(s), ${warnings} warning(s).`);
  process.exit(1);
}
console.log(`Config check passed: ${warnings} warning(s).`);
