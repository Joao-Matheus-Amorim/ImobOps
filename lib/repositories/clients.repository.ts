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

  // Fetch many by id in a single query (avoids N+1 in listing pages).
  byIds(ctx: RepoContext, ids: string[]): Promise<Client[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return col.list(ctx, undefined, { in: { id: [...new Set(ids)] } });
  },

  // Find an existing client that conflicts with the given data: same document
  // (CPF/CNPJ), same phone/whatsapp, or same name + phone. Pass `excludeId` when
  // editing so a client isn't flagged against itself. Values should be normalized
  // (digits-only document/phone) as stored. Returns the first conflict or null.
  async findDuplicate(
    ctx: RepoContext,
    data: { name?: string; document?: string | null; phone?: string | null; whatsapp?: string | null },
    excludeId?: string,
  ): Promise<Client | null> {
    const doc = data.document?.replace(/\D/g, "") || null;
    const phones = [data.phone, data.whatsapp]
      .map((p) => p?.replace(/\D/g, "") || null)
      .filter(Boolean) as string[];
    const name = data.name?.trim().toLowerCase();

    const rows = await col.list(ctx, (c) => c.id !== excludeId);
    return (
      rows.find((c) => {
        const cDoc = c.document?.replace(/\D/g, "") || null;
        const cPhones = [c.phone, c.whatsapp].map((p) => p?.replace(/\D/g, "") || null).filter(Boolean) as string[];
        // Same document (strongest signal).
        if (doc && cDoc && doc === cDoc) return true;
        // Same phone or whatsapp.
        if (phones.length && cPhones.some((cp) => phones.includes(cp))) return true;
        // Same name + same phone (when there's no document to compare).
        if (name && c.name.trim().toLowerCase() === name && phones.length && cPhones.some((cp) => phones.includes(cp))) {
          return true;
        }
        return false;
      }) ?? null
    );
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
