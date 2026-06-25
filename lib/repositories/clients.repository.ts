import type { Client, BusinessRole } from "@/lib/types/domain";
import { type RepoContext } from "./base";
import { Collection } from "./collection";

const col = new Collection<Client>("clients", "clients");

export const clientsRepository = {
  async list(ctx: RepoContext, query?: string): Promise<Client[]> {
    const q = query?.trim().toLowerCase();
    const rows = await col.list(ctx, (c) =>
      q
        ? [c.name, c.document ?? "", c.email ?? "", c.phone ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(q)
        : true,
    );
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  },

  get(ctx: RepoContext, id: string): Promise<Client | null> {
    return col.find(ctx, id);
  },

  create(
    ctx: RepoContext,
    data: Omit<Client, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">,
  ): Promise<Client> {
    return col.create(ctx, data);
  },

  update(ctx: RepoContext, id: string, patch: Partial<Client>): Promise<Client | null> {
    return col.update(ctx, id, patch);
  },

  remove(ctx: RepoContext, id: string): Promise<boolean> {
    return col.remove(ctx, id);
  },

  async addTag(ctx: RepoContext, id: string, tag: string): Promise<Client | null> {
    const c = await col.find(ctx, id);
    if (!c) return null;
    if (!c.tags.includes(tag)) {
      return col.update(ctx, id, { tags: [...c.tags, tag] });
    }
    return c;
  },

  async addBusinessRole(
    ctx: RepoContext,
    id: string,
    role: BusinessRole,
  ): Promise<Client | null> {
    const c = await col.find(ctx, id);
    if (!c) return null;
    if (!c.rolesInBusiness.includes(role)) {
      return col.update(ctx, id, { rolesInBusiness: [...c.rolesInBusiness, role] });
    }
    return c;
  },
};
