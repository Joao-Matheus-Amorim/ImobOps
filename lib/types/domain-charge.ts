// Charge (cobrança) domain types

import { BaseEntity } from "./domain-base";

export type ChargeMethod = "boleto" | "pix" | "cartao";

export type ChargeStatus =
  | "pendente"
  | "paga"
  | "vencida"
  | "cancelada"
  | "falha";

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

export type ChargeSourceType = "installment" | "condo_fee" | "avulsa";

export type BillingProvider = "asaas" | "mock";

export interface Charge extends BaseEntity {
  sourceType: ChargeSourceType;
  sourceId: string; // installment.id | client.id
  clientId: string | null;
  description: string | null;
  customerName: string | null;
  method: ChargeMethod;
  amount: number;
  dueDate: string; // yyyy-mm-dd
  status: ChargeStatus;
  provider: BillingProvider;
  externalId: string | null;
  boletoUrl: string | null;
  pixPayload: string | null;
  paidAt: string | null;
  paidAmount: number | null;
}

export type ReminderTrigger =
  | "pre_vencimento"
  | "vencimento"
  | "atraso_1"
  | "atraso_2";

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
