// Rental domain types: RentalContract, Installment, etc.

import { BaseEntity } from "./domain-base";

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
  lateFeePct: number;
  lateInterestPctMonth: number;
  status: RentalStatus;
}

// Default de encargos quando o contrato não especifica.
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
  boletoDocumentId: string | null;
  chargeId: string | null;
  notes: string | null;
}
