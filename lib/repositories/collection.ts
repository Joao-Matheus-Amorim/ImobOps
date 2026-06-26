// Unified, tenancy-isolated collection. Async in both backends so repositories have
// a single shape. When Supabase is configured it hits the DB (under the user's RLS,
// which already enforces tenancy + scope); otherwise it uses the in-memory mock
// store. Replaces direct use of MockCollection in repositories.

import { randomUUID } from "node:crypto";
import { store, type MockStore } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/constants";
import { isSupabaseAdminRestConfigured, supabaseAdminRest } from "@/lib/supabase/admin-rest";
import { rowToCamel, camelToRow, toSnakeKey } from "./case-map";
import type { RepoContext, WithBase } from "./base";

// Declarative filters that push down to SQL (and are mirrored client-side in mock
// mode), so listings can paginate and avoid N+1 fetch-everything-then-filter.
// Keys are camelCase domain fields; they map to snake_case columns under the hood.
export interface ListOpts<T> {
  // Equality on a column: { status: "ativo" }.
  eq?: Partial<Record<keyof T & string, string | number | boolean | null>>;
  // Membership: { unitId: [...ids] }. An empty array matches nothing.
  in?: Partial<Record<keyof T & string, ReadonlyArray<string | number>>>;
  // Case-insensitive substring search across the given columns (OR'd together).
  search?: { columns: ReadonlyArray<keyof T & string>; term: string };
  // Ordering. Defaults to no explicit order (callers usually sort after).
  orderBy?: { column: keyof T & string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

export class Collection<T extends WithBase> {
  // `key` is the mock-store collection name; `table` is the Postgres table name.
  constructor(
    private readonly key: keyof MockStore,
    private readonly table: string,
  ) {}

  private get useDb(): boolean {
    return isSupabaseConfigured();
  }

  private useAdminRest(ctx: RepoContext): boolean {
    return ctx.userId === "system" && isSupabaseAdminRestConfigured();
  }

  private all(): T[] {
    return store[this.key] as unknown as T[];
  }

  // Apply declarative opts to an in-memory array (mock mode + the client-side
  // fallback used alongside a predicate).
  private applyOptsInMemory(rows: T[], opts?: ListOpts<T>): T[] {
    if (!opts) return rows;
    let out = rows;
    if (opts.eq) {
      for (const [k, v] of Object.entries(opts.eq)) {
        out = out.filter((r) => (r as Record<string, unknown>)[k] === v);
      }
    }
    if (opts.in) {
      for (const [k, vals] of Object.entries(opts.in)) {
        const set = new Set(vals as ReadonlyArray<unknown>);
        out = out.filter((r) => set.has((r as Record<string, unknown>)[k]));
      }
    }
    if (opts.search && opts.search.term.trim()) {
      const term = opts.search.term.trim().toLowerCase();
      out = out.filter((r) =>
        opts.search!.columns.some((c) =>
          String((r as Record<string, unknown>)[c] ?? "").toLowerCase().includes(term),
        ),
      );
    }
    if (opts.orderBy) {
      const { column, ascending = true } = opts.orderBy;
      out = [...out].sort((a, b) => {
        const av = (a as Record<string, unknown>)[column];
        const bv = (b as Record<string, unknown>)[column];
        const cmp = av === bv ? 0 : (av as never) < (bv as never) ? -1 : 1;
        return ascending ? cmp : -cmp;
      });
    }
    const start = opts.offset ?? 0;
    const end = opts.limit != null ? start + opts.limit : undefined;
    return start || end != null ? out.slice(start, end) : out;
  }

  // --- Reads ---

  async list(
    ctx: RepoContext,
    predicate?: (row: T) => boolean,
    opts?: ListOpts<T>,
  ): Promise<T[]> {
    if (!this.useDb) {
      const base = this.all().filter(
        (r) => r.tenancyId === ctx.tenancyId && (predicate ? predicate(r) : true),
      );
      return this.applyOptsInMemory(base, opts);
    }
    if (this.useAdminRest(ctx)) {
      const params = new URLSearchParams();
      params.set("select", "*");
      params.set("tenancy_id", `eq.${ctx.tenancyId}`);
      if (opts?.eq) {
        for (const [k, v] of Object.entries(opts.eq)) {
          params.set(toSnakeKey(k), `eq.${String(v)}`);
        }
      }
      if (opts?.limit != null) params.set("limit", String(opts.limit));
      const data = await supabaseAdminRest<Record<string, unknown>[]>(
        `${this.table}?${params.toString()}`,
      );
      const rows = (data ?? []).map((r) => rowToCamel<T>(r));
      return predicate ? rows.filter(predicate) : rows;
    }
    const supabase = createClient();
    if (!supabase) return [];
    // RLS already scopes by tenancy. Declarative opts push down to SQL; a predicate
    // (if any) still runs client-side for the expressive filters the mock used.
    let q = supabase.from(this.table).select("*");
    if (opts?.eq) {
      for (const [k, v] of Object.entries(opts.eq)) q = q.eq(toSnakeKey(k), v as never);
    }
    if (opts?.in) {
      for (const [k, vals] of Object.entries(opts.in)) {
        q = q.in(toSnakeKey(k), vals as never[]);
      }
    }
    if (opts?.search && opts.search.term.trim()) {
      const term = opts.search.term.trim().replace(/[%,()]/g, " ");
      const ors = opts.search.columns
        .map((c) => `${toSnakeKey(c)}.ilike.%${term}%`)
        .join(",");
      q = q.or(ors);
    }
    if (opts?.orderBy) {
      q = q.order(toSnakeKey(opts.orderBy.column), {
        ascending: opts.orderBy.ascending ?? true,
      });
    }
    if (opts?.limit != null) {
      const start = opts.offset ?? 0;
      q = q.range(start, start + opts.limit - 1);
    } else if (opts?.offset != null) {
      q = q.range(opts.offset, opts.offset + 999);
    }
    const { data, error } = await q;
    if (error) throw new Error(`${this.table}.list: ${error.message}`);
    const rows = (data ?? []).map((r) => rowToCamel<T>(r as Record<string, unknown>));
    return predicate ? rows.filter(predicate) : rows;
  }

  async find(ctx: RepoContext, id: string): Promise<T | null> {
    if (!this.useDb) {
      return this.all().find((r) => r.id === id && r.tenancyId === ctx.tenancyId) ?? null;
    }
    if (this.useAdminRest(ctx)) {
      const params = new URLSearchParams();
      params.set("select", "*");
      params.set("id", `eq.${id}`);
      params.set("tenancy_id", `eq.${ctx.tenancyId}`);
      const data = await supabaseAdminRest<Record<string, unknown>[]>(
        `${this.table}?${params.toString()}`,
      );
      return data[0] ? rowToCamel<T>(data[0]) : null;
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
    if (this.useAdminRest(ctx)) {
      const payload = camelToRow({
        ...data,
        tenancyId: ctx.tenancyId,
        createdBy: null,
      });
      const inserted = await supabaseAdminRest<Record<string, unknown>[]>(
        this.table,
        { method: "POST", body: payload, prefer: "return=representation" },
      );
      return rowToCamel<T>(inserted[0] as Record<string, unknown>);
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
    if (this.useAdminRest(ctx)) {
      const params = new URLSearchParams();
      params.set("id", `eq.${id}`);
      params.set("tenancy_id", `eq.${ctx.tenancyId}`);
      const payload = camelToRow({ ...patch, updatedAt: new Date().toISOString() });
      const data = await supabaseAdminRest<Record<string, unknown>[]>(
        `${this.table}?${params.toString()}`,
        { method: "PATCH", body: payload, prefer: "return=representation" },
      );
      return data[0] ? rowToCamel<T>(data[0]) : null;
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
