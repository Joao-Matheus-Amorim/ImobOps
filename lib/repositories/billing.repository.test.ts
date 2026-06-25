// Integration-ish test over the mock store: the critical billing guarantees are
// (1) emission is idempotent per installment and (2) reconciliation is idempotent
// and cascades to installment payment + repasse. Uses the demo seed.

import { describe, it, expect } from "vitest";
import { billingRepository } from "./billing.repository";
import { rentalsRepository } from "./rentals.repository";
import { financeRepository } from "./finance.repository";
import { DEMO_TENANCY_ID, DEMO_USERS } from "@/lib/constants";

const ctx = { tenancyId: DEMO_TENANCY_ID, userId: DEMO_USERS.finance };

// Pick an installment that is not yet paid so we can drive a fresh charge.
function pickOpenInstallment() {
  return rentalsRepository
    .listInstallments(ctx)
    .find((i) => i.status === "a_vencer");
}

describe("billingRepository emission", () => {
  it("is idempotent: re-emitting returns the same active charge", async () => {
    const inst = pickOpenInstallment();
    expect(inst).toBeTruthy();
    const first = await billingRepository.emitForInstallment(ctx, inst!.id, "pix");
    const second = await billingRepository.emitForInstallment(ctx, inst!.id, "boleto");
    expect(first?.id).toBe(second?.id);
  });

  it("links the charge back to the installment", async () => {
    const inst = pickOpenInstallment();
    const charge = await billingRepository.emitForInstallment(ctx, inst!.id, "pix");
    const reloaded = rentalsRepository
      .listInstallments(ctx)
      .find((i) => i.id === inst!.id);
    expect(reloaded?.chargeId).toBe(charge?.id);
  });
});

describe("billingRepository reconciliation", () => {
  it("pays charge → installment paid → repasse pending, idempotently", async () => {
    const inst = pickOpenInstallment();
    const charge = await billingRepository.emitForInstallment(ctx, inst!.id, "boleto");
    expect(charge?.externalId).toBeTruthy();

    const paid = billingRepository.reconcileByExternalId(
      ctx,
      charge!.externalId!,
      inst!.amount,
      "2026-06-12T10:00:00.000Z",
    );
    expect(paid?.status).toBe("paga");

    const reloaded = rentalsRepository
      .listInstallments(ctx)
      .find((i) => i.id === inst!.id);
    expect(reloaded?.status).toBe("pago");

    const repasse = financeRepository
      .listRepasses(ctx)
      .find((r) => r.referenceMonth === inst!.referenceMonth);
    expect(repasse).toBeTruthy();

    // Idempotent: a second webhook for the same charge changes nothing.
    const again = billingRepository.reconcileByExternalId(
      ctx,
      charge!.externalId!,
      inst!.amount,
      "2026-06-13T10:00:00.000Z",
    );
    expect(again?.paidAt).toBe(paid?.paidAt);
  });
});
