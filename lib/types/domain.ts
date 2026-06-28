// Full domain model for ImobOps. Mirrors database/migrations/001_core_schema.sql.
// Every entity carries tenancy_id (multi-tenant from day 1) plus audit columns.

import type { Role } from "./permissions";

// --- Shared base ---------------------------------------------------------

export interface BaseEntity {
  id: string;
  tenancyId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

// --- Core ----------------------------------------------------------------

export type TenancyPlan = "single" | "saas_starter" | "saas_pro";

export interface Tenancy {
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
  // Scope ownership — the broker/user who owns the client (own/team scope).
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

// --- Rental --------------------------------------------------------------

export type IndexType = "igpm" | "ipca" | "none";

export type RentalStatus =
  | "ativo"
  | "encerrado"
  | "inadimplente"
  | "em_renovacao";

export const RENTAL_STATUS_LABELS: Record<RentalStatus, string> = {
  ativo: "Ativo",
  encerrado: "Encerrado",
  inadimplente: "Inadimplente",
  em_renovacao: "Em renovação",
};

export interface RentalContract extends BaseEntity {
  propertyId: string;
  landlordClientId: string;
  tenantClientId: string;
  guarantorClientId: string | null;
  monthlyValue: number;
  dueDay: number; // 1-28
  startDate: string;
  endDate: string;
  durationMonths: number;
  indexType: IndexType;
  adminFeePct: number;
  // Encargos de atraso (configuráveis por contrato). Padrão de mercado BR:
  // 2% de multa fixa + 1% a.m. de juros, calculados pro rata por dia de atraso.
  lateFeePct: number; // multa fixa sobre o valor (ex.: 2)
  lateInterestPctMonth: number; // juros ao mês (ex.: 1), aplicado pro rata/dia
  status: RentalStatus;
}

// Default de encargos quando o contrato não especifica (retrocompat de seed/mock).
export const DEFAULT_LATE_FEE_PCT = 2;
export const DEFAULT_LATE_INTEREST_PCT_MONTH = 1;

export type InstallmentStatus = "a_vencer" | "pago" | "atrasado" | "cancelado";

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  a_vencer: "A vencer",
  pago: "Pago",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

export interface Installment extends BaseEntity {
  contractId: string;
  referenceMonth: string; // YYYY-MM
  dueDate: string;
  amount: number;
  status: InstallmentStatus;
  paidAt: string | null;
  paidAmount: number | null;
  receiptDocumentId: string | null;
  boletoDocumentId: string | null; // legacy: PDF avulso enviado manualmente
  chargeId: string | null; // cobrança ativa (boleto/PIX via gateway)
  notes: string | null;
}

// --- Charge (cobrança via gateway: boleto registrado / PIX) ---------------

export type ChargeMethod = "boleto" | "pix" | "cartao";

export type ChargeStatus =
  | "pendente" // criada, aguardando pagamento
  | "paga" // confirmada (webhook ou baixa manual)
  | "vencida" // due_date < hoje e ainda não paga
  | "cancelada" // estornada/cancelada
  | "falha"; // erro na emissão

export const CHARGE_STATUS_LABELS: Record<ChargeStatus, string> = {
  pendente: "Pendente",
  paga: "Paga",
  vencida: "Vencida",
  cancelada: "Cancelada",
  falha: "Falha",
};

export const CHARGE_METHOD_LABELS: Record<ChargeMethod, string> = {
  boleto: "Boleto",
  pix: "PIX",
  cartao: "Cartão",
};

// Origem da cobrança: parcela de locação (gera repasse ao proprietário), taxa de
// condomínio (sem repasse) ou avulsa destinada a um cliente (receita direta).
export type ChargeSourceType = "installment" | "condo_fee" | "avulsa";

export type BillingProvider = "asaas" | "mock";

export interface Charge extends BaseEntity {
  sourceType: ChargeSourceType;
  sourceId: string; // installment.id (installment) | client.id (avulsa)
  clientId: string | null; // destinatário (sempre preenchido em avulsa)
  description: string | null; // descrição livre (avulsa)
  customerName: string | null; // nome para exibição sem buscar o cliente
  method: ChargeMethod;
  amount: number;
  dueDate: string; // yyyy-mm-dd
  status: ChargeStatus;
  provider: BillingProvider;
  externalId: string | null; // id da cobrança no gateway
  boletoUrl: string | null; // PDF / linha digitável
  pixPayload: string | null; // copia-e-cola / QR
  paidAt: string | null;
  paidAmount: number | null;
}

// Registro de lembrete enviado pela régua de cobrança (idempotência por
// parcela + gatilho, evitando reenvio no mesmo ciclo).
export type ReminderTrigger =
  | "pre_vencimento" // D-3
  | "vencimento" // D0
  | "atraso_1" // D+1
  | "atraso_2"; // D+5

export interface ChargeReminder extends BaseEntity {
  chargeId: string;
  trigger: ReminderTrigger;
  sentAt: string;
  channel: "whatsapp";
  templateKey: string;
}

export type RepasseStatus = "pendente" | "pago";

export interface Repasse extends BaseEntity {
  contractId: string;
  referenceMonth: string;
  grossAmount: number;
  adminFeeAmount: number;
  netAmount: number;
  status: RepasseStatus;
  paidAt: string | null;
  receiptDocumentId: string | null;
}

// --- Sale ----------------------------------------------------------------

export type ListingStatus = "ativa" | "sob_proposta" | "vendida" | "cancelada";

export interface SaleListing extends BaseEntity {
  propertyId: string;
  askingPrice: number;
  status: ListingStatus;
  commissionPct: number;
}

export type ProposalStatus =
  | "em_analise"
  | "contraproposta"
  | "aceita"
  | "recusada";

export interface ProposalRound {
  at: string;
  by: "buyer" | "seller";
  price: number;
  note: string | null;
}

export interface Proposal extends BaseEntity {
  listingId: string;
  buyerClientId: string;
  brokerUserId: string;
  offeredPrice: number;
  conditions: string | null;
  status: ProposalStatus;
  history: ProposalRound[];
}

export type SaleContractStatus = "em_andamento" | "fechado" | "cancelado";

export interface SaleContract extends BaseEntity {
  listingId: string;
  buyerClientId: string;
  sellerClientId: string;
  finalPrice: number;
  signedAt: string | null;
  paymentTerms: string | null;
  status: SaleContractStatus;
}

export type CommissionStatus = "pendente" | "paga";

export interface Commission extends BaseEntity {
  saleContractId: string;
  brokerUserId: string;
  pct: number;
  amount: number;
  status: CommissionStatus;
  paidAt: string | null;
}

// --- Condo ---------------------------------------------------------------

export interface Condo extends BaseEntity {
  name: string;
  address: string;
  unitCount: number;
  managerUserId: string | null;
  adminFeePct: number;
}

export interface Unit extends BaseEntity {
  condoId: string;
  label: string; // ex: "Bloco A — 302"
  ownerClientId: string | null;
  currentResidentClientId: string | null;
  areaM2: number | null;
  fractionPct: number; // fracao ideal
}

export type CondoFeeStatus = "a_vencer" | "pago" | "atrasado";

export interface CondoFee extends BaseEntity {
  unitId: string;
  referenceMonth: string;
  dueDate: string;
  amount: number;
  status: CondoFeeStatus;
  paidAt: string | null;
  receiptDocumentId: string | null;
  chargeId: string | null; // cobrança ativa (boleto/PIX via gateway)
}

export type Apportionment = "igual" | "fracao_ideal";

export type CondoExpenseStatus = "lancada" | "rateada" | "paga";

export interface CondoExpense extends BaseEntity {
  condoId: string;
  referenceMonth: string;
  description: string;
  totalAmount: number;
  apportionment: Apportionment;
  status: CondoExpenseStatus;
}

export type MeetingKind = "ordinaria" | "extraordinaria";

export interface CondoMeeting extends BaseEntity {
  condoId: string;
  date: string;
  kind: MeetingKind;
  summary: string | null;
  ataDocumentId: string | null;
}

// --- CRM -----------------------------------------------------------------

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

// --- WhatsApp ------------------------------------------------------------

export type ConversationStatus = "aberta" | "em_atendimento" | "encerrada";

export type TriageClassification =
  | "locacao"
  | "venda"
  | "condominio"
  | "financeiro"
  | "outro"
  | null;

export interface WhatsAppConversation extends BaseEntity {
  clientId: string | null;
  phone: string;
  contactName: string | null;
  lastMessageAt: string;
  assignedToUserId: string | null;
  status: ConversationStatus;
  triageClassification: TriageClassification;
}

export type MessageDirection = "in" | "out";
export type MessageSender = "user" | "system" | "ai" | "bot";

export interface WhatsAppMessage extends BaseEntity {
  conversationId: string;
  direction: MessageDirection;
  body: string;
  mediaUrl: string | null;
  templateKey: string | null;
  externalId: string | null;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  sentBy: MessageSender;
}

// Admin-editable quick-reply template. Body may contain {nome}/{telefone}
// placeholders resolved against the conversation's contact at send time.
export interface WhatsAppTemplate extends BaseEntity {
  title: string;
  body: string;
  active: boolean;
}

// --- Calendar ------------------------------------------------------------

export type CalendarTone = "meeting" | "task" | "payment" | "board" | "visit";

// A manual calendar event (created by a user or the AI). Operational events
// (visits, due dates, contracts, meetings) are aggregated at read time, not here.
export interface CalendarEvent extends BaseEntity {
  title: string;
  startsAt: string;
  endsAt: string | null;
  tone: CalendarTone;
  notes: string | null;
}

// --- Automation ----------------------------------------------------------

export type AutomationStatus = "active" | "paused";

export type AutomationTriggerKind =
  | "once"
  | "daily"
  | "weekly"
  | "monthly"
  | "interval_days"
  | "charge_due";

export type AutomationActionKind =
  | "create_client"
  | "update_client"
  | "create_property"
  | "update_property"
  | "create_rental_contract"
  | "update_rental_contract"
  | "create_charge_standalone"
  | "create_charge_and_send_whatsapp"
  | "create_charge_for_installment"
  | "create_charge_for_condo_fee"
  | "update_charge"
  | "mark_charge_paid"
  | "create_crm_lead"
  | "update_crm_lead"
  | "create_crm_activity"
  | "schedule_visit"
  | "create_sale_listing"
  | "update_sale_listing"
  | "create_sale_proposal"
  | "move_sale_proposal"
  | "create_sale_contract"
  | "create_condo"
  | "update_condo"
  | "create_condo_unit"
  | "generate_condo_fees"
  | "create_condo_expense"
  | "apportion_condo_expense"
  | "create_condo_meeting";

export interface AutomationTriggerConfig {
  kind: AutomationTriggerKind;
  localDate?: string | null; // yyyy-mm-dd, America/Sao_Paulo
  localTime: string; // HH:mm, America/Sao_Paulo
  weekDays?: number[]; // 0=domingo ... 6=sabado
  monthDays?: number[]; // 1..31
  intervalDays?: number | null;
  chargeOffsetDays?: number | null; // D-3=-3, D0=0, D+1=1
}

export interface AutomationActionConfig {
  kind: AutomationActionKind;
  targetId?: string | null;
  payload: Record<string, unknown>;
}

export interface AutomationRule extends BaseEntity {
  name: string;
  description: string | null;
  status: AutomationStatus;
  timezone: "America/Sao_Paulo";
  trigger: AutomationTriggerConfig;
  action: AutomationActionConfig;
  nextRunAt: string | null;
  lastRunAt: string | null;
}

export type AutomationRunStatus = "success" | "error" | "skipped";

export interface AutomationRun extends BaseEntity {
  ruleId: string;
  scheduledFor: string;
  startedAt: string;
  finishedAt: string | null;
  status: AutomationRunStatus;
  idempotencyKey: string;
  actionKind: AutomationActionKind;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
}

// --- Audit & AI ----------------------------------------------------------

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
