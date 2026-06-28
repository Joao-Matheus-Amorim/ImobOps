// Condo domain types

import { BaseEntity } from "./domain-base";

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
  chargeId: string | null;
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
