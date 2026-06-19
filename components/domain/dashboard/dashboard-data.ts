import type { FunnelStage } from "@/lib/types/domain";
import { FUNNEL_ORDER } from "@/lib/types/domain";
import type { RepoContext } from "@/lib/repositories/base";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { financeRepository } from "@/lib/repositories/finance.repository";
import { salesRepository } from "@/lib/repositories/sales.repository";
import { condosRepository } from "@/lib/repositories/condos.repository";
import { crmRepository } from "@/lib/repositories/crm.repository";

export interface DashboardData {
  propertyCount: number;
  clientCount: number;
  rentalCount: number;
  leadCount: number;
  rentedCount: number;
  occupancyPct: number;
  availableProperties: number;
  gmvMonth: number;
  receivableMonth: number;
  overdueAmount: number;
  pendingRepasses: number;
  pendingCommissions: number;
  overdue: { id: string; label: string; amount: number; dueDate: string }[];
  funnel: { stage: FunnelStage; count: number }[];
  myLeads: number;
  visitsThisWeek: number;
  openProposals: number;
  condoCount: number;
  condoOverdueAmount: number;
  condoExpensesMonth: number;
  upcomingMeetings: number;
}

// Assemble all dashboard metrics for the current tenancy + user.
export function buildDashboardData(ctx: RepoContext): DashboardData {
  const month = new Date().toISOString().slice(0, 7);

  const properties = propertiesRepository.list(ctx);
  const rentals = rentalsRepository.list(ctx);
  const installments = rentalsRepository.listInstallments(ctx);
  const overdueInstallments = rentalsRepository.listOverdue(ctx);
  const summary = financeRepository.summary(ctx);
  const proposals = salesRepository.listProposals(ctx);
  const leads = crmRepository.listLeads(ctx);
  const condos = condosRepository.list(ctx);
  const condoFees = condosRepository.listFees(ctx);

  const rentedCount = properties.filter((p) => p.status === "alugado").length;
  const occupancyPct = properties.length
    ? Math.round((rentedCount / properties.length) * 100)
    : 0;

  const gmvMonth = installments
    .filter((i) => i.referenceMonth === month)
    .reduce((s, i) => s + i.amount, 0);

  const funnel = FUNNEL_ORDER.map((stage) => ({
    stage,
    count: leads.filter((l) => l.funnelStage === stage).length,
  }));

  const condoOverdueAmount = condoFees
    .filter((f) => f.status === "atrasado")
    .reduce((s, f) => s + f.amount, 0);

  const condoExpensesMonth = condos
    .flatMap((c) => condosRepository.listExpenses(ctx, c.id))
    .filter((e) => e.referenceMonth === month)
    .reduce((s, e) => s + e.totalAmount, 0);

  const upcomingMeetings = condosRepository.upcomingMeetings(ctx).length;

  return {
    propertyCount: properties.length,
    clientCount: clientsRepository.list(ctx).length,
    rentalCount: rentals.length,
    leadCount: leads.length,
    rentedCount,
    occupancyPct,
    availableProperties: properties.filter((p) => p.status === "disponivel").length,
    gmvMonth,
    receivableMonth: summary.receivableThisMonth,
    overdueAmount: summary.overdueAmount,
    pendingRepasses: summary.pendingRepasses,
    pendingCommissions: summary.pendingCommissions,
    overdue: overdueInstallments.slice(0, 5).map((i) => ({
      id: i.id,
      label: `Parcela ${i.referenceMonth}`,
      amount: i.amount,
      dueDate: i.dueDate,
    })),
    funnel,
    myLeads: leads.filter((l) => l.assignedToUserId === ctx.userId).length,
    visitsThisWeek: leads.filter((l) => l.funnelStage === "visita_agendada").length,
    openProposals: proposals.filter((p) => p.status !== "aceita" && p.status !== "recusada").length,
    condoCount: condos.length,
    condoOverdueAmount,
    condoExpensesMonth,
    upcomingMeetings,
  };
}
