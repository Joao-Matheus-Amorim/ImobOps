// Reminder ladder runner. Sweeps open charges, finds which reminder trigger is due
// today, and sends the matching WhatsApp template — skipping any already sent
// (idempotent per charge+trigger). Invoked by the daily cron; safe to run multiple
// times a day. The "vencida" status itself is computed at read time, so a missed
// run never corrupts state — it only delays a reminder.

import type { RepoContext } from "@/lib/repositories/base";
import { billingRepository } from "@/lib/repositories/billing.repository";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { getWhatsAppAdapter } from "@/lib/whatsapp/provider";
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";
import { renderTemplate } from "@/lib/whatsapp/templates";
import { dueReminderTrigger, templateForTrigger } from "./charge-logic";
import { formatBRL, formatDate, formatReferenceMonth } from "@/lib/utils";

export interface ReminderResult {
  chargeId: string;
  trigger: string;
  phone: string | null;
  sent: boolean;
  reason?: string;
}

// Run the ladder for one tenancy as of `todayIso` (defaults to today).
export async function runReminderLadder(
  ctx: RepoContext,
  todayIso = new Date().toISOString().slice(0, 10),
): Promise<ReminderResult[]> {
  const out: ReminderResult[] = [];
  const adapter = getWhatsAppAdapter();
  const installments = await rentalsRepository.listInstallments(ctx);
  const charges = await billingRepository.list(ctx);

  for (const charge of charges) {
    const trigger = dueReminderTrigger(charge, todayIso);
    if (!trigger) continue;

    if (await billingRepository.reminderAlreadySent(ctx, charge.id, trigger)) {
      out.push({ chargeId: charge.id, trigger, phone: null, sent: false, reason: "já enviado" });
      continue;
    }

    const installment = installments.find((i) => i.id === charge.sourceId);
    const contract = installment
      ? await rentalsRepository.get(ctx, installment.contractId)
      : null;
    const tenant = contract
      ? await clientsRepository.get(ctx, contract.tenantClientId)
      : null;
    const phone = tenant?.whatsapp ?? tenant?.phone ?? null;
    if (!phone) {
      out.push({ chargeId: charge.id, trigger, phone: null, sent: false, reason: "sem telefone" });
      continue;
    }

    const templateKey = templateForTrigger(trigger);
    const body = renderTemplate(templateKey, {
      nome: tenant?.name ?? "",
      valor: formatBRL(charge.amount),
      vencimento: formatDate(charge.dueDate),
      referencia: installment ? formatReferenceMonth(installment.referenceMonth) : "",
    });

    try {
      await adapter.sendMessage(phone, body);
      const conversation = await whatsappRepository.upsertConversation(ctx, phone, "financeiro");
      await whatsappRepository.appendMessage(ctx, {
        conversationId: conversation.id,
        direction: "out",
        body,
        mediaUrl: null,
        templateKey,
        externalId: null,
        sentAt: new Date().toISOString(),
        deliveredAt: null,
        readAt: null,
        sentBy: "system",
      });
      await billingRepository.recordReminder(ctx, charge.id, trigger, templateKey);
      out.push({ chargeId: charge.id, trigger, phone, sent: true });
    } catch {
      out.push({ chargeId: charge.id, trigger, phone, sent: false, reason: "falha no envio" });
    }
  }

  return out;
}
