import type {
  RentalContract,
  Installment,
  InstallmentStatus,
} from "@/lib/types/domain";
import { MockCollection, type RepoContext } from "./base";
import { generateInstallments } from "./installment-logic";

const contracts = new MockCollection<RentalContract>("rentalContracts");
const installments = new MockCollection<Installment>("installments");

export const rentalsRepository = {
  list(ctx: RepoContext): RentalContract[] {
    return contracts.list(ctx).sort((a, b) => b.startDate.localeCompare(a.startDate));
  },

  get(ctx: RepoContext, id: string): RentalContract | null {
    return contracts.find(ctx, id);
  },

  create(ctx: RepoContext, data: Omit<RentalContract, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">): RentalContract {
    return contracts.create(ctx, data);
  },

  update(ctx: RepoContext, id: string, patch: Partial<RentalContract>): RentalContract | null {
    return contracts.update(ctx, id, patch);
  },

  // --- Installments ---

  listInstallments(ctx: RepoContext, contractId?: string): Installment[] {
    return installments
      .list(ctx, (i) => (contractId ? i.contractId === contractId : true))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },

  generateInstallments(ctx: RepoContext, contractId: string): Installment[] {
    const contract = contracts.find(ctx, contractId);
    if (!contract) return [];
    // Skip months that already have an installment.
    const existing = new Set(
      installments.list(ctx, (i) => i.contractId === contractId).map((i) => i.referenceMonth),
    );
    const fresh = generateInstallments(contract, ctx.tenancyId, ctx.userId).filter(
      (i) => !existing.has(i.referenceMonth),
    );
    for (const i of fresh) installments.create(ctx, i);
    return this.listInstallments(ctx, contractId);
  },

  markInstallmentPaid(
    ctx: RepoContext,
    installmentId: string,
    paidAmount: number,
    receiptDocumentId?: string,
  ): Installment | null {
    return installments.update(ctx, installmentId, {
      status: "pago" as InstallmentStatus,
      paidAt: new Date().toISOString(),
      paidAmount,
      receiptDocumentId: receiptDocumentId ?? null,
    });
  },

  listOverdue(ctx: RepoContext): Installment[] {
    return installments
      .list(ctx, (i) => i.status === "atrasado")
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },
};
