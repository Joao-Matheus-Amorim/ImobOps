// Pure, testable late-charge math: multa (fixed %) + juros (monthly %, pro rata per
// day). No I/O. Used at read time (to show the up-to-date total) and at re-emission
// (so a boleto issued after the due date carries the encargos). Timezone-independent
// via the day-diff in charge-logic.

import { round2 } from "@/lib/utils";
import { daysBetween } from "./charge-logic";

export interface LateChargeBreakdown {
  daysLate: number;
  principal: number;
  fineAmount: number; // multa
  interestAmount: number; // juros pro rata
  total: number; // principal + multa + juros
}

// Compute encargos for a principal that is `asOf` past `dueDate`. Before/on the due
// date there are no charges (daysLate <= 0 → total == principal).
export function computeLateCharge(
  principal: number,
  dueDateIso: string,
  asOfIso: string,
  finePct: number,
  interestPctMonth: number,
): LateChargeBreakdown {
  const p = round2(principal);
  // dueDate - asOf < 0 means we are past due; daysLate is the positive lateness.
  const daysLate = Math.max(0, -daysBetween(asOfIso, dueDateIso));

  if (daysLate === 0) {
    return { daysLate: 0, principal: p, fineAmount: 0, interestAmount: 0, total: p };
  }

  const fineAmount = round2(p * (finePct / 100));
  // Monthly interest spread per day (1% a.m. ≈ 0,0333% ao dia), pro rata.
  const interestAmount = round2(p * (interestPctMonth / 100) * (daysLate / 30));
  const total = round2(p + fineAmount + interestAmount);
  return { daysLate, principal: p, fineAmount, interestAmount, total };
}
