// Append-only repositories for audit_log and ai_actions.
import { randomUUID } from "node:crypto";
import type { AuditLogEntry, AiActionEntry } from "@/lib/types/domain";
import { store } from "@/lib/mock-data";
import type { RepoContext } from "./base";

export const auditRepository = {
  log(
    ctx: RepoContext,
    entry: Omit<AuditLogEntry, "id" | "tenancyId" | "at">,
  ): AuditLogEntry {
    const row: AuditLogEntry = {
      id: randomUUID(),
      tenancyId: ctx.tenancyId,
      at: new Date().toISOString(),
      ...entry,
    };
    store.auditLog.push(row);
    return row;
  },

  list(ctx: RepoContext): AuditLogEntry[] {
    return store.auditLog
      .filter((e) => e.tenancyId === ctx.tenancyId)
      .sort((a, b) => b.at.localeCompare(a.at));
  },
};

export const aiActionsRepository = {
  record(
    ctx: RepoContext,
    entry: Omit<AiActionEntry, "id" | "tenancyId" | "at">,
  ): AiActionEntry {
    const row: AiActionEntry = {
      id: randomUUID(),
      tenancyId: ctx.tenancyId,
      at: new Date().toISOString(),
      ...entry,
    };
    store.aiActions.push(row);
    return row;
  },

  list(ctx: RepoContext): AiActionEntry[] {
    return store.aiActions
      .filter((e) => e.tenancyId === ctx.tenancyId)
      .sort((a, b) => b.at.localeCompare(a.at));
  },
};
