import type { DocumentKind, EntityType } from "@/lib/types/domain";
import type { FeatureKey } from "@/lib/types/permissions";

export const DOCUMENT_BUCKET = "documents";

export const DOCUMENT_KINDS: DocumentKind[] = [
  "contrato",
  "boleto",
  "comprovante",
  "rg",
  "cpf",
  "cnpj",
  "comprovante_endereco",
  "matricula",
  "iptu",
  "escritura",
  "laudo",
  "vistoria",
  "ata",
  "proposta",
  "certidao",
  "recibo",
  "nota_fiscal",
  "outro",
];

export const ENTITY_FEATURE: Record<EntityType, FeatureKey> = {
  client: "clients",
  property: "properties",
  rental_contract: "rentals",
  installment: "rentals.installments",
  sale_contract: "sales",
  charge: "finance",
  condo: "condos",
  unit: "condos",
  condo_meeting: "condo_meetings",
  lead: "crm",
  whatsapp_conversation: "whatsapp",
};

export const ALLOWED_DOCUMENT_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const MAX_DOCUMENT_BYTES_BY_MIME: Record<string, number> = {
  "application/pdf": 25 * 1024 * 1024,
  "image/jpeg": 10 * 1024 * 1024,
  "image/png": 10 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 15 * 1024 * 1024,
};

export function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "documento";
}

export function documentStoragePath(input: {
  tenancyId: string;
  entityType: EntityType;
  entityId: string;
  documentId: string;
  fileName: string;
}): string {
  return [
    "tenancies",
    input.tenancyId,
    input.entityType,
    input.entityId,
    input.documentId,
    sanitizeFileName(input.fileName),
  ].join("/");
}
