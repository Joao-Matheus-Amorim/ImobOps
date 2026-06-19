import type { Property, PropertyStatus } from "@/lib/types/domain";
import { MockCollection, type RepoContext } from "./base";

const col = new MockCollection<Property>("properties");

export const propertiesRepository = {
  list(ctx: RepoContext, query?: string): Property[] {
    const q = query?.trim().toLowerCase();
    return col
      .list(ctx, (p) =>
        q ? [p.address, p.description ?? "", p.kind].join(" ").toLowerCase().includes(q) : true,
      )
      .sort((a, b) => a.address.localeCompare(b.address));
  },

  get(ctx: RepoContext, id: string): Property | null {
    return col.find(ctx, id);
  },

  create(ctx: RepoContext, data: Omit<Property, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">): Property {
    return col.create(ctx, data);
  },

  update(ctx: RepoContext, id: string, patch: Partial<Property>): Property | null {
    return col.update(ctx, id, patch);
  },

  changeStatus(ctx: RepoContext, id: string, status: PropertyStatus): Property | null {
    return col.update(ctx, id, { status });
  },

  byCondo(ctx: RepoContext, condoId: string): Property[] {
    return col.list(ctx, (p) => p.condoId === condoId);
  },
};
