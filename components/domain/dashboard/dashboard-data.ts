import { S } from "@/lib/status";
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
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";
import { billingRepository } from "@/lib/repositories/billing.repository";
import { automationRepository } from "@/lib/repositories/automation.repository";

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
  chargesTodayCount: number;
  overdueChargesCount: number;
  unreadConversationsCount: number;
  pendingRepassesCount: number;
  expiringRentalsCount: number;
  activitiesTodayCount: number;
  recentClientsCount: number;
  failedAutomationsCount: number;
}

// Assemble all dashboard metrics for the current tenancy + user.
export async function buildDashboardData(ctx: RepoContext): Promise<DashboardData> {
  const month = new Date().toISOString().slice(0, 7);

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [
    properties,
    rentals,
    installments,
    overdueInstallments,
    summary,
    proposals,
    leads,
    condos,
    condoFees,
    clients,
    upcoming,
    charges,
    conversations,
    activities,
    repasseList,
    automationRuns,
  ] = await Promise.all([
    propertiesRepository.list(ctx),
    rentalsRepository.list(ctx),
    rentalsRepository.listInstallments(ctx),
    rentalsRepository.listOverdue(ctx),
    financeRepository.summary(ctx),
    salesRepository.listProposals(ctx),
    crmRepository.listLeads(ctx),
    condosRepository.list(ctx),
    condosRepository.listFees(ctx),
    clientsRepository.list(ctx),
    condosRepository.upcomingMeetings(ctx),
    billingRepository.list(ctx),
    whatsappRepository.listConversations(ctx),
    crmRepository.listActivities(ctx),
    financeRepository.listRepasses(ctx),
    automationRepository.listRuns(ctx),
  ]);

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

  const expenseLists = await Promise.all(
    condos.map((c) => condosRepository.listExpenses(ctx, c.id)),
  );
  const condoExpensesMonth = expenseLists
    .flat()
    .filter((e) => e.referenceMonth === month)
    .reduce((s, e) => s + e.totalAmount, 0);

  const upcomingMeetings = upcoming.length;

  const chargesTodayCount = charges.filter(
    (c) => c.effectiveStatus === S.PENDENTE && c.dueDate === today,
  ).length;

  const overdueChargesCount = charges.filter(
    (c) => c.effectiveStatus === S.VENCIDA,
  ).length;

  const unreadConversationsCount = conversations.filter(
    (c) => c.status !== "encerrada",
  ).length;

  const pendingRepassesCount = repasseList.filter(
    (r) => r.status === S.PENDENTE,
  ).length;

  const expiringRentalsCount = rentals.filter(
    (r) => r.status === "ativo" && r.endDate <= thirtyDaysFromNow,
  ).length;

  const activitiesTodayCount = activities.filter(
    (a) => a.scheduledAt?.startsWith(today) && !a.doneAt,
  ).length;

  const recentClientsCount = clients.filter(
    (c) => c.createdAt >= thirtyDaysAgo,
  ).length;

  const failedAutomationsCount = automationRuns.filter(
    (r) => r.status === "error",
  ).length;

  return {
    propertyCount: properties.length,
    clientCount: clients.length,
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
    chargesTodayCount,
    overdueChargesCount,
    unreadConversationsCount,
    pendingRepassesCount,
    expiringRentalsCount,
    activitiesTodayCount,
    recentClientsCount,
    failedAutomationsCount,
  };
}
