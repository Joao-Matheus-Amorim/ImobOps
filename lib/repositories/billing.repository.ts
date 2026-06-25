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
import {
  DEFAULT_LATE_FEE_PCT,
  DEFAULT_LATE_INTEREST_PCT_MONTH,
} from "@/lib/types/domain";
import { MockCollection, type RepoContext } from "./base";
import { rentalsRepository } from "./rentals.repository";
import { financeRepository } from "./finance.repository";
import { clientsRepository } from "./clients.repository";
import { condosRepository } from "./condos.repository";
import { getBillingAdapter } from "@/lib/billing/adapter";
import { chargeStatusAsOf } from "@/lib/billing/charge-logic";
import { computeLateCharge } from "@/lib/billing/late-charges";
import { getWhatsAppAdapter } from "@/lib/whatsapp/provider";
import { whatsappRepository } from "./whatsapp.repository";
import { renderTemplate } from "@/lib/whatsapp/templates";
import { formatBRL, formatDate, round2 } from "@/lib/utils";

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

  // Up-to-date late breakdown (multa + juros) for an installment as of today.
  // Returns null when not late or the installment/contract is missing.
  lateBreakdownForInstallment(ctx: RepoContext, installmentId: string) {
    const installment = rentalsRepository
      .listInstallments(ctx)
      .find((i) => i.id === installmentId);
    if (!installment || installment.status === "pago") return null;
    const contract = rentalsRepository.get(ctx, installment.contractId);
    const b = computeLateCharge(
      installment.amount,
      installment.dueDate,
      today(),
      contract?.lateFeePct ?? DEFAULT_LATE_FEE_PCT,
      contract?.lateInterestPctMonth ?? DEFAULT_LATE_INTEREST_PCT_MONTH,
    );
    return b.daysLate > 0 ? b : null;
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

    // If the installment is already past due, the boleto carries the encargos
    // (multa + juros pro rata) per the contract's configured rates.
    const late = computeLateCharge(
      installment.amount,
      installment.dueDate,
      today(),
      contract?.lateFeePct ?? DEFAULT_LATE_FEE_PCT,
      contract?.lateInterestPctMonth ?? DEFAULT_LATE_INTEREST_PCT_MONTH,
    );
    const description =
      late.daysLate > 0
        ? `Aluguel ${installment.referenceMonth} (+ multa/juros ${late.daysLate}d)`
        : `Aluguel ${installment.referenceMonth}`;

    const charge = await this.createChargeRecord(ctx, {
      sourceType: "installment",
      sourceId: installment.id,
      clientId: tenant?.id ?? null,
      customerName: tenant?.name ?? null,
      customerDocument: tenant?.document ?? null,
      description,
      method,
      amount: late.total,
      dueDate: installment.dueDate,
    });

    // Link the charge to the installment (1:1 active charge).
    if (charge.status !== "falha") {
      rentalsRepository.setInstallmentCharge(ctx, installment.id, charge.id);
    }

    return charge;
  },

  forCondoFee(ctx: RepoContext, feeId: string): ChargeView | null {
    const c = charges
      .list(ctx, (x) => x.sourceId === feeId && x.status !== "cancelada")
      .at(0);
    return c ? withEffectiveStatus(c) : null;
  },

  // Emit a charge for a condo fee. Receita do condomínio — não gera repasse.
  // Idempotent: returns the existing active charge for that fee.
  async emitForCondoFee(
    ctx: RepoContext,
    feeId: string,
    method: ChargeMethod,
  ): Promise<ChargeView | null> {
    const existing = this.forCondoFee(ctx, feeId);
    if (existing && existing.status !== "falha") return existing;

    const fee = condosRepository.getFee(ctx, feeId);
    if (!fee) return null;
    const unit = condosRepository.getUnit(ctx, fee.unitId);
    const payerId = unit?.currentResidentClientId ?? unit?.ownerClientId ?? null;
    const payer = payerId ? clientsRepository.get(ctx, payerId) : null;

    const charge = await this.createChargeRecord(ctx, {
      sourceType: "condo_fee",
      sourceId: fee.id,
      clientId: payer?.id ?? null,
      customerName: payer?.name ?? null,
      customerDocument: payer?.document ?? null,
      description: `Condomínio ${fee.referenceMonth}${unit ? ` — ${unit.label}` : ""}`,
      method,
      amount: round2(fee.amount),
      dueDate: fee.dueDate,
    });

    if (charge.status !== "falha") {
      condosRepository.setFeeCharge(ctx, fee.id, charge.id);
    }
    return charge;
  },

  // Emit a standalone charge addressed to a client (receita direta, no repasse).
  async emitStandalone(
    ctx: RepoContext,
    input: {
      clientId: string;
      amount: number;
      dueDate: string;
      method: ChargeMethod;
      description?: string;
    },
  ): Promise<ChargeView | null> {
    const client = clientsRepository.get(ctx, input.clientId);
    if (!client) return null;

    return this.createChargeRecord(ctx, {
      sourceType: "avulsa",
      sourceId: client.id,
      clientId: client.id,
      customerName: client.name,
      customerDocument: client.document ?? null,
      description: input.description ?? "Cobrança avulsa",
      method: input.method,
      amount: round2(input.amount),
      dueDate: input.dueDate,
    });
  },

  // Shared emission: calls the gateway and persists the charge (or a "falha"
  // record if the gateway rejects). Returns the charge with effective status.
  async createChargeRecord(
    ctx: RepoContext,
    input: {
      sourceType: Charge["sourceType"];
      sourceId: string;
      clientId: string | null;
      customerName: string | null;
      customerDocument: string | null;
      description: string;
      method: ChargeMethod;
      amount: number;
      dueDate: string;
    },
  ): Promise<ChargeView> {
    const adapter = getBillingAdapter();
    // A stable reference makes gateway-side reconciliation idempotent.
    const reference =
      input.sourceType === "installment"
        ? input.sourceId
        : `avulsa-${input.sourceId}-${input.dueDate}-${Math.round(input.amount * 100)}`;

    const base = {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      clientId: input.clientId,
      description: input.description,
      customerName: input.customerName,
      method: input.method,
      amount: round2(input.amount),
      dueDate: input.dueDate,
      provider: adapter.provider,
      paidAt: null,
      paidAmount: null,
    };

    try {
      const result = await adapter.createCharge({
        reference,
        method: input.method,
        amount: round2(input.amount),
        dueDate: input.dueDate,
        customerName: input.customerName ?? undefined,
        customerDocument: input.customerDocument ?? undefined,
        description: input.description,
      });
      return withEffectiveStatus(
        charges.create(ctx, {
          ...base,
          status: "pendente",
          externalId: result.externalId,
          boletoUrl: result.boletoUrl,
          pixPayload: result.pixPayload,
        }),
      );
    } catch {
      return withEffectiveStatus(
        charges.create(ctx, {
          ...base,
          status: "falha",
          externalId: null,
          boletoUrl: null,
          pixPayload: null,
        }),
      );
    }
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

    // Cascade by source type:
    //  - installment → marca parcela paga + gera repasse pendente.
    //  - condo_fee   → marca taxa paga (receita do condomínio, sem repasse).
    //  - avulsa      → nada além da baixa (receita direta).
    if (updated.sourceType === "installment") {
      const installment = rentalsRepository
        .listInstallments(ctx)
        .find((i) => i.id === updated.sourceId);
      if (installment) {
        rentalsRepository.markInstallmentPaid(ctx, installment.id, round2(paidAmount));
        financeRepository.computeRepasse(
          ctx,
          installment.contractId,
          installment.referenceMonth,
        );
      }
    } else if (updated.sourceType === "condo_fee") {
      condosRepository.markFeePaid(ctx, updated.sourceId);
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

  // --- Delivery ---

  // Send the charge (boleto/PIX) to the client over WhatsApp using the delivery
  // template, and log it to the conversation. Returns false when there is no
  // phone to send to.
  async sendChargeWhatsApp(
    ctx: RepoContext,
    chargeId: string,
  ): Promise<{ sent: boolean; reason?: string }> {
    const charge = charges.find(ctx, chargeId);
    if (!charge) return { sent: false, reason: "cobrança não encontrada" };

    const client = charge.clientId
      ? clientsRepository.get(ctx, charge.clientId)
      : null;
    const phone = client?.whatsapp ?? client?.phone ?? null;
    if (!phone) return { sent: false, reason: "cliente sem telefone" };

    const templateKey = "rental.boleto_delivery" as const;
    const body = renderTemplate(templateKey, {
      nome: charge.customerName ?? client?.name ?? "",
      referencia: charge.description ?? "",
      vencimento: formatDate(charge.dueDate),
      valor: formatBRL(charge.amount),
    });
    const link = charge.boletoUrl ?? charge.pixPayload ?? "";
    const fullBody = link ? `${body}\n${link}` : body;

    try {
      await getWhatsAppAdapter().sendMessage(phone, fullBody);
      const conversation = whatsappRepository.upsertConversation(ctx, phone, "financeiro");
      whatsappRepository.appendMessage(ctx, {
        conversationId: conversation.id,
        direction: "out",
        body: fullBody,
        mediaUrl: null,
        templateKey,
        externalId: null,
        sentAt: new Date().toISOString(),
        deliveredAt: null,
        readAt: null,
        sentBy: "system",
      });
      return { sent: true };
    } catch {
      return { sent: false, reason: "falha no envio" };
    }
  },
};
