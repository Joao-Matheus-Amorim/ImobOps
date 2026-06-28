// Report builders orchestrator. Domain-specific builders are in separate files.

import type { RepoContext } from "@/lib/repositories/base";
import type { ReportId } from "./definitions";
import type { BuiltReport, ReportsDashboardData } from "./builders/types";
import { buildReportContext } from "./builders/builders-context";
import {
  buildCommissionsReport,
  buildFinanceOverdueReport,
  buildReceivablesReport,
  buildRepassesReport,
} from "./builders/finance";
import {
  buildAvailablePropertiesReport,
  buildContractsReport,
  buildExpiringContractsReport,
  buildRentalsOverdueReport,
} from "./builders/rentals";
import {
  buildSalesContractsReport,
  buildSalesListingsReport,
  buildSalesProposalsReport,
} from "./builders/sales";
import { buildCrmActivitiesReport, buildCrmFunnelReport } from "./builders/crm";
import { buildDocumentsExpiringReport, buildDocumentsStatusReport } from "./builders/documents";
import { buildCondoExpensesReport, buildCondoFeesReport, buildCondoMeetingsReport } from "./builders/condos";
import { buildExecutiveReport } from "./builders/executive";

// Re-export public API
export type { BuiltReport, ReportValue, ReportRowData, ReportsDashboardData } from "./builders/types";
export { buildReportContext } from "./builders/builders-context";

// Domain builders (re-exported for compatibility)
export {
  buildReceivablesReport,
  buildFinanceOverdueReport,
  buildRepassesReport,
  buildCommissionsReport,
} from "./builders/finance";
export {
  buildContractsReport,
  buildExpiringContractsReport,
  buildRentalsOverdueReport,
  buildAvailablePropertiesReport,
} from "./builders/rentals";
export {
  buildSalesListingsReport,
  buildSalesContractsReport,
  buildSalesProposalsReport,
} from "./builders/sales";
export {
  buildCrmFunnelReport,
  buildCrmActivitiesReport,
} from "./builders/crm";
export {
  buildDocumentsStatusReport,
  buildDocumentsExpiringReport,
} from "./builders/documents";
export {
  buildCondoFeesReport,
  buildCondoExpensesReport,
  buildCondoMeetingsReport,
} from "./builders/condos";
export { buildExecutiveReport } from "./builders/executive";

// Orchestrators
export async function buildReportsDashboardData(ctx: RepoContext): Promise<ReportsDashboardData> {
  const context = await buildReportContext(ctx);
  const finance = {
    receivables: buildReceivablesReport(context),
    overdue: buildFinanceOverdueReport(context),
    repasses: buildRepassesReport(context),
    commissions: buildCommissionsReport(context),
  };
  const rentals = {
    contracts: buildContractsReport(context),
    expiring: buildExpiringContractsReport(context),
    overdue: buildRentalsOverdueReport(context),
    availableProperties: buildAvailablePropertiesReport(context),
  };
  const sales = {
    listings: buildSalesListingsReport(context),
    contracts: buildSalesContractsReport(context),
    proposals: buildSalesProposalsReport(context),
  };
  const crm = {
    funnel: buildCrmFunnelReport(context),
    activities: buildCrmActivitiesReport(context),
  };
  const documents = {
    status: buildDocumentsStatusReport(context),
    expiring: buildDocumentsExpiringReport(context),
  };
  const condos = {
    fees: buildCondoFeesReport(context),
    expenses: buildCondoExpensesReport(context),
    meetings: buildCondoMeetingsReport(context),
  };
  const executive = buildExecutiveReport(context, finance.overdue);

  return {
    generatedAt: new Date().toISOString(),
    overview: {
      kpis: {
        receivableOpen: finance.receivables.totals.aberto ?? 0,
        overdueAmount: finance.overdue.totals.valor ?? 0,
        occupancyPct: executive.totals.occupancy ?? 0,
        activeRentals: context.rentals.filter((r: any) => r.status === "ativo").length,
        availableProperties: rentals.availableProperties.rows.length,
        pendingRepasses: finance.repasses.totals.liquidoPendente ?? 0,
        pendingCommissions: finance.commissions.totals.pendente ?? 0,
        openLeads: context.leads.filter((l: any) => l.funnelStage !== "fechado_ganho" && l.funnelStage !== "fechado_perdido").length,
      },
      alerts: [
        ...finance.overdue.rows.slice(0, 4),
        ...rentals.expiring.rows.slice(0, 3),
        ...rentals.overdue.rows.slice(0, 3),
      ],
      executive,
    },
    finance,
    rentals,
    sales,
    crm,
    documents,
    condos,
  };
}

export async function buildReportById(ctx: RepoContext, reportId: ReportId): Promise<BuiltReport> {
  const data = await buildReportsDashboardData(ctx);
  const byId: Record<ReportId, BuiltReport> = {
    "overview.executive": data.overview.executive,
    "finance.receivables": data.finance.receivables,
    "finance.overdue": data.finance.overdue,
    "finance.repasses": data.finance.repasses,
    "finance.commissions": data.finance.commissions,
    "rentals.contracts": data.rentals.contracts,
    "rentals.expiring": data.rentals.expiring,
    "rentals.overdue": data.rentals.overdue,
    "rentals.available_properties": data.rentals.availableProperties,
    "sales.listings": data.sales.listings,
    "sales.contracts": data.sales.contracts,
    "sales.proposals": data.sales.proposals,
    "crm.funnel": data.crm.funnel,
    "crm.activities": data.crm.activities,
    "documents.status": data.documents.status,
    "documents.expiring": data.documents.expiring,
    "condos.fees": data.condos.fees,
    "condos.expenses": data.condos.expenses,
    "condos.meetings": data.condos.meetings,
  };
  return byId[reportId];
}
