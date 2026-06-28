import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./env";

const defaultPassword = "ImobOpsE2E!123456";
const roleDefaults: Record<string, { email: string; display: string }> = {
  admin: { email: "e2e.admin@imobops.local", display: "Admin E2E" },
  broker: { email: "e2e.broker@imobops.local", display: "Corretor E2E" },
  finance: { email: "e2e.finance@imobops.local", display: "Financeiro E2E" },
  viewer: { email: "e2e.viewer@imobops.local", display: "Visualizador E2E" },
};

function isUuid(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

async function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureTenancy(supabase: any): Promise<string> {
  let tenancyId: string | undefined = process.env.SUPABASE_DEFAULT_TENANCY_ID;
  if (!isUuid(tenancyId)) {
    const existingTenancy = await supabase.from("tenancies").select("id").limit(1).maybeSingle();
    if (existingTenancy.error) throw existingTenancy.error;
    tenancyId = existingTenancy.data?.id;
  }

  if (!isUuid(tenancyId)) {
    tenancyId = randomUUID();
    const tenancy = await supabase.from("tenancies").upsert({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      id: tenancyId!,
      name: "ImobOps E2E",
      slug: "imobops-e2e",
      plan: "single",
    }, { onConflict: "id" });
    if (tenancy.error) throw tenancy.error;
  }

  return tenancyId!;
}

export async function ensureE2EUser(role: string) {
  loadLocalEnv();
  const supabase = await getSupabase();
  if (!supabase) return;

  const def = roleDefaults[role];
  if (!def) throw new Error(`Unknown E2E role: ${role}`);

  const email = process.env[`E2E_${role.toUpperCase()}_EMAIL`] ?? def.email;
  const password = process.env[`E2E_${role.toUpperCase()}_PASSWORD`] ?? defaultPassword;

  process.env[`E2E_${role.toUpperCase()}_EMAIL`] = email;
  process.env[`E2E_${role.toUpperCase()}_PASSWORD`] = password;

  const users = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (users.error) throw users.error;
  let authUser = users.data.users.find((user: { email?: string | null }) => user.email?.toLowerCase() === email.toLowerCase());

  if (!authUser) {
    const created = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { source: "imobops-e2e" },
    });
    if (created.error) throw created.error;
    authUser = created.data.user;
  }

  if (!authUser) throw new Error(`Falha ao criar usuário E2E para role=${role}.`);

  const tenancyId = await ensureTenancy(supabase);

  const existingProfile = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();
  if (existingProfile.error) throw existingProfile.error;

  const profile = {
    tenancy_id: tenancyId,
    auth_user_id: authUser.id,
    role,
    display_name: def.display,
    email,
    active: true,
  };

  const profileWrite = existingProfile.data?.id
    ? await supabase.from("users").update(profile).eq("id", existingProfile.data.id)
    : await supabase.from("users").insert(profile);
  if (profileWrite.error) throw profileWrite.error;
}

export async function ensureE2EAdminUser() {
  await ensureE2EUser("admin");
}
