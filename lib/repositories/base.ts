// Repository base. Provides a generic, tenancy-isolated collection backed by the
// in-memory mock store. The same interface is intended to be implemented against
// Supabase (RLS already enforces tenancy + scope server-side); for the MVP we use
// the mock store whenever Supabase is not configured.

import { randomUUID } from "node:crypto";
import { store, type MockStore } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/constants";

export type WithBase = {
  id: string;
  tenancyId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

export interface RepoContext {
  tenancyId: string;
  userId: string;
}

// True when the repositories should hit Supabase. For the MVP we still operate on
// the mock store, but this flag documents the seam and lets future code branch.
export function usingSupabase(): boolean {
  return isSupabaseConfigured();
}

// A thin CRUD wrapper over a single mock-store collection with tenancy isolation.
export class MockCollection<T extends WithBase> {
  constructor(private readonly key: keyof MockStore) {}

  private all(): T[] {
    return store[this.key] as unknown as T[];
  }

  list(ctx: RepoContext, predicate?: (row: T) => boolean): T[] {
    return this.all().filter(
      (r) => r.tenancyId === ctx.tenancyId && (predicate ? predicate(r) : true),
    );
  }

  find(ctx: RepoContext, id: string): T | null {
    return (
      this.all().find((r) => r.id === id && r.tenancyId === ctx.tenancyId) ?? null
    );
  }

  create(ctx: RepoContext, data: Omit<T, keyof WithBase> & Partial<WithBase>): T {
    const nowIso = new Date().toISOString();
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

  update(ctx: RepoContext, id: string, patch: Partial<T>): T | null {
    const row = this.find(ctx, id);
    if (!row) return null;
    Object.assign(row, patch, { updatedAt: new Date().toISOString() });
    return row;
  }

  remove(ctx: RepoContext, id: string): boolean {
    const arr = this.all();
    const idx = arr.findIndex(
      (r) => r.id === id && r.tenancyId === ctx.tenancyId,
    );
    if (idx === -1) return false;
    arr.splice(idx, 1);
    return true;
  }
}

export function newId(): string {
  return randomUUID();
}
