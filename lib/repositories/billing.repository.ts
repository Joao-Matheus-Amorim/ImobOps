// Billing repository: owns the domain flow around charges (boleto/PIX). Emits
// charges via the active adapter, lists them with read-time status, and reconciles
// payments idempotently — paying a charge marks its installment paid and triggers
// the repasse. Mock-store backed today; same interface targets Supabase later.

import { S } from "@/lib/status";
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
import { type RepoContext } from "./base";
import { Collection } from "./collection";
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

const charges = new Collection<Charge>("charges", "charges");
const reminders = new Collection<ChargeReminder>("chargeReminders", "charge_reminders");

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

  async list(ctx: RepoContext): Promise<ChargeView[]> {
    const rows = await charges.list(ctx);
    return rows
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
      .map((c) => withEffectiveStatus(c));
  },

  async get(ctx: RepoContext, id: string): Promise<ChargeView | null> {
    const c = await charges.find(ctx, id);
    return c ? withEffectiveStatus(c) : null;
  },

  async updateCharge(ctx: RepoContext, id: string, patch: Partial<Charge>): Promise<ChargeView | null> {
    const updated = await charges.update(ctx, id, patch);
    return updated ? withEffectiveStatus(updated) : null;
  },

  async forInstallment(ctx: RepoContext, installmentId: string): Promise<ChargeView | null> {
    const list = await charges.list(
      ctx,
      (x) => x.sourceId === installmentId && x.status !== S.CANCELADA,
    );
    const c = list.at(0);
    return c ? withEffectiveStatus(c) : null;
  },

  // Up-to-date late breakdown (multa + juros) for an installment as of today.
  // Returns null when not late or the installment/contract is missing.
  async lateBreakdownForInstallment(ctx: RepoContext, installmentId: string) {
    const installmentList = await rentalsRepository.listInstallments(ctx);
    const installment = installmentList.find((i) => i.id === installmentId);
    if (!installment || installment.status === S.PAGO) return null;
    const contract = await rentalsRepository.get(ctx, installment.contractId);
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
    const existing = await this.forInstallment(ctx, installmentId);
    if (existing && existing.status !== S.FALHA) return existing;

    const installmentList = await rentalsRepository.listInstallments(ctx);
    const installment = installmentList.find((i) => i.id === installmentId);
    if (!installment) return null;

    const contract = await rentalsRepository.get(ctx, installment.contractId);
    const tenant = contract
      ? await clientsRepository.get(ctx, contract.tenantClientId)
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
    if (charge.status !== S.FALHA) {
      await rentalsRepository.setInstallmentCharge(ctx, installment.id, charge.id);
    }

    return charge;
  },

  async forCondoFee(ctx: RepoContext, feeId: string): Promise<ChargeView | null> {
    const list = await charges.list(
      ctx,
      (x) => x.sourceId === feeId && x.status !== S.CANCELADA,
    );
    const c = list.at(0);
    return c ? withEffectiveStatus(c) : null;
  },

  // Emit a charge for a condo fee. Receita do condomínio — não gera repasse.
  // Idempotent: returns the existing active charge for that fee.
  async emitForCondoFee(
    ctx: RepoContext,
    feeId: string,
    method: ChargeMethod,
  ): Promise<ChargeView | null> {
    const existing = await this.forCondoFee(ctx, feeId);
    if (existing && existing.status !== S.FALHA) return existing;

    const fee = await condosRepository.getFee(ctx, feeId);
    if (!fee) return null;
    const unit = await condosRepository.getUnit(ctx, fee.unitId);
    const payerId = unit?.currentResidentClientId ?? unit?.ownerClientId ?? null;
    const payer = payerId ? await clientsRepository.get(ctx, payerId) : null;

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

    if (charge.status !== S.FALHA) {
      await condosRepository.setFeeCharge(ctx, fee.id, charge.id);
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
    const client = await clientsRepository.get(ctx, input.clientId);
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

  // Shared emission: calls the gateway and persists the charge (or a S.FALHA
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
        await charges.create(ctx, {
          ...base,
          status: S.PENDENTE,
          externalId: result.externalId,
          boletoUrl: result.boletoUrl,
          pixPayload: result.pixPayload,
        }),
      );
    } catch {
      return withEffectiveStatus(
        await charges.create(ctx, {
          ...base,
          status: S.FALHA,
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
  async reconcileByExternalId(
    ctx: RepoContext,
    externalId: string,
    paidAmount: number,
    paidAtIso: string,
  ): Promise<ChargeView | null> {
    const list = await charges.list(ctx, (c) => c.externalId === externalId);
    const charge = list.at(0);
    if (!charge) return null;
    if (charge.status === S.PAGA) return withEffectiveStatus(charge); // idempotent

    const updated = await charges.update(ctx, charge.id, {
      status: S.PAGA,
      paidAt: paidAtIso,
      paidAmount: round2(paidAmount),
    });
    if (!updated) return null;

    // Cascade by source type:
    //  - installment → marca parcela paga + gera repasse pendente.
    //  - condo_fee   → marca taxa paga (receita do condomínio, sem repasse).
    //  - avulsa      → nada além da baixa (receita direta).
    if (updated.sourceType === "installment") {
      const installmentList = await rentalsRepository.listInstallments(ctx);
      const installment = installmentList.find((i) => i.id === updated.sourceId);
      if (installment) {
        await rentalsRepository.markInstallmentPaid(ctx, installment.id, round2(paidAmount));
        await financeRepository.computeRepasse(
          ctx,
          installment.contractId,
          installment.referenceMonth,
        );
      }
    } else if (updated.sourceType === "condo_fee") {
      await condosRepository.markFeePaid(ctx, updated.sourceId);
    }

    return withEffectiveStatus(updated);
  },

  // Manual reconciliation from the UI (fallback when no gateway webhook).
  async markPaidManually(ctx: RepoContext, chargeId: string): Promise<ChargeView | null> {
    const charge = await charges.find(ctx, chargeId);
    if (!charge || !charge.externalId) return null;
    return this.reconcileByExternalId(
      ctx,
      charge.externalId,
      charge.amount,
      new Date().toISOString(),
    );
  },

  // --- Reminders (idempotency for the ladder) ---

  async reminderAlreadySent(
    ctx: RepoContext,
    chargeId: string,
    trigger: ReminderTrigger,
  ): Promise<boolean> {
    const list = await reminders.list(
      ctx,
      (r) => r.chargeId === chargeId && r.trigger === trigger,
    );
    return list.length > 0;
  },

  recordReminder(
    ctx: RepoContext,
    chargeId: string,
    trigger: ReminderTrigger,
    templateKey: string,
  ): Promise<ChargeReminder> {
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
    const charge = await charges.find(ctx, chargeId);
    if (!charge) return { sent: false, reason: "cobrança não encontrada" };

    const client = charge.clientId
      ? await clientsRepository.get(ctx, charge.clientId)
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
      const conversation = await whatsappRepository.upsertConversation(ctx, phone, "financeiro");
      await whatsappRepository.appendMessage(ctx, {
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
