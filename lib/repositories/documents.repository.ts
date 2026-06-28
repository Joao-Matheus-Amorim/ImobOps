import type { DocumentRecord, DocumentStatus, EntityType } from "@/lib/types/domain";
import { type RepoContext } from "./base";
import { Collection } from "./collection";

const documents = new Collection<DocumentRecord>("documents", "documents");

export const documentsRepository = {
  async listForEntity(
    ctx: RepoContext,
    entityType: EntityType,
    entityId: string,
  ): Promise<DocumentRecord[]> {
    const rows = await documents.list(ctx, undefined, {
      eq: { entityType, entityId },
      orderBy: { column: "createdAt", ascending: false },
    });
    return rows;
  },

  async list(ctx: RepoContext): Promise<DocumentRecord[]> {
    return documents.list(ctx, undefined, {
      orderBy: { column: "createdAt", ascending: false },
    });
  },

  get(ctx: RepoContext, id: string): Promise<DocumentRecord | null> {
    return documents.find(ctx, id);
  },

  create(
    ctx: RepoContext,
    data: Omit<DocumentRecord, "tenancyId" | "createdAt" | "updatedAt" | "createdBy">,
  ): Promise<DocumentRecord> {
    return documents.create(ctx, data);
  },

  updateStatus(
    ctx: RepoContext,
    id: string,
    patch: {
      status: DocumentStatus;
      validatedBy?: string | null;
      validatedAt?: string | null;
      rejectedReason?: string | null;
    },
  ): Promise<DocumentRecord | null> {
    return documents.update(ctx, id, patch);
  },

  remove(ctx: RepoContext, id: string): Promise<boolean> {
    return documents.remove(ctx, id);
  },
};
