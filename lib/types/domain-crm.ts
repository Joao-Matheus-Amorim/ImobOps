// CRM domain types

import { BaseEntity } from "./domain-base";

export type LeadSource = "whatsapp" | "site" | "indicacao" | "outros";
export type LeadInterest = "locacao" | "venda" | "condominio" | "outro";

export type FunnelStage =
  | "novo"
  | "qualificado"
  | "visita_agendada"
  | "proposta"
  | "fechado_ganho"
  | "fechado_perdido";

export const FUNNEL_STAGE_LABELS: Record<FunnelStage, string> = {
  novo: "Novo",
  qualificado: "Qualificado",
  visita_agendada: "Visita agendada",
  proposta: "Proposta",
  fechado_ganho: "Ganho",
  fechado_perdido: "Perdido",
};

export const FUNNEL_ORDER: FunnelStage[] = [
  "novo",
  "qualificado",
  "visita_agendada",
  "proposta",
  "fechado_ganho",
  "fechado_perdido",
];

export interface CrmLead extends BaseEntity {
  clientId: string | null;
  source: LeadSource;
  interest: LeadInterest;
  assignedToUserId: string | null;
  funnelStage: FunnelStage;
  lostReason: string | null;
}

export type ActivityKind =
  | "ligacao"
  | "visita"
  | "whatsapp"
  | "email"
  | "proposta"
  | "nota";

export interface CrmActivity extends BaseEntity {
  leadId: string;
  kind: ActivityKind;
  description: string | null;
  scheduledAt: string | null;
  doneAt: string | null;
  byUserId: string | null;
}
