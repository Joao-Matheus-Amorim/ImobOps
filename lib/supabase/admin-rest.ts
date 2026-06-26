import { isSupabaseConfigured } from "@/lib/constants";

export function isSupabaseAdminRestConfigured(): boolean {
  return Boolean(
    isSupabaseConfigured() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export async function supabaseAdminRest<T>(
  path: string,
  init?: { method?: string; body?: unknown; prefer?: string },
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !secret) {
    throw new Error("supabaseAdminRest: Supabase admin env not configured");
  }

  const headers: Record<string, string> = {
    apikey: secret,
    "content-type": "application/json",
    "user-agent": "imobops-server",
  };
  if (init?.prefer) headers.Prefer = init.prefer;

  const res = await fetch(`${baseUrl}/rest/v1/${path}`, {
    method: init?.method ?? "GET",
    headers,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`supabaseAdminRest ${res.status}: ${text}`);
  }
  return (text ? JSON.parse(text) : null) as T;
}
