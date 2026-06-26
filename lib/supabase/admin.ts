// Supabase Admin (service_role) client. Use ONLY in trusted server code for
// privileged operations the user can't do themselves — here: inviting a new
// auth user. NEVER expose this client or the service key to the browser, and
// never use it for user-facing reads/writes (RLS must apply there).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
