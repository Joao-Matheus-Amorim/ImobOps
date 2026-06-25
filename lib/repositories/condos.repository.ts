import type {
  Condo,
  Unit,
  CondoFee,
  CondoExpense,
  CondoMeeting,
} from "@/lib/types/domain";
import { MockCollection, type RepoContext } from "./base";
import { round2 } from "@/lib/utils";

const condos = new MockCollection<Condo>("condos");
const units = new MockCollection<Unit>("units");
const fees = new MockCollection<CondoFee>("condoFees");
const expenses = new MockCollection<CondoExpense>("condoExpenses");
const meetings = new MockCollection<CondoMeeting>("condoMeetings");

export const condosRepository = {
  list(ctx: RepoContext): Condo[] {
    return condos.list(ctx).sort((a, b) => a.name.localeCompare(b.name));
  },

  get(ctx: RepoContext, id: string): Condo | null {
    return condos.find(ctx, id);
  },

  create(ctx: RepoContext, data: Omit<Condo, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">): Condo {
    return condos.create(ctx, data);
  },

  // --- Units ---

  listUnits(ctx: RepoContext, condoId: string): Unit[] {
    return units.list(ctx, (u) => u.condoId === condoId).sort((a, b) => a.label.localeCompare(b.label));
  },

  addUnit(ctx: RepoContext, data: Omit<Unit, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">): Unit {
    return units.create(ctx, data);
  },

  getUnit(ctx: RepoContext, id: string): Unit | null {
    return units.find(ctx, id);
  },

  // --- Fees ---

  listFees(ctx: RepoContext, condoId?: string): CondoFee[] {
    const unitIds = condoId
      ? new Set(this.listUnits(ctx, condoId).map((u) => u.id))
      : null;
    return fees
      .list(ctx, (f) => (unitIds ? unitIds.has(f.unitId) : true))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },

  generateFees(ctx: RepoContext, condoId: string, referenceMonth: string, dueDate: string, amount: number): CondoFee[] {
    const us = this.listUnits(ctx, condoId);
    const existing = new Set(
      fees.list(ctx, (f) => f.referenceMonth === referenceMonth).map((f) => f.unitId),
    );
    for (const u of us) {
      if (existing.has(u.id)) continue;
      fees.create(ctx, {
        unitId: u.id,
        referenceMonth,
        dueDate,
        amount: round2(amount),
        status: "a_vencer",
        paidAt: null,
        receiptDocumentId: null,
        chargeId: null,
      });
    }
    return this.listFees(ctx, condoId);
  },

  markFeePaid(ctx: RepoContext, id: string): CondoFee | null {
    return fees.update(ctx, id, { status: "pago", paidAt: new Date().toISOString() });
  },

  getFee(ctx: RepoContext, id: string): CondoFee | null {
    return fees.find(ctx, id);
  },

  // Link a fee to its active charge (1:1). Used by billing emission.
  setFeeCharge(ctx: RepoContext, feeId: string, chargeId: string | null): CondoFee | null {
    return fees.update(ctx, feeId, { chargeId });
  },

  // --- Expenses + apportionment ---

  listExpenses(ctx: RepoContext, condoId: string): CondoExpense[] {
    return expenses.list(ctx, (e) => e.condoId === condoId);
  },

  registerExpense(ctx: RepoContext, data: Omit<CondoExpense, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">): CondoExpense {
    return expenses.create(ctx, data);
  },

  // Apportion an expense across units, returning the per-unit charge.
  apportionExpense(ctx: RepoContext, expenseId: string): { unitId: string; label: string; amount: number }[] {
    const exp = expenses.find(ctx, expenseId);
    if (!exp) return [];
    const us = this.listUnits(ctx, exp.condoId);
    let result: { unitId: string; label: string; amount: number }[];
    if (exp.apportionment === "igual") {
      const share = round2(exp.totalAmount / Math.max(1, us.length));
      result = us.map((u) => ({ unitId: u.id, label: u.label, amount: share }));
    } else {
      const totalFraction = us.reduce((s, u) => s + u.fractionPct, 0) || 1;
      result = us.map((u) => ({
        unitId: u.id,
        label: u.label,
        amount: round2((exp.totalAmount * u.fractionPct) / totalFraction),
      }));
    }
    expenses.update(ctx, expenseId, { status: "rateada" });
    return result;
  },

  // --- Meetings ---

  listMeetings(ctx: RepoContext, condoId?: string): CondoMeeting[] {
    return meetings
      .list(ctx, (m) => (condoId ? m.condoId === condoId : true))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  upcomingMeetings(ctx: RepoContext): CondoMeeting[] {
    const today = new Date().toISOString().slice(0, 10);
    return this.listMeetings(ctx).filter((m) => m.date >= today);
  },
};
