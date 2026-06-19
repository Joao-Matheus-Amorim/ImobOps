import { describe, it, expect } from "vitest";
import { generateInstallments, computeRepasse, buildRepasse } from "./installment-logic";
import type { RentalContract } from "@/lib/types/domain";

const contract: RentalContract = {
  id: "rental-test",
  tenancyId: "t1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  createdBy: "u1",
  propertyId: "p1",
  landlordClientId: "c1",
  tenantClientId: "c2",
  guarantorClientId: null,
  monthlyValue: 3000,
  dueDay: 10,
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  durationMonths: 12,
  indexType: "igpm",
  adminFeePct: 10,
  status: "ativo",
};

describe("generateInstallments", () => {
  it("creates one installment per month", () => {
    const xs = generateInstallments(contract, "t1", "u1");
    expect(xs).toHaveLength(12);
  });

  it("first reference month matches start, last is 11 months later", () => {
    const xs = generateInstallments(contract, "t1", "u1");
    expect(xs[0].referenceMonth).toBe("2026-01");
    expect(xs[11].referenceMonth).toBe("2026-12");
  });

  it("uses the contract due day, clamped to 1..28", () => {
    const xs = generateInstallments({ ...contract, dueDay: 31 }, "t1", "u1");
    expect(xs[0].dueDate).toBe("2026-01-28");
    const ys = generateInstallments({ ...contract, dueDay: 5 }, "t1", "u1");
    expect(ys[0].dueDate).toBe("2026-01-05");
  });

  it("amount equals monthly value and all start a_vencer", () => {
    const xs = generateInstallments(contract, "t1", "u1");
    expect(xs.every((x) => x.amount === 3000)).toBe(true);
    expect(xs.every((x) => x.status === "a_vencer")).toBe(true);
  });

  it("produces stable, unique ids", () => {
    const xs = generateInstallments(contract, "t1", "u1");
    const ids = new Set(xs.map((x) => x.id));
    expect(ids.size).toBe(12);
    expect(xs[0].id).toBe("installment-rental-test-00000001");
  });
});

describe("computeRepasse", () => {
  it("subtracts the admin fee from gross", () => {
    expect(computeRepasse(3000, 10)).toEqual({
      grossAmount: 3000,
      adminFeeAmount: 300,
      netAmount: 2700,
    });
  });

  it("rounds to 2 decimals", () => {
    const r = computeRepasse(2833.33, 8);
    expect(r.adminFeeAmount).toBe(226.67);
    expect(r.netAmount).toBe(2606.66);
    expect(r.grossAmount).toBe(2833.33);
  });

  it("zero fee returns full gross", () => {
    expect(computeRepasse(1500, 0).netAmount).toBe(1500);
  });
});

describe("buildRepasse", () => {
  it("derives gross from paidAmount when present", () => {
    const inst = generateInstallments(contract, "t1", "u1")[0];
    const paid = { ...inst, paidAmount: 3000, status: "pago" as const };
    const r = buildRepasse(contract, paid, "t1", "u1");
    expect(r.grossAmount).toBe(3000);
    expect(r.adminFeeAmount).toBe(300);
    expect(r.netAmount).toBe(2700);
    expect(r.status).toBe("pendente");
  });
});
