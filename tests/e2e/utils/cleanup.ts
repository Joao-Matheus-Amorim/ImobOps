import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./env";

interface E2ERecord {
  table: string;
  id: string;
}

const records: E2ERecord[] = [];

export function track(table: string, id: string) {
  records.push({ table, id });
}

export async function cleanupAll() {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || records.length === 0) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any;

  // Delete in reverse order to respect FK constraints
  const reversed = [...records].reverse();
  for (const { table, id } of reversed) {
    await supabase.from(table).delete().eq("id", id);
  }

  records.length = 0;
}
