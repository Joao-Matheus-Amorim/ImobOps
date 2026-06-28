// Condo report builders: fees, expenses, meetings

import { routes } from "@/lib/routes";
import { S } from "@/lib/status";
import { reportDefinition } from "../definitions";
import type { BuiltReport, ReportsContext } from "./types";
import { money } from "./helpers";

export function buildCondoFeesReport(context: ReportsContext): BuiltReport {
  const rows: BuiltReport["rows"] = context.condoFees
    .filter((f) => f.status === "a_vencer")
    .map((fee) => {
      const unit = context.condoUnitById.get(fee.unitId);
      const condo = unit ? context.condoById.get(unit.condoId) : null;
      const payerId = unit?.currentResidentClientId ?? unit?.ownerClientId ?? null;
      return {
        id: fee.id,
        href: condo ? routes.condo(condo.id) : routes.condos,
        values: {
          condominio: condo?.name ?? "-",
          unidade: unit?.label ?? "-",
          pagador: payerId ? context.clientById.get(payerId)?.name ?? "-" : "-",
          referencia: fee.referenceMonth,
          vencimento: fee.dueDate,
          valor: money(fee.amount),
          status: fee.status,
        },
      };
    });

  return {
    definition: reportDefinition("condos.fees"),
    generatedAt: new Date().toISOString(),
    totals: {
      count: rows.length,
      valorTotal: money(context.condoFees.filter((f) => f.status === "a_vencer").reduce((sum, f) => sum + f.amount, 0)),
    },
    rows,
  };
}

export function buildCondoExpensesReport(context: ReportsContext): BuiltReport {
  const rows: BuiltReport["rows"] = context.condoExpenses
    .filter((e) => e.status !== "pago")
    .map((expense) => ({
      id: expense.id,
      href: routes.condo(expense.condoId),
      values: {
        condominio: context.condoById.get(expense.condoId)?.name ?? "-",
        referencia: expense.referenceMonth,
        descricao: expense.description,
        valor: money(expense.totalAmount),
        rateio: expense.apportionment,
        status: expense.status,
      },
    }));

  return {
    definition: reportDefinition("condos.expenses"),
    generatedAt: new Date().toISOString(),
    totals: {
      count: rows.length,
      valor: money(context.condoExpenses.filter((e) => e.status !== S.PAGA).reduce((sum, e) => sum + e.totalAmount, 0)),
    },
    rows,
  };
}

export function buildCondoMeetingsReport(context: ReportsContext): BuiltReport {
  const today = context.today;
  const upcoming = context.condoMeetings.filter((m) => m.date >= today);

  const rows: BuiltReport["rows"] = upcoming.map((meeting) => ({
    id: meeting.id,
    href: routes.condo(meeting.condoId),
    values: {
      condominio: context.condoById.get(meeting.condoId)?.name ?? "-",
      data: meeting.date,
      tipo: meeting.kind,
      resumo: meeting.summary ?? "-",
      ata: meeting.ataDocumentId ? "Sim" : "Não",
    },
  }));

  return {
    definition: reportDefinition("condos.meetings"),
    generatedAt: new Date().toISOString(),
    totals: {
      upcoming: rows.length,
      total: context.condoMeetings.length,
    },
    rows,
  };
}
