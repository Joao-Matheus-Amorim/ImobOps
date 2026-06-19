import type { Client, BusinessRole } from "@/lib/types/domain";
import { MockCollection, type RepoContext } from "./base";

const col = new MockCollection<Client>("clients");

export const clientsRepository = {
  list(ctx: RepoContext, query?: string): Client[] {
    const q = query?.trim().toLowerCase();
    return col
      .list(ctx, (c) =>
        q
          ? [c.name, c.document ?? "", c.email ?? "", c.phone ?? ""]
              .join(" ")
              .toLowerCase()
              .includes(q)
          : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  get(ctx: RepoContext, id: string): Client | null {
    return col.find(ctx, id);
  },

  create(ctx: RepoContext, data: Omit<Client, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">): Client {
    return col.create(ctx, data);
  },

  update(ctx: RepoContext, id: string, patch: Partial<Client>): Client | null {
    return col.update(ctx, id, patch);
  },

  addTag(ctx: RepoContext, id: string, tag: string): Client | null {
    const c = col.find(ctx, id);
    if (!c) return null;
    if (!c.tags.includes(tag)) {
      return col.update(ctx, id, { tags: [...c.tags, tag] });
    }
    return c;
  },

  addBusinessRole(ctx: RepoContext, id: string, role: BusinessRole): Client | null {
    const c = col.find(ctx, id);
    if (!c) return null;
    if (!c.rolesInBusiness.includes(role)) {
      return col.update(ctx, id, { rolesInBusiness: [...c.rolesInBusiness, role] });
    }
    return c;
  },
};
