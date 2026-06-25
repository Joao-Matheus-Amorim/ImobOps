// Append-only repositories for audit_log and ai_actions. Supabase-backed when
// configured (RLS: insert/select within the tenancy, no update/delete), else mock.
import { randomUUID } from "node:crypto";
import type { AuditLogEntry, AiActionEntry } from "@/lib/types/domain";
import { store } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/constants";
import { rowToCamel, camelToRow } from "./case-map";
import type { RepoContext } from "./base";

export const auditRepository = {
  async log(
    ctx: RepoContext,
    entry: Omit<AuditLogEntry, "id" | "tenancyId" | "at">,
  ): Promise<AuditLogEntry> {
    const row: AuditLogEntry = {
      id: randomUUID(),
      tenancyId: ctx.tenancyId,
      at: new Date().toISOString(),
      ...entry,
    };
    if (!isSupabaseConfigured()) {
      store.auditLog.push(row);
      return row;
    }
    const supabase = createClient();
    if (!supabase) return row;
    const { data, error } = await supabase
      .from("audit_log")
      .insert(camelToRow({ tenancyId: ctx.tenancyId, ...entry }))
      .select("*")
      .single();
    if (error) throw new Error(`audit_log.log: ${error.message}`);
    return rowToCamel<AuditLogEntry>(data as Record<string, unknown>);
  },

  async list(ctx: RepoContext): Promise<AuditLogEntry[]> {
    if (!isSupabaseConfigured()) {
      return store.auditLog
        .filter((e) => e.tenancyId === ctx.tenancyId)
        .sort((a, b) => b.at.localeCompare(a.at));
    }
    const supabase = createClient();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("at", { ascending: false });
    if (error) throw new Error(`audit_log.list: ${error.message}`);
    return (data ?? []).map((r) => rowToCamel<AuditLogEntry>(r as Record<string, unknown>));
  },
};

export const aiActionsRepository = {
  async record(
    ctx: RepoContext,
    entry: Omit<AiActionEntry, "id" | "tenancyId" | "at">,
  ): Promise<AiActionEntry> {
    const row: AiActionEntry = {
      id: randomUUID(),
      tenancyId: ctx.tenancyId,
      at: new Date().toISOString(),
      ...entry,
    };
    if (!isSupabaseConfigured()) {
      store.aiActions.push(row);
      return row;
    }
    const supabase = createClient();
    if (!supabase) return row;
    const { data, error } = await supabase
      .from("ai_actions")
      .insert(camelToRow({ tenancyId: ctx.tenancyId, ...entry }))
      .select("*")
      .single();
    if (error) throw new Error(`ai_actions.record: ${error.message}`);
    return rowToCamel<AiActionEntry>(data as Record<string, unknown>);
  },

  async list(ctx: RepoContext): Promise<AiActionEntry[]> {
    if (!isSupabaseConfigured()) {
      return store.aiActions
        .filter((e) => e.tenancyId === ctx.tenancyId)
        .sort((a, b) => b.at.localeCompare(a.at));
    }
    const supabase = createClient();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("ai_actions")
      .select("*")
      .order("at", { ascending: false });
    if (error) throw new Error(`ai_actions.list: ${error.message}`);
    return (data ?? []).map((r) => rowToCamel<AiActionEntry>(r as Record<string, unknown>));
  },
};
