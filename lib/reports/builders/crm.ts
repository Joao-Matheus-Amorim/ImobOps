// CRM report builders: funnel, activities

import { reportDefinition } from "../definitions";
import type { BuiltReport, ReportsContext } from "./types";
import { FUNNEL_STAGE_LABELS, FUNNEL_ORDER } from "@/lib/types/domain";

export function buildCrmFunnelReport(context: ReportsContext): BuiltReport {
  const funnelCounts = FUNNEL_ORDER.map((stage) => ({
    stage,
    label: FUNNEL_STAGE_LABELS[stage],
    count: context.leads.filter((l) => l.funnelStage === stage).length,
  }));

  const rows: BuiltReport["rows"] = funnelCounts.map((fc) => ({
    id: `funnel-${fc.stage}`,
    values: {
      area: "CRM",
      indicador: fc.label,
      valor: fc.count,
      detalhe: "",
    },
  }));

  return {
    definition: reportDefinition("crm.funnel"),
    generatedAt: new Date().toISOString(),
    totals: {
      total: context.leads.length,
      novos: funnelCounts.find((f) => f.stage === "novo")?.count ?? 0,
      qualificados: funnelCounts.find((f) => f.stage === "qualificado")?.count ?? 0,
      visita: funnelCounts.find((f) => f.stage === "visita_agendada")?.count ?? 0,
      proposta: funnelCounts.find((f) => f.stage === "proposta")?.count ?? 0,
      ganhos: funnelCounts.find((f) => f.stage === "fechado_ganho")?.count ?? 0,
      perdidos: funnelCounts.find((f) => f.stage === "fechado_perdido")?.count ?? 0,
    },
    rows,
  };
}

export function buildCrmActivitiesReport(context: ReportsContext): BuiltReport {
  const today = context.today;
  const rows: BuiltReport["rows"] = context.activities
    .filter((a) => a.scheduledAt?.startsWith(today) ?? false)
    .map((activity) => ({
      id: `activity-${activity.id}`,
      href: "/crm/activities",
      values: {
        area: "CRM",
        indicador: "Atividade Hoje",
        valor: 1,
        detalhe: `${activity.kind} - ${activity.leadId}`,
      },
    }));

  return {
    definition: reportDefinition("crm.activities"),
    generatedAt: new Date().toISOString(),
    totals: {
      today: rows.length,
      total: context.activities.length,
    },
    rows,
  };
}
