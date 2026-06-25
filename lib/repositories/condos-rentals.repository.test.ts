import { describe, expect, it } from "vitest";
import { DEMO_TENANCY_ID, DEMO_USERS } from "@/lib/constants";
import { condosRepository } from "./condos.repository";
import { rentalsRepository } from "./rentals.repository";

const ctx = { tenancyId: DEMO_TENANCY_ID, userId: DEMO_USERS.admin };

function suffix() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

describe("condosRepository", () => {
  it("updates condo data and generates one fee per unit idempotently", async () => {
    const tag = suffix();
    const condo = await condosRepository.create(ctx, {
      name: `Condomínio Teste ${tag}`,
      address: "Rua do Condomínio, 10",
      unitCount: 2,
      managerUserId: DEMO_USERS.admin,
      adminFeePct: 5,
    });

    await condosRepository.addUnit(ctx, {
      condoId: condo.id,
      label: "A-101",
      ownerClientId: "client-00000001",
      currentResidentClientId: "client-00000002",
      areaM2: 60,
      fractionPct: 40,
    });
    await condosRepository.addUnit(ctx, {
      condoId: condo.id,
      label: "A-102",
      ownerClientId: "client-00000003",
      currentResidentClientId: null,
      areaM2: 90,
      fractionPct: 60,
    });

    await expect(condosRepository.update(ctx, condo.id, { adminFeePct: 7 })).resolves.toMatchObject({
      adminFeePct: 7,
    });

    const first = await condosRepository.generateFees(ctx, condo.id, "2026-10", "2026-10-10", 701.236);
    const second = await condosRepository.generateFees(ctx, condo.id, "2026-10", "2026-10-10", 999);

    expect(first).toHaveLength(2);
    expect(second).toHaveLength(2);
    expect(second.map((fee) => fee.amount)).toEqual([701.24, 701.24]);
  });

  it("counts overdue fees by condo and apportions expenses", async () => {
    const counts = await condosRepository.overdueFeeCountByCondo(ctx);
    expect(counts.get("condo-00000001")).toBeGreaterThanOrEqual(1);

    const expense = await condosRepository.registerExpense(ctx, {
      condoId: "condo-00000001",
      referenceMonth: "2026-09",
      description: "Teste rateio igual",
      totalAmount: 1000,
      apportionment: "igual",
      status: "lancada",
    });

    const shares = await condosRepository.apportionExpense(ctx, expense.id);
    expect(shares).toHaveLength(4);
    expect(shares.every((share) => share.amount === 250)).toBe(true);

    const reloaded = (await condosRepository.listExpenses(ctx, "condo-00000001")).find(
      (item) => item.id === expense.id,
    );
    expect(reloaded?.status).toBe("rateada");
  });
});

describe("rentalsRepository", () => {
  it("creates a rental contract and generates installments idempotently", async () => {
    const tag = suffix();
    const contract = await rentalsRepository.create(ctx, {
      propertyId: "property-00000002",
      landlordClientId: "client-00000001",
      tenantClientId: "client-00000002",
      guarantorClientId: null,
      monthlyValue: 3100,
      dueDay: 5,
      startDate: "2026-08-01",
      endDate: "2026-10-31",
      durationMonths: 3,
      indexType: "ipca",
      adminFeePct: 8,
      lateFeePct: 2,
      lateInterestPctMonth: 1,
      status: "ativo",
    });

    await rentalsRepository.update(ctx, contract.id, { status: "em_renovacao" });
    await expect(rentalsRepository.get(ctx, contract.id)).resolves.toMatchObject({
      status: "em_renovacao",
      propertyId: "property-00000002",
    });

    const first = await rentalsRepository.generateInstallments(ctx, contract.id);
    const second = await rentalsRepository.generateInstallments(ctx, contract.id);
    expect(first.map((i) => i.referenceMonth)).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(second.map((i) => i.referenceMonth)).toEqual(first.map((i) => i.referenceMonth));

    const paid = await rentalsRepository.markInstallmentPaid(ctx, first[0]!.id, 3100, `receipt-${tag}`);
    expect(paid).toMatchObject({
      status: "pago",
      paidAmount: 3100,
      receiptDocumentId: `receipt-${tag}`,
    });

    await expect(rentalsRepository.setInstallmentCharge(ctx, first[1]!.id, `charge-${tag}`)).resolves.toMatchObject({
      chargeId: `charge-${tag}`,
    });
  });

  it("lists overdue installments sorted by due date", async () => {
    const overdue = await rentalsRepository.listOverdue(ctx);
    expect(overdue.length).toBeGreaterThan(0);
    expect(overdue.every((item) => item.status === "atrasado")).toBe(true);
    expect(overdue.map((item) => item.dueDate)).toEqual(
      [...overdue].map((item) => item.dueDate).sort(),
    );
  });
});
