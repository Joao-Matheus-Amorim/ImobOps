// Executive report builder

import { reportDefinition } from "../definitions";
import type { BuiltReport, ReportsContext } from "./types";
import { money } from "./helpers";

export function buildExecutiveReport(context: ReportsContext, financeOverdue: BuiltReport): BuiltReport {
  const activeRentals = context.rentals.filter((r) => r.status === "ativo");
  const rented = context.properties.filter((p) => p.status === "alugado").length;
  const occupancy = context.properties.length ? Math.round((rented / context.properties.length) * 100) : 0;
  const openCharges = context.charges.filter((c) => (c as any).effectiveStatus !== "paga" && (c as any).effectiveStatus !== "cancelada");
  const pendingRepasses = context.repasses.filter((r) => r.status === "pendente").reduce((sum, r) => sum + r.netAmount, 0);
  const pendingCommissions = context.commissions.filter((c) => c.status === "pendente").reduce((sum, c) => sum + c.amount, 0);
  const documentsAttention = context.documents.filter((d) => d.status === "pendente" || d.status === "rejeitado" || d.status === "vencido").length;
  const openLeads = context.leads.filter((l) => l.funnelStage !== "fechado_ganho" && l.funnelStage !== "fechado_perdido").length;

  const rows: BuiltReport["rows"] = [
    { id: "receivable", values: { area: "Financeiro", indicador: "A Receber", valor: money(openCharges.reduce((sum, c) => sum + c.amount, 0)), detalhe: `${openCharges.length} cobrança(s) abertas` } },
    { id: "overdue", values: { area: "Financeiro", indicador: "Inadimplência", valor: financeOverdue.totals.valor ?? 0, detalhe: `${financeOverdue.rows.length} parcela(s) em atraso` } },
    { id: "occupancy", values: { area: "Locações", indicador: "Ocupação", valor: `${occupancy}%`, detalhe: `${activeRentals.length} contrato(s) ativos` } },
    { id: "repasses", values: { area: "Financeiro", indicador: "Repasses Pendentes", valor: money(pendingRepasses), detalhe: "Valor líquido a pagar a proprietários" } },
    { id: "commissions", values: { area: "Vendas", indicador: "Comissões Pendentes", valor: money(pendingCommissions), detalhe: "Comissões aguardando pagamento" } },
    { id: "leads", values: { area: "CRM", indicador: "Leads Abertos", valor: openLeads, detalhe: "Oportunidades em andamento" } },
    { id: "documents", values: { area: "Documentos", indicador: "Atenção Documental", valor: documentsAttention, detalhe: "Pendentes, rejeitados ou vencidos" } },
  ];

  return {
    definition: reportDefinition("overview.executive"),
    generatedAt: new Date().toISOString(),
    totals: {
      receivable: money(openCharges.reduce((sum, c) => sum + c.amount, 0)),
      overdue: financeOverdue.totals.valor ?? 0,
      occupancy,
      contracts: activeRentals.length,
      repasses: money(pendingRepasses),
      commissions: money(pendingCommissions),
      documents: documentsAttention,
      leads: openLeads,
    },
    rows,
  };
}
