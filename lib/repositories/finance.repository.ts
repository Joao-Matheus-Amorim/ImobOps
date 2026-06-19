import type { Repasse, Commission } from "@/lib/types/domain";
import { MockCollection, type RepoContext } from "./base";
import { rentalsRepository } from "./rentals.repository";
import { buildRepasse } from "./installment-logic";

const repasses = new MockCollection<Repasse>("repasses");
const commissions = new MockCollection<Commission>("commissions");

export interface FinanceSummary {
  receivableThisMonth: number;
  overdueAmount: number;
  pendingRepasses: number;
  pendingCommissions: number;
}

export const financeRepository = {
  // --- Repasses ---

  listRepasses(ctx: RepoContext): Repasse[] {
    return repasses.list(ctx).sort((a, b) => b.referenceMonth.localeCompare(a.referenceMonth));
  },

  // Compute (and persist if missing) a repasse for a paid installment month.
  computeRepasse(ctx: RepoContext, contractId: string, referenceMonth: string): Repasse | null {
    const contract = rentalsRepository.get(ctx, contractId);
    if (!contract) return null;
    const installment = rentalsRepository
      .listInstallments(ctx, contractId)
      .find((i) => i.referenceMonth === referenceMonth && i.status === "pago");
    if (!installment) return null;

    const existing = repasses
      .list(ctx, (r) => r.contractId === contractId && r.referenceMonth === referenceMonth)
      .at(0);
    if (existing) return existing;

    const r = buildRepasse(contract, installment, ctx.tenancyId, ctx.userId);
    return repasses.create(ctx, r);
  },

  markRepassePaid(ctx: RepoContext, id: string): Repasse | null {
    return repasses.update(ctx, id, { status: "pago", paidAt: new Date().toISOString() });
  },

  // --- Commissions ---

  listCommissions(ctx: RepoContext): Commission[] {
    return commissions.list(ctx).sort((a, b) => (a.status > b.status ? 1 : -1));
  },

  recordCommissionPayment(ctx: RepoContext, id: string): Commission | null {
    return commissions.update(ctx, id, { status: "paga", paidAt: new Date().toISOString() });
  },

  createCommission(ctx: RepoContext, data: Omit<Commission, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">): Commission {
    return commissions.create(ctx, data);
  },

  // --- Summary used by finance dashboard ---

  summary(ctx: RepoContext): FinanceSummary {
    const insts = rentalsRepository.listInstallments(ctx);
    const month = new Date().toISOString().slice(0, 7);
    const receivableThisMonth = insts
      .filter((i) => i.referenceMonth === month && i.status !== "pago" && i.status !== "cancelado")
      .reduce((s, i) => s + i.amount, 0);
    const overdueAmount = insts
      .filter((i) => i.status === "atrasado")
      .reduce((s, i) => s + i.amount, 0);
    const pendingRepasses = this.listRepasses(ctx)
      .filter((r) => r.status === "pendente")
      .reduce((s, r) => s + r.netAmount, 0);
    const pendingCommissions = this.listCommissions(ctx)
      .filter((c) => c.status === "pendente")
      .reduce((s, c) => s + c.amount, 0);
    return { receivableThisMonth, overdueAmount, pendingRepasses, pendingCommissions };
  },
};
