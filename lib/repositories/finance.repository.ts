import { S } from "@/lib/status";
import type { Repasse, Commission } from "@/lib/types/domain";
import { type RepoContext } from "./base";
import { Collection } from "./collection";
import { rentalsRepository } from "./rentals.repository";
import { buildRepasse } from "./installment-logic";

const repasses = new Collection<Repasse>("repasses", "repasses");
const commissions = new Collection<Commission>("commissions", "commissions");

export interface FinanceSummary {
  receivableThisMonth: number;
  overdueAmount: number;
  pendingRepasses: number;
  pendingCommissions: number;
}

export const financeRepository = {
  // --- Repasses ---

  async listRepasses(ctx: RepoContext): Promise<Repasse[]> {
    const rows = await repasses.list(ctx);
    return rows.sort((a, b) => b.referenceMonth.localeCompare(a.referenceMonth));
  },

  // Compute (and persist if missing) a repasse for a paid installment month.
  async computeRepasse(
    ctx: RepoContext,
    contractId: string,
    referenceMonth: string,
  ): Promise<Repasse | null> {
    const contract = await rentalsRepository.get(ctx, contractId);
    if (!contract) return null;
    const installmentList = await rentalsRepository.listInstallments(ctx, contractId);
    const installment = installmentList.find(
      (i) => i.referenceMonth === referenceMonth && i.status === S.PAGO,
    );
    if (!installment) return null;

    const existingList = await repasses.list(
      ctx,
      (r) => r.contractId === contractId && r.referenceMonth === referenceMonth,
    );
    const existing = existingList.at(0);
    if (existing) return existing;

    const r = buildRepasse(contract, installment, ctx.tenancyId, ctx.userId);
    return repasses.create(ctx, {
      contractId: r.contractId,
      referenceMonth: r.referenceMonth,
      grossAmount: r.grossAmount,
      adminFeeAmount: r.adminFeeAmount,
      netAmount: r.netAmount,
      status: r.status,
      paidAt: r.paidAt,
      receiptDocumentId: r.receiptDocumentId,
    });
  },

  markRepassePaid(ctx: RepoContext, id: string): Promise<Repasse | null> {
    return repasses.update(ctx, id, { status: S.PAGO, paidAt: new Date().toISOString() });
  },

  // --- Commissions ---

  async listCommissions(ctx: RepoContext): Promise<Commission[]> {
    const rows = await commissions.list(ctx);
    return rows.sort((a, b) => (a.status > b.status ? 1 : -1));
  },

  recordCommissionPayment(ctx: RepoContext, id: string): Promise<Commission | null> {
    return commissions.update(ctx, id, { status: S.PAGA, paidAt: new Date().toISOString() });
  },

  createCommission(
    ctx: RepoContext,
    data: Omit<Commission, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">,
  ): Promise<Commission> {
    return commissions.create(ctx, data);
  },

  // --- Summary used by finance dashboard ---

  async summary(ctx: RepoContext): Promise<FinanceSummary> {
    const insts = await rentalsRepository.listInstallments(ctx);
    const month = new Date().toISOString().slice(0, 7);
    const receivableThisMonth = insts
      .filter((i) => i.referenceMonth === month && i.status !== S.PAGO && i.status !== S.CANCELADO)
      .reduce((s, i) => s + i.amount, 0);
    const overdueAmount = insts
      .filter((i) => i.status === "atrasado")
      .reduce((s, i) => s + i.amount, 0);
    const repasseList = await this.listRepasses(ctx);
    const pendingRepasses = repasseList
      .filter((r) => r.status === S.PENDENTE)
      .reduce((s, r) => s + r.netAmount, 0);
    const commissionList = await this.listCommissions(ctx);
    const pendingCommissions = commissionList
      .filter((c) => c.status === S.PENDENTE)
      .reduce((s, c) => s + c.amount, 0);
    return { receivableThisMonth, overdueAmount, pendingRepasses, pendingCommissions };
  },
};
