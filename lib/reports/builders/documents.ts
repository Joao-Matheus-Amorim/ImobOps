// Documents report builders: status, expiring

import { reportDefinition } from "../definitions";
import type { BuiltReport, ReportsContext } from "./types";
import { S } from "@/lib/status";
import { addDaysISO, daysBetween } from "./helpers";

export function buildDocumentsStatusReport(context: ReportsContext): BuiltReport {
  const rows: BuiltReport["rows"] = context.documents.map((document) => ({
    id: document.id,
    href: `/documents/${document.id}`,
    values: {
      entidade: document.entityType,
      origem: document.entityId,
      tipo: document.kind,
      titulo: document.title,
      status: document.status,
      validade: document.expiresAt ?? "-",
      enviadoEm: document.createdAt,
    },
  }));

  return {
    definition: reportDefinition("documents.status"),
    generatedAt: new Date().toISOString(),
    totals: {
      documentos: context.documents.length,
      pendentes: context.documents.filter((d) => d.status === S.PENDENTE).length,
      validados: context.documents.filter((d) => d.status === S.VALIDADO).length,
      rejeitados: context.documents.filter((d) => d.status === S.REJEITADO).length,
      vencidos: context.documents.filter((d) => d.status === S.VENCIDO).length,
    },
    rows,
  };
}

export function buildDocumentsExpiringReport(context: ReportsContext): BuiltReport {
  const today = context.today;
  const next30 = addDaysISO(today, 30);
  const expiring = context.documents.filter((d) => d.expiresAt && d.expiresAt <= next30);

  const rows: BuiltReport["rows"] = expiring.map((document) => ({
    id: document.id,
    href: `/documents/${document.id}`,
    values: {
      entidade: document.entityType,
      origem: document.entityId,
      tipo: document.kind,
      titulo: document.title,
      validade: document.expiresAt ?? "-",
      dias: document.expiresAt ? daysBetween(today, document.expiresAt) : 0,
      status: document.status,
    },
  }));

  return {
    definition: reportDefinition("documents.expiring"),
    generatedAt: new Date().toISOString(),
    totals: {
      count: expiring.length,
    },
    rows,
  };
}
