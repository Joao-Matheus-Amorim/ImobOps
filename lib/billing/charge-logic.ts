// Pure, testable billing logic. No I/O — used by the billing repository, the
// reminder ladder and tests. Mirrors lib/repositories/installment-logic.ts in style.

import { S } from "@/lib/status";
import type {
  Charge,
  ChargeStatus,
  ReminderTrigger,
} from "@/lib/types/domain";
import type { TemplateKey } from "@/lib/whatsapp/templates";

// Parse a yyyy-mm-dd string into a UTC-midnight timestamp (timezone-independent).
function dayUtc(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

// Whole-day difference `target - reference` (positive = target in the future).
export function daysBetween(referenceIso: string, targetIso: string): number {
  const ms = dayUtc(targetIso) - dayUtc(referenceIso);
  return Math.round(ms / 86_400_000);
}

// Effective status of a charge *as of* a given day. A charge that is still
// "pendente" past its due date reads as "vencida" — computed at read time, so the
// status is always correct without depending on a cron job. Terminal states
// (paga/cancelada/falha) are returned unchanged.
export function chargeStatusAsOf(charge: Charge, asOfIso: string): ChargeStatus {
  if (charge.status !== S.PENDENTE) return charge.status;
  return daysBetween(asOfIso, charge.dueDate) < 0 ? S.VENCIDA : S.PENDENTE;
}

// True when the charge is open (collectible) as of a given day.
export function isOpen(charge: Charge, asOfIso: string): boolean {
  const s = chargeStatusAsOf(charge, asOfIso);
  return s === S.PENDENTE || s === S.VENCIDA;
}

// --- Reminder ladder ------------------------------------------------------

// Maps the day offset relative to the due date to a reminder trigger.
//   D-3 → pre_vencimento · D0 → vencimento · D+1 → atraso_1 · D+5 → atraso_2
export function reminderTriggerForOffset(
  offsetDays: number,
): ReminderTrigger | null {
  switch (offsetDays) {
    case 3:
      return "pre_vencimento";
    case 0:
      return "vencimento";
    case -1:
      return "atraso_1";
    case -5:
      return "atraso_2";
    default:
      return null;
  }
}

// The WhatsApp template that backs each reminder trigger. These keys already
// exist in lib/whatsapp/templates.ts.
const TRIGGER_TEMPLATE: Record<ReminderTrigger, TemplateKey> = {
  pre_vencimento: "rental.reminder_3_days_before",
  vencimento: "rental.reminder_due_today",
  atraso_1: "rental.overdue_first_notice",
  atraso_2: "rental.overdue_second_notice",
};

export function templateForTrigger(trigger: ReminderTrigger): TemplateKey {
  return TRIGGER_TEMPLATE[trigger];
}

// Given a charge and "today", which reminder trigger (if any) is due. Returns null
// when the charge is not collectible (paid/cancelled) or no trigger matches today.
export function dueReminderTrigger(
  charge: Charge,
  todayIso: string,
): ReminderTrigger | null {
  if (!isOpen(charge, todayIso)) return null;
  // offset = dueDate - today; D-3 means today is 3 days before due (offset +3).
  const offset = daysBetween(todayIso, charge.dueDate);
  return reminderTriggerForOffset(offset);
}
