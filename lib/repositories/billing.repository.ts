// Billing repository: owns the domain flow around charges (boleto/PIX). Emits
// charges via the active adapter, lists them with read-time status, and reconciles
// payments idempotently — paying a charge marks its installment paid and triggers
// the repasse. Mock-store backed today; same interface targets Supabase later.

import type {
  Charge,
  ChargeMethod,
  ChargeReminder,
  ChargeStatus,
  ReminderTrigger,
} from "@/lib/types/domain";
import { MockCollection, type RepoContext } from "./base";
import { rentalsRepository } from "./rentals.repository";
import { financeRepository } from "./finance.repository";
import { clientsRepository } from "./clients.repository";
import { getBillingAdapter } from "@/lib/billing/adapter";
import { chargeStatusAsOf } from "@/lib/billing/charge-logic";
import { round2 } from "@/lib/utils";

const charges = new MockCollection<Charge>("charges");
const reminders = new MockCollection<ChargeReminder>("chargeReminders");

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// A charge with its effective (read-time) status applied.
export interface ChargeView extends Charge {
  effectiveStatus: ChargeStatus;
}

function withEffectiveStatus(charge: Charge, asOf = today()): ChargeView {
  return { ...charge, effectiveStatus: chargeStatusAsOf(charge, asOf) };
}

export const billingRepository = {
  // --- Reads ---

  list(ctx: RepoContext): ChargeView[] {
    return charges
      .list(ctx)
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
      .map((c) => withEffectiveStatus(c));
  },

  get(ctx: RepoContext, id: string): ChargeView | null {
    const c = charges.find(ctx, id);
    return c ? withEffectiveStatus(c) : null;
  },

  forInstallment(ctx: RepoContext, installmentId: string): ChargeView | null {
    const c = charges
      .list(ctx, (x) => x.sourceId === installmentId && x.status !== "cancelada")
      .at(0);
    return c ? withEffectiveStatus(c) : null;
  },

  // --- Emission ---

  // Create a charge for an installment. Idempotent: returns the existing active
  // charge if one already exists for that installment.
  async emitForInstallment(
    ctx: RepoContext,
    installmentId: string,
    method: ChargeMethod,
  ): Promise<ChargeView | null> {
    const existing = this.forInstallment(ctx, installmentId);
    if (existing && existing.status !== "falha") return existing;

    const installment = rentalsRepository
      .listInstallments(ctx)
      .find((i) => i.id === installmentId);
    if (!installment) return null;

    const contract = rentalsRepository.get(ctx, installment.contractId);
    const tenant = contract
      ? clientsRepository.get(ctx, contract.tenantClientId)
      : null;

    const adapter = getBillingAdapter();
    let result;
    try {
      result = await adapter.createCharge({
        reference: installment.id,
        method,
        amount: round2(installment.amount),
        dueDate: installment.dueDate,
        customerName: tenant?.name,
        customerDocument: tenant?.document ?? undefined,
        description: `Aluguel ${installment.referenceMonth}`,
      });
    } catch {
      const failed = charges.create(ctx, {
        sourceType: "installment",
        sourceId: installment.id,
        method,
        amount: round2(installment.amount),
        dueDate: installment.dueDate,
        status: "falha",
        provider: adapter.provider,
        externalId: null,
        boletoUrl: null,
        pixPayload: null,
        paidAt: null,
        paidAmount: null,
      });
      return withEffectiveStatus(failed);
    }

    const charge = charges.create(ctx, {
      sourceType: "installment",
      sourceId: installment.id,
      method,
      amount: round2(installment.amount),
      dueDate: installment.dueDate,
      status: "pendente",
      provider: adapter.provider,
      externalId: result.externalId,
      boletoUrl: result.boletoUrl,
      pixPayload: result.pixPayload,
      paidAt: null,
      paidAmount: null,
    });

    // Link the charge to the installment (1:1 active charge).
    rentalsRepository.setInstallmentCharge(ctx, installment.id, charge.id);

    return withEffectiveStatus(charge);
  },

  // --- Reconciliation (webhook / manual) ---

  // Mark a charge paid by its gateway externalId. Idempotent: a charge already
  // paid is returned unchanged. Drives installment payment + repasse.
  reconcileByExternalId(
    ctx: RepoContext,
    externalId: string,
    paidAmount: number,
    paidAtIso: string,
  ): ChargeView | null {
    const charge = charges
      .list(ctx, (c) => c.externalId === externalId)
      .at(0);
    if (!charge) return null;
    if (charge.status === "paga") return withEffectiveStatus(charge); // idempotent

    const updated = charges.update(ctx, charge.id, {
      status: "paga",
      paidAt: paidAtIso,
      paidAmount: round2(paidAmount),
    });
    if (!updated) return null;

    // Cascade: installment paid → repasse pending.
    const installment = rentalsRepository
      .listInstallments(ctx)
      .find((i) => i.id === updated.sourceId);
    if (installment) {
      rentalsRepository.markInstallmentPaid(
        ctx,
        installment.id,
        round2(paidAmount),
      );
      financeRepository.computeRepasse(
        ctx,
        installment.contractId,
        installment.referenceMonth,
      );
    }

    return withEffectiveStatus(updated);
  },

  // Manual reconciliation from the UI (fallback when no gateway webhook).
  markPaidManually(ctx: RepoContext, chargeId: string): ChargeView | null {
    const charge = charges.find(ctx, chargeId);
    if (!charge || !charge.externalId) return null;
    return this.reconcileByExternalId(
      ctx,
      charge.externalId,
      charge.amount,
      new Date().toISOString(),
    );
  },

  // --- Reminders (idempotency for the ladder) ---

  reminderAlreadySent(
    ctx: RepoContext,
    chargeId: string,
    trigger: ReminderTrigger,
  ): boolean {
    return (
      reminders
        .list(ctx, (r) => r.chargeId === chargeId && r.trigger === trigger)
        .length > 0
    );
  },

  recordReminder(
    ctx: RepoContext,
    chargeId: string,
    trigger: ReminderTrigger,
    templateKey: string,
  ): ChargeReminder {
    return reminders.create(ctx, {
      chargeId,
      trigger,
      sentAt: new Date().toISOString(),
      channel: "whatsapp",
      templateKey,
    });
  },
};
