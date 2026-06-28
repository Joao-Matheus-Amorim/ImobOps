// Core domain types: Tenancy, User, Client, Property, EntityType, Documents

import type { Role } from "./permissions";
import { BaseEntity } from "./domain-base";

export type TenancyPlan = "single" | "saas_starter" | "saas_pro";

export interface Tenancy extends BaseEntity {
  id: string;
  name: string;
  slug: string;
  plan: TenancyPlan;
  createdAt: string;
}

export interface User extends BaseEntity {
  authUserId: string | null;
  role: Role;
  displayName: string;
  avatarUrl: string | null;
  phone: string | null;
  email: string;
  active: boolean;
}

export type ClientKind = "pf" | "pj";

export type BusinessRole =
  | "locador"
  | "locatario"
  | "fiador"
  | "comprador"
  | "vendedor"
  | "lead"
  | "proprietario_condomino";

export const BUSINESS_ROLE_LABELS: Record<BusinessRole, string> = {
  locador: "Locador",
  locatario: "Locatário",
  fiador: "Fiador",
  comprador: "Comprador",
  vendedor: "Vendedor",
  lead: "Lead",
  proprietario_condomino: "Proprietário/Condômino",
};

export interface Client extends BaseEntity {
  kind: ClientKind;
  name: string;
  document: string | null; // cpf/cnpj
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  tags: string[];
  rolesInBusiness: BusinessRole[];
  ownerUserId: string | null;
}

export type PropertyKind =
  | "apartamento"
  | "casa"
  | "comercial"
  | "terreno"
  | "sala";

export type PropertyStatus =
  | "disponivel"
  | "alugado"
  | "vendido"
  | "em_obra"
  | "inativo";

export type PropertyAvailability =
  | "locacao"
  | "venda"
  | "ambos"
  | "condominio_only";

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  disponivel: "Disponível",
  alugado: "Alugado",
  vendido: "Vendido",
  em_obra: "Em obra",
  inativo: "Inativo",
};

export interface Property extends BaseEntity {
  kind: PropertyKind;
  address: string;
  areaM2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpots: number | null;
  ownerClientId: string | null;
  status: PropertyStatus;
  availability: PropertyAvailability;
  condoId: string | null;
  photos: string[];
  description: string | null;
  ownerUserId: string | null;
}

export type EntityType =
  | "client"
  | "property"
  | "rental_contract"
  | "installment"
  | "sale_contract"
  | "charge"
  | "condo"
  | "unit"
  | "condo_meeting"
  | "lead"
  | "whatsapp_conversation";

export type DocumentKind =
  | "contrato"
  | "boleto"
  | "comprovante"
  | "rg"
  | "cpf"
  | "cnpj"
  | "comprovante_endereco"
  | "matricula"
  | "iptu"
  | "escritura"
  | "laudo"
  | "vistoria"
  | "ata"
  | "proposta"
  | "certidao"
  | "recibo"
  | "nota_fiscal"
  | "outro";

export type DocumentStatus = "pendente" | "validado" | "rejeitado" | "vencido";

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  contrato: "Contrato",
  boleto: "Boleto",
  comprovante: "Comprovante",
  rg: "RG",
  cpf: "CPF",
  cnpj: "CNPJ",
  comprovante_endereco: "Comprovante de endereço",
  matricula: "Matrícula",
  iptu: "IPTU",
  escritura: "Escritura",
  laudo: "Laudo",
  vistoria: "Vistoria",
  ata: "Ata",
  proposta: "Proposta",
  certidao: "Certidão",
  recibo: "Recibo",
  nota_fiscal: "Nota fiscal",
  outro: "Outro",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  pendente: "Pendente",
  validado: "Validado",
  rejeitado: "Rejeitado",
  vencido: "Vencido",
};

export interface DocumentRecord extends BaseEntity {
  entityType: EntityType;
  entityId: string;
  kind: DocumentKind;
  title: string;
  description: string | null;
  fileName: string;
  storagePath: string;
  mime: string;
  size: number;
  status: DocumentStatus;
  expiresAt: string | null;
  uploadedBy: string | null;
  validatedBy: string | null;
  validatedAt: string | null;
  rejectedReason: string | null;
}
