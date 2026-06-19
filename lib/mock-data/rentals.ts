import type { Installment, RentalContract } from "@/lib/types/domain";
import { DEMO_TENANCY_ID, DEMO_USERS } from "@/lib/constants";
import { generateInstallments } from "@/lib/repositories/installment-logic";

const now = "2026-06-01T12:00:00.000Z";

export const DEMO_RENTAL_CONTRACT_ID = "rental-00000001";

export const mockRentalContracts: RentalContract[] = [
  {
    id: DEMO_RENTAL_CONTRACT_ID,
    tenancyId: DEMO_TENANCY_ID,
    createdAt: now,
    updatedAt: now,
    createdBy: DEMO_USERS.admin,
    propertyId: "property-00000001",
    landlordClientId: "client-00000001",
    tenantClientId: "client-00000002",
    guarantorClientId: "client-00000003",
    monthlyValue: 2800,
    dueDay: 10,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    durationMonths: 12,
    indexType: "igpm",
    adminFeePct: 8,
    status: "ativo",
  },
];

// 12 installments generated deterministically; mark the early months as paid and
// one as overdue so finance/dashboard views have realistic data on 2026-06.
export const mockInstallments: Installment[] = generateInstallments(
  mockRentalContracts[0],
  DEMO_TENANCY_ID,
  DEMO_USERS.admin,
).map((inst, idx) => {
  // Jan..Apr paid, May overdue, Jun+ a_vencer (relative to demo "today" 2026-06).
  if (idx <= 3) {
    return {
      ...inst,
      status: "pago" as const,
      paidAt: `${inst.referenceMonth}-09T10:00:00.000Z`,
      paidAmount: inst.amount,
    };
  }
  if (idx === 4) {
    return { ...inst, status: "atrasado" as const };
  }
  return inst;
});
