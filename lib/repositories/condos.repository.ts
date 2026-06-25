import type {
  Condo,
  Unit,
  CondoFee,
  CondoExpense,
  CondoMeeting,
} from "@/lib/types/domain";
import { type RepoContext } from "./base";
import { Collection } from "./collection";
import { round2 } from "@/lib/utils";

const condos = new Collection<Condo>("condos", "condos");
const units = new Collection<Unit>("units", "units");
const fees = new Collection<CondoFee>("condoFees", "condo_fees");
const expenses = new Collection<CondoExpense>("condoExpenses", "condo_expenses");
const meetings = new Collection<CondoMeeting>("condoMeetings", "condo_meetings");

export const condosRepository = {
  async list(ctx: RepoContext): Promise<Condo[]> {
    const rows = await condos.list(ctx);
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  },

  get(ctx: RepoContext, id: string): Promise<Condo | null> {
    return condos.find(ctx, id);
  },

  create(
    ctx: RepoContext,
    data: Omit<Condo, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">,
  ): Promise<Condo> {
    return condos.create(ctx, data);
  },

  // --- Units ---

  async listUnits(ctx: RepoContext, condoId: string): Promise<Unit[]> {
    const rows = await units.list(ctx, (u) => u.condoId === condoId);
    return rows.sort((a, b) => a.label.localeCompare(b.label));
  },

  addUnit(
    ctx: RepoContext,
    data: Omit<Unit, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">,
  ): Promise<Unit> {
    return units.create(ctx, data);
  },

  getUnit(ctx: RepoContext, id: string): Promise<Unit | null> {
    return units.find(ctx, id);
  },

  // Count overdue fees per condo using two bulk queries (all units + all fees),
  // instead of one listFees() round-trip per condo (was N+1 on the listing page).
  async overdueFeeCountByCondo(ctx: RepoContext): Promise<Map<string, number>> {
    const allUnits = await units.list(ctx);
    const condoByUnit = new Map(allUnits.map((u) => [u.id, u.condoId]));
    const allFees = await fees.list(ctx, (f) => f.status === "atrasado");
    const counts = new Map<string, number>();
    for (const f of allFees) {
      const condoId = condoByUnit.get(f.unitId);
      if (!condoId) continue;
      counts.set(condoId, (counts.get(condoId) ?? 0) + 1);
    }
    return counts;
  },

  // --- Fees ---

  async listFees(ctx: RepoContext, condoId?: string): Promise<CondoFee[]> {
    if (condoId) {
      const unitIds = (await this.listUnits(ctx, condoId)).map((u) => u.id);
      if (unitIds.length === 0) return [];
      const rows = await fees.list(ctx, undefined, { in: { unitId: unitIds } });
      return rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }
    const rows = await fees.list(ctx);
    return rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },

  async generateFees(
    ctx: RepoContext,
    condoId: string,
    referenceMonth: string,
    dueDate: string,
    amount: number,
  ): Promise<CondoFee[]> {
    const us = await this.listUnits(ctx, condoId);
    const monthFees = await fees.list(ctx, (f) => f.referenceMonth === referenceMonth);
    const existing = new Set(monthFees.map((f) => f.unitId));
    for (const u of us) {
      if (existing.has(u.id)) continue;
      await fees.create(ctx, {
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

  markFeePaid(ctx: RepoContext, id: string): Promise<CondoFee | null> {
    return fees.update(ctx, id, { status: "pago", paidAt: new Date().toISOString() });
  },

  getFee(ctx: RepoContext, id: string): Promise<CondoFee | null> {
    return fees.find(ctx, id);
  },

  // Link a fee to its active charge (1:1). Used by billing emission.
  setFeeCharge(
    ctx: RepoContext,
    feeId: string,
    chargeId: string | null,
  ): Promise<CondoFee | null> {
    return fees.update(ctx, feeId, { chargeId });
  },

  // --- Expenses + apportionment ---

  listExpenses(ctx: RepoContext, condoId: string): Promise<CondoExpense[]> {
    return expenses.list(ctx, (e) => e.condoId === condoId);
  },

  registerExpense(
    ctx: RepoContext,
    data: Omit<CondoExpense, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">,
  ): Promise<CondoExpense> {
    return expenses.create(ctx, data);
  },

  // Apportion an expense across units, returning the per-unit charge.
  async apportionExpense(
    ctx: RepoContext,
    expenseId: string,
  ): Promise<{ unitId: string; label: string; amount: number }[]> {
    const exp = await expenses.find(ctx, expenseId);
    if (!exp) return [];
    const us = await this.listUnits(ctx, exp.condoId);
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
    await expenses.update(ctx, expenseId, { status: "rateada" });
    return result;
  },

  // --- Meetings ---

  async listMeetings(ctx: RepoContext, condoId?: string): Promise<CondoMeeting[]> {
    const rows = await meetings.list(ctx, (m) => (condoId ? m.condoId === condoId : true));
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  },

  async upcomingMeetings(ctx: RepoContext): Promise<CondoMeeting[]> {
    const today = new Date().toISOString().slice(0, 10);
    return (await this.listMeetings(ctx)).filter((m) => m.date >= today);
  },
};
