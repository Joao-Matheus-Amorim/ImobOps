// Browser Supabase client. Returns null when Supabase is not configured (mock mode).
import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/lib/constants";

export function createClient() {
  if (!isSupabaseConfigured()) return null;
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
