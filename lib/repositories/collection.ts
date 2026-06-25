// Unified, tenancy-isolated collection. Async in both backends so repositories have
// a single shape. When Supabase is configured it hits the DB (under the user's RLS,
// which already enforces tenancy + scope); otherwise it uses the in-memory mock
// store. Replaces direct use of MockCollection in repositories.

import { randomUUID } from "node:crypto";
import { store, type MockStore } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/constants";
import { rowToCamel, camelToRow } from "./case-map";
import type { RepoContext, WithBase } from "./base";

export class Collection<T extends WithBase> {
  // `key` is the mock-store collection name; `table` is the Postgres table name.
  constructor(
    private readonly key: keyof MockStore,
    private readonly table: string,
  ) {}

  private get useDb(): boolean {
    return isSupabaseConfigured();
  }

  private all(): T[] {
    return store[this.key] as unknown as T[];
  }

  // --- Reads ---

  async list(ctx: RepoContext, predicate?: (row: T) => boolean): Promise<T[]> {
    if (!this.useDb) {
      return this.all().filter(
        (r) => r.tenancyId === ctx.tenancyId && (predicate ? predicate(r) : true),
      );
    }
    const supabase = createClient();
    if (!supabase) return [];
    // RLS already scopes by tenancy; the predicate is applied client-side to keep
    // the same expressive filter the mock used.
    const { data, error } = await supabase.from(this.table).select("*");
    if (error) throw new Error(`${this.table}.list: ${error.message}`);
    const rows = (data ?? []).map((r) => rowToCamel<T>(r as Record<string, unknown>));
    return predicate ? rows.filter(predicate) : rows;
  }

  async find(ctx: RepoContext, id: string): Promise<T | null> {
    if (!this.useDb) {
      return this.all().find((r) => r.id === id && r.tenancyId === ctx.tenancyId) ?? null;
    }
    const supabase = createClient();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`${this.table}.find: ${error.message}`);
    return data ? rowToCamel<T>(data as Record<string, unknown>) : null;
  }

  // --- Writes ---

  async create(
    ctx: RepoContext,
    data: Omit<T, keyof WithBase> & Partial<WithBase>,
  ): Promise<T> {
    const nowIso = new Date().toISOString();
    if (!this.useDb) {
      const row = {
        id: data.id ?? randomUUID(),
        tenancyId: ctx.tenancyId,
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: ctx.userId,
        ...data,
      } as T;
      this.all().push(row);
      return row;
    }
    const supabase = createClient();
    if (!supabase) throw new Error(`${this.table}.create: no supabase client`);
    const payload = camelToRow({
      ...data,
      tenancyId: ctx.tenancyId,
      createdBy: ctx.userId,
    });
    const { data: inserted, error } = await supabase
      .from(this.table)
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(`${this.table}.create: ${error.message}`);
    return rowToCamel<T>(inserted as Record<string, unknown>);
  }

  async update(ctx: RepoContext, id: string, patch: Partial<T>): Promise<T | null> {
    if (!this.useDb) {
      const row = this.all().find((r) => r.id === id && r.tenancyId === ctx.tenancyId);
      if (!row) return null;
      Object.assign(row, patch, { updatedAt: new Date().toISOString() });
      return row;
    }
    const supabase = createClient();
    if (!supabase) return null;
    const payload = camelToRow({ ...patch, updatedAt: new Date().toISOString() });
    const { data, error } = await supabase
      .from(this.table)
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(`${this.table}.update: ${error.message}`);
    return data ? rowToCamel<T>(data as Record<string, unknown>) : null;
  }

  async remove(ctx: RepoContext, id: string): Promise<boolean> {
    if (!this.useDb) {
      const arr = this.all();
      const idx = arr.findIndex((r) => r.id === id && r.tenancyId === ctx.tenancyId);
      if (idx === -1) return false;
      arr.splice(idx, 1);
      return true;
    }
    const supabase = createClient();
    if (!supabase) return false;
    const { error } = await supabase.from(this.table).delete().eq("id", id);
    if (error) throw new Error(`${this.table}.remove: ${error.message}`);
    return true;
  }
}
