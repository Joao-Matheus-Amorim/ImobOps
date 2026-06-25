// Integration-ish test over the mock store: the critical billing guarantees are
// (1) emission is idempotent per installment and (2) reconciliation is idempotent
// and cascades to installment payment + repasse. Uses the demo seed.

import { describe, it, expect } from "vitest";
import { billingRepository } from "./billing.repository";
import { rentalsRepository } from "./rentals.repository";
import { financeRepository } from "./finance.repository";
import { condosRepository } from "./condos.repository";
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

describe("billingRepository standalone (avulsa)", () => {
  it("emits a charge addressed to a client", async () => {
    const charge = await billingRepository.emitStandalone(ctx, {
      clientId: "client-00000002",
      amount: 500,
      dueDate: "2026-07-10",
      method: "boleto",
      description: "Taxa de contrato",
    });
    expect(charge?.sourceType).toBe("avulsa");
    expect(charge?.clientId).toBe("client-00000002");
    expect(charge?.amount).toBe(500);
  });

  it("does not create a repasse when an avulsa charge is paid", async () => {
    const charge = await billingRepository.emitStandalone(ctx, {
      clientId: "client-00000002",
      amount: 333,
      dueDate: "2026-08-10",
      method: "pix",
    });
    const before = financeRepository.listRepasses(ctx).length;
    billingRepository.reconcileByExternalId(
      ctx,
      charge!.externalId!,
      333,
      "2026-08-11T10:00:00.000Z",
    );
    const after = financeRepository.listRepasses(ctx).length;
    expect(after).toBe(before);
  });

  it("returns null for an unknown client", async () => {
    const charge = await billingRepository.emitStandalone(ctx, {
      clientId: "client-does-not-exist",
      amount: 100,
      dueDate: "2026-07-10",
      method: "pix",
    });
    expect(charge).toBeNull();
  });
});

describe("billingRepository condo fee", () => {
  it("emits a charge for a condo fee without creating a repasse", async () => {
    const fee = condosRepository
      .listFees(ctx)
      .find((f) => f.status !== "pago");
    expect(fee).toBeTruthy();

    const charge = await billingRepository.emitForCondoFee(ctx, fee!.id, "boleto");
    expect(charge?.sourceType).toBe("condo_fee");

    const before = financeRepository.listRepasses(ctx).length;
    const paid = billingRepository.reconcileByExternalId(
      ctx,
      charge!.externalId!,
      fee!.amount,
      "2026-06-12T10:00:00.000Z",
    );
    expect(paid?.status).toBe("paga");

    const reloadedFee = condosRepository.getFee(ctx, fee!.id);
    expect(reloadedFee?.status).toBe("pago");
    expect(financeRepository.listRepasses(ctx).length).toBe(before);
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
