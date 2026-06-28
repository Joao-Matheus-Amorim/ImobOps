import { S } from "@/lib/status";
import type {
  RentalContract,
  Installment,
  InstallmentStatus,
} from "@/lib/types/domain";
import { type RepoContext } from "./base";
import { Collection } from "./collection";
import { generateInstallments } from "./installment-logic";

const contracts = new Collection<RentalContract>("rentalContracts", "rental_contracts");
const installments = new Collection<Installment>("installments", "installments");

export const rentalsRepository = {
  async list(ctx: RepoContext): Promise<RentalContract[]> {
    const rows = await contracts.list(ctx);
    return rows.sort((a, b) => b.startDate.localeCompare(a.startDate));
  },

  get(ctx: RepoContext, id: string): Promise<RentalContract | null> {
    return contracts.find(ctx, id);
  },

  create(
    ctx: RepoContext,
    data: Omit<RentalContract, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">,
  ): Promise<RentalContract> {
    return contracts.create(ctx, data);
  },

  update(
    ctx: RepoContext,
    id: string,
    patch: Partial<RentalContract>,
  ): Promise<RentalContract | null> {
    return contracts.update(ctx, id, patch);
  },

  // --- Installments ---

  async listInstallments(ctx: RepoContext, contractId?: string): Promise<Installment[]> {
    const rows = await installments.list(ctx, (i) =>
      contractId ? i.contractId === contractId : true,
    );
    return rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },

  async generateInstallments(ctx: RepoContext, contractId: string): Promise<Installment[]> {
    const contract = await contracts.find(ctx, contractId);
    if (!contract) return [];
    // Skip months that already have an installment.
    const current = await installments.list(ctx, (i) => i.contractId === contractId);
    const existing = new Set(current.map((i) => i.referenceMonth));
    const fresh = generateInstallments(contract, ctx.tenancyId, ctx.userId).filter(
      (i) => !existing.has(i.referenceMonth),
    );
    for (const i of fresh) await installments.create(ctx, i);
    return this.listInstallments(ctx, contractId);
  },

  markInstallmentPaid(
    ctx: RepoContext,
    installmentId: string,
    paidAmount: number,
    receiptDocumentId?: string,
  ): Promise<Installment | null> {
    return installments.update(ctx, installmentId, {
      status: S.PAGO as InstallmentStatus,
      paidAt: new Date().toISOString(),
      paidAmount,
      receiptDocumentId: receiptDocumentId ?? null,
    });
  },

  // Link an installment to its active charge (1:1). Used by billing emission.
  setInstallmentCharge(
    ctx: RepoContext,
    installmentId: string,
    chargeId: string | null,
  ): Promise<Installment | null> {
    return installments.update(ctx, installmentId, { chargeId });
  },

  async listOverdue(ctx: RepoContext): Promise<Installment[]> {
    const rows = await installments.list(ctx, (i) => i.status === "atrasado");
    return rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },
};
