import type { Property, PropertyStatus } from "@/lib/types/domain";
import { type RepoContext } from "./base";
import { Collection } from "./collection";

const col = new Collection<Property>("properties", "properties");

export const propertiesRepository = {
  async list(ctx: RepoContext, query?: string): Promise<Property[]> {
    const q = query?.trim().toLowerCase();
    const rows = await col.list(ctx, (p) =>
      q ? [p.address, p.description ?? "", p.kind].join(" ").toLowerCase().includes(q) : true,
    );
    return rows.sort((a, b) => a.address.localeCompare(b.address));
  },

  get(ctx: RepoContext, id: string): Promise<Property | null> {
    return col.find(ctx, id);
  },

  // Fetch many by id in a single query (avoids N+1 in listing pages).
  byIds(ctx: RepoContext, ids: string[]): Promise<Property[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return col.list(ctx, undefined, { in: { id: [...new Set(ids)] } });
  },

  create(
    ctx: RepoContext,
    data: Omit<Property, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">,
  ): Promise<Property> {
    return col.create(ctx, data);
  },

  update(ctx: RepoContext, id: string, patch: Partial<Property>): Promise<Property | null> {
    return col.update(ctx, id, patch);
  },

  changeStatus(
    ctx: RepoContext,
    id: string,
    status: PropertyStatus,
  ): Promise<Property | null> {
    return col.update(ctx, id, { status });
  },

  remove(ctx: RepoContext, id: string): Promise<boolean> {
    return col.remove(ctx, id);
  },

  byCondo(ctx: RepoContext, condoId: string): Promise<Property[]> {
    return col.list(ctx, (p) => p.condoId === condoId);
  },
};
