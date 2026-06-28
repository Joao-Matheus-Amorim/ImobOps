// Audit & AI domain types (standalone, do not extend BaseEntity)

export interface AuditLogEntry {
  id: string;
  tenancyId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  payloadBefore: Record<string, unknown> | null;
  payloadAfter: Record<string, unknown> | null;
  at: string;
}

export interface AiActionEntry {
  id: string;
  tenancyId: string;
  userId: string | null;
  prompt: string;
  toolName: string;
  toolParams: Record<string, unknown>;
  dryRun: boolean;
  confirmed: boolean;
  result: Record<string, unknown> | null;
  error: string | null;
  at: string;
}
