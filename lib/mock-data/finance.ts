import type { Repasse } from "@/lib/types/domain";
import { DEMO_TENANCY_ID, DEMO_USERS } from "@/lib/constants";
import { mockRentalContracts, mockInstallments } from "./rentals";
import { buildRepasse } from "@/lib/repositories/installment-logic";

// Repasses are derived from paid installments of the demo contract.
const contract = mockRentalContracts[0];

export const mockRepasses: Repasse[] = mockInstallments
  .filter((i) => i.status === "pago")
  .map((i) => {
    const r = buildRepasse(contract, i, DEMO_TENANCY_ID, DEMO_USERS.admin);
    // Mark the first two as already paid out to the landlord.
    const monthIdx = Number(i.referenceMonth.split("-")[1]);
    if (monthIdx <= 2) {
      return { ...r, status: "pago" as const, paidAt: `${i.referenceMonth}-15T10:00:00.000Z` };
    }
    return r;
  });
