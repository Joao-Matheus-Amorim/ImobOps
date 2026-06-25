import type { Charge, ChargeReminder } from "@/lib/types/domain";
import { DEMO_TENANCY_ID, DEMO_USERS } from "@/lib/constants";
import { mockInstallments } from "./rentals";
import { deterministicId } from "@/lib/utils";

// Seed one open charge for the first not-yet-paid installment so the finance UI
// has a realistic boleto/PIX to show in mock mode. Paid installments don't need a
// live charge; overdue ones illustrate the "vencida" read-time status.
const target = mockInstallments.find(
  (i) => i.status === "a_vencer" || i.status === "atrasado",
);

export const mockCharges: Charge[] = target
  ? [
      {
        id: deterministicId("charge", 1),
        tenancyId: DEMO_TENANCY_ID,
        createdAt: `${target.referenceMonth}-01T09:00:00.000Z`,
        updatedAt: `${target.referenceMonth}-01T09:00:00.000Z`,
        createdBy: DEMO_USERS.finance,
        sourceType: "installment",
        sourceId: target.id,
        clientId: null,
        description: null,
        customerName: null,
        method: "boleto",
        amount: target.amount,
        dueDate: target.dueDate,
        status: "pendente",
        provider: "mock",
        externalId: `mock_chg_${target.id}`,
        boletoUrl: `https://mock.billing.local/boleto/mock_chg_${target.id}.pdf`,
        pixPayload: null,
        paidAt: null,
        paidAmount: null,
      },
    ]
  : [];

// Link the seeded charge back to its installment so the 1:1 relationship holds.
if (target && mockCharges[0]) {
  target.chargeId = mockCharges[0].id;
}

export const mockChargeReminders: ChargeReminder[] = [];
