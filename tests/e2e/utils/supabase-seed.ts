import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./env";

const defaultEmail = "e2e.admin@imobops.local";
const defaultPassword = "ImobOpsE2E!123456";

function isUuid(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export async function ensureE2EAdminUser() {
  loadLocalEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

  const email = process.env.E2E_ADMIN_EMAIL ?? defaultEmail;
  const password = process.env.E2E_ADMIN_PASSWORD ?? defaultPassword;
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  process.env.E2E_ADMIN_EMAIL = email;
  process.env.E2E_ADMIN_PASSWORD = password;

  const users = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (users.error) throw users.error;
  let authUser = users.data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());

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

  if (!authUser) throw new Error("Falha ao criar usuário admin E2E no Supabase.");

  let tenancyId = process.env.SUPABASE_DEFAULT_TENANCY_ID;
  if (!isUuid(tenancyId)) {
    const existingTenancy = await supabase.from("tenancies").select("id").limit(1).maybeSingle();
    if (existingTenancy.error) throw existingTenancy.error;
    tenancyId = existingTenancy.data?.id ?? randomUUID();
  }

  const tenancy = await supabase.from("tenancies").upsert({
    id: tenancyId,
    name: "ImobOps E2E",
    slug: "imobops-e2e",
    plan: "single",
  }, { onConflict: "id" });
  if (tenancy.error) throw tenancy.error;

  const existingProfile = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();
  if (existingProfile.error) throw existingProfile.error;

  const profile = {
    tenancy_id: tenancyId,
    auth_user_id: authUser.id,
    role: "admin",
    display_name: "Admin E2E",
    email,
    active: true,
  };

  const profileWrite = existingProfile.data?.id
    ? await supabase.from("users").update(profile).eq("id", existingProfile.data.id)
    : await supabase.from("users").insert(profile);
  if (profileWrite.error) throw profileWrite.error;
}
