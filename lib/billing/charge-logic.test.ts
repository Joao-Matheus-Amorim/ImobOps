import { describe, it, expect } from "vitest";
import {
  daysBetween,
  chargeStatusAsOf,
  isOpen,
  reminderTriggerForOffset,
  templateForTrigger,
  dueReminderTrigger,
} from "./charge-logic";
import type { Charge } from "@/lib/types/domain";

function charge(partial: Partial<Charge>): Charge {
  return {
    id: "charge-1",
    tenancyId: "t1",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    createdBy: "u1",
    sourceType: "installment",
    sourceId: "installment-1",
    clientId: null,
    description: null,
    customerName: null,
    method: "boleto",
    amount: 2800,
    dueDate: "2026-06-10",
    status: "pendente",
    provider: "mock",
    externalId: "mock_chg_installment-1",
    boletoUrl: "https://x/y.pdf",
    pixPayload: null,
    paidAt: null,
    paidAmount: null,
    ...partial,
  };
}

describe("daysBetween", () => {
  it("is positive when target is in the future", () => {
    expect(daysBetween("2026-06-07", "2026-06-10")).toBe(3);
  });
  it("is negative when target is in the past", () => {
    expect(daysBetween("2026-06-11", "2026-06-10")).toBe(-1);
  });
  it("is zero on the same day", () => {
    expect(daysBetween("2026-06-10", "2026-06-10")).toBe(0);
  });
  it("ignores time-of-day in ISO timestamps", () => {
    expect(daysBetween("2026-06-10T23:00:00Z", "2026-06-11T01:00:00Z")).toBe(1);
  });
});

describe("chargeStatusAsOf", () => {
  it("stays pendente before due date", () => {
    expect(chargeStatusAsOf(charge({}), "2026-06-09")).toBe("pendente");
  });
  it("stays pendente on the due date", () => {
    expect(chargeStatusAsOf(charge({}), "2026-06-10")).toBe("pendente");
  });
  it("becomes vencida after due date", () => {
    expect(chargeStatusAsOf(charge({}), "2026-06-11")).toBe("vencida");
  });
  it("leaves terminal states untouched", () => {
    expect(chargeStatusAsOf(charge({ status: "paga" }), "2026-12-31")).toBe("paga");
    expect(chargeStatusAsOf(charge({ status: "cancelada" }), "2026-12-31")).toBe(
      "cancelada",
    );
  });
});

describe("isOpen", () => {
  it("is open while pendente or vencida", () => {
    expect(isOpen(charge({}), "2026-06-09")).toBe(true);
    expect(isOpen(charge({}), "2026-06-20")).toBe(true);
  });
  it("is closed once paid", () => {
    expect(isOpen(charge({ status: "paga" }), "2026-06-09")).toBe(false);
  });
});

describe("reminder ladder", () => {
  it("maps offsets to triggers", () => {
    expect(reminderTriggerForOffset(3)).toBe("pre_vencimento");
    expect(reminderTriggerForOffset(0)).toBe("vencimento");
    expect(reminderTriggerForOffset(-1)).toBe("atraso_1");
    expect(reminderTriggerForOffset(-5)).toBe("atraso_2");
    expect(reminderTriggerForOffset(2)).toBeNull();
  });

  it("maps each trigger to an existing rental template", () => {
    expect(templateForTrigger("pre_vencimento")).toBe("rental.reminder_3_days_before");
    expect(templateForTrigger("vencimento")).toBe("rental.reminder_due_today");
    expect(templateForTrigger("atraso_1")).toBe("rental.overdue_first_notice");
    expect(templateForTrigger("atraso_2")).toBe("rental.overdue_second_notice");
  });

  it("selects the due trigger for an open charge", () => {
    // due 2026-06-10: D-3 = 06-07, D0 = 06-10, D+1 = 06-11, D+5 = 06-15
    expect(dueReminderTrigger(charge({}), "2026-06-07")).toBe("pre_vencimento");
    expect(dueReminderTrigger(charge({}), "2026-06-10")).toBe("vencimento");
    expect(dueReminderTrigger(charge({}), "2026-06-11")).toBe("atraso_1");
    expect(dueReminderTrigger(charge({}), "2026-06-15")).toBe("atraso_2");
    expect(dueReminderTrigger(charge({}), "2026-06-08")).toBeNull();
  });

  it("never reminds a paid charge", () => {
    expect(dueReminderTrigger(charge({ status: "paga" }), "2026-06-11")).toBeNull();
  });
});
