// Pure, testable business logic for rental installments and repasses.
// No I/O — used by both mock-data seeding and the repositories.

import type { Installment, RentalContract, Repasse } from "@/lib/types/domain";
import { clampDueDay, round2, deterministicId } from "@/lib/utils";

// Add `offset` months to a (year, month1based) pair. Pure integer math — no Date,
// so it is timezone-independent.
function shiftMonth(year: number, month1: number, offset: number): { year: number; month1: number } {
  const zero = (year * 12 + (month1 - 1)) + offset;
  return { year: Math.floor(zero / 12), month1: (zero % 12) + 1 };
}

// Build the YYYY-MM reference for a given month offset from the contract start.
function refMonth(startYear: number, startMonth1: number, offset: number): string {
  const { year, month1 } = shiftMonth(startYear, startMonth1, offset);
  return `${year}-${String(month1).padStart(2, "0")}`;
}

// Compute the due date (ISO yyyy-mm-dd) for a reference month + due day.
function dueDate(startYear: number, startMonth1: number, offset: number, dueDay: number): string {
  const { year, month1 } = shiftMonth(startYear, startMonth1, offset);
  const day = clampDueDay(dueDay);
  return `${year}-${String(month1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Generate `durationMonths` installments for a contract. All start as "a_vencer".
export function generateInstallments(
  contract: RentalContract,
  tenancyId: string,
  createdBy: string | null,
): Installment[] {
  const [startYear, startMonth1] = contract.startDate.split("-").map(Number);
  const out: Installment[] = [];
  for (let i = 0; i < contract.durationMonths; i++) {
    out.push({
      id: deterministicId(`installment-${contract.id}`, i + 1),
      tenancyId,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      createdBy,
      contractId: contract.id,
      referenceMonth: refMonth(startYear, startMonth1, i),
      dueDate: dueDate(startYear, startMonth1, i, contract.dueDay),
      amount: round2(contract.monthlyValue),
      status: "a_vencer",
      paidAt: null,
      paidAmount: null,
      receiptDocumentId: null,
      boletoDocumentId: null,
      notes: null,
    });
  }
  return out;
}

// Result of a repasse computation (landlord payout net of admin fee).
export interface RepasseComputation {
  grossAmount: number;
  adminFeeAmount: number;
  netAmount: number;
}

// Compute the repasse for a single paid month.
export function computeRepasse(
  grossAmount: number,
  adminFeePct: number,
): RepasseComputation {
  const gross = round2(grossAmount);
  const fee = round2(gross * (adminFeePct / 100));
  const net = round2(gross - fee);
  return { grossAmount: gross, adminFeeAmount: fee, netAmount: net };
}

// Build a Repasse record for a contract + paid installment.
export function buildRepasse(
  contract: RentalContract,
  installment: Installment,
  tenancyId: string,
  createdBy: string | null,
): Repasse {
  const c = computeRepasse(
    installment.paidAmount ?? installment.amount,
    contract.adminFeePct,
  );
  return {
    id: deterministicId(`repasse-${contract.id}`, Number(installment.referenceMonth.replace("-", "")) % 100000),
    tenancyId,
    createdAt: installment.createdAt,
    updatedAt: installment.updatedAt,
    createdBy,
    contractId: contract.id,
    referenceMonth: installment.referenceMonth,
    grossAmount: c.grossAmount,
    adminFeeAmount: c.adminFeeAmount,
    netAmount: c.netAmount,
    status: "pendente",
    paidAt: null,
    receiptDocumentId: null,
  };
}
