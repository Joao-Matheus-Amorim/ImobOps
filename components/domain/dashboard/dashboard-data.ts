import { S } from "@/lib/status";
import type { FunnelStage } from "@/lib/types/domain";
import { FUNNEL_ORDER } from "@/lib/types/domain";
import type { RepoContext } from "@/lib/repositories/base";
import { automationRepository } from "@/lib/repositories/automation.repository";
import { billingRepository } from "@/lib/repositories/billing.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { condosRepository } from "@/lib/repositories/condos.repository";
import { crmRepository } from "@/lib/repositories/crm.repository";
import { financeRepository } from "@/lib/repositories/finance.repository";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { salesRepository } from "@/lib/repositories/sales.repository";
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";

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

  const rentedCount = properties.filter((property) => property.status === "alugado").length;
  const occupancyPct = properties.length ? Math.round((rentedCount / properties.length) * 100) : 0;
  const gmvMonth = installments
    .filter((installment) => installment.referenceMonth === month)
    .reduce((sum, installment) => sum + installment.amount, 0);
  const condoOverdueAmount = condoFees
    .filter((fee) => fee.status === "atrasado")
    .reduce((sum, fee) => sum + fee.amount, 0);
  const expenseLists = await Promise.all(condos.map((condo) => condosRepository.listExpenses(ctx, condo.id)));
  const condoExpensesMonth = expenseLists
    .flat()
    .filter((expense) => expense.referenceMonth === month)
    .reduce((sum, expense) => sum + expense.totalAmount, 0);

  return {
    propertyCount: properties.length,
    clientCount: clients.length,
    rentalCount: rentals.length,
    leadCount: leads.length,
    rentedCount,
    occupancyPct,
    availableProperties: properties.filter((property) => property.status === "disponivel").length,
    gmvMonth,
    receivableMonth: summary.receivableThisMonth,
    overdueAmount: summary.overdueAmount,
    pendingRepasses: summary.pendingRepasses,
    pendingCommissions: summary.pendingCommissions,
    overdue: overdueInstallments.slice(0, 5).map((installment) => ({
      id: installment.id,
      label: `Parcela ${installment.referenceMonth}`,
      amount: installment.amount,
      dueDate: installment.dueDate,
    })),
    funnel: FUNNEL_ORDER.map((stage) => ({
      stage,
      count: leads.filter((lead) => lead.funnelStage === stage).length,
    })),
    myLeads: leads.filter((lead) => lead.assignedToUserId === ctx.userId).length,
    visitsThisWeek: leads.filter((lead) => lead.funnelStage === "visita_agendada").length,
    openProposals: proposals.filter((proposal) => proposal.status !== "aceita" && proposal.status !== "recusada").length,
    condoCount: condos.length,
    condoOverdueAmount,
    condoExpensesMonth,
    upcomingMeetings: upcoming.length,
    chargesTodayCount: charges.filter((charge) => charge.effectiveStatus === S.PENDENTE && charge.dueDate === today).length,
    overdueChargesCount: charges.filter((charge) => charge.effectiveStatus === S.VENCIDA).length,
    unreadConversationsCount: conversations.filter((conversation) => conversation.status !== "encerrada").length,
    pendingRepassesCount: repasseList.filter((repasse) => repasse.status === S.PENDENTE).length,
    expiringRentalsCount: rentals.filter(
      (rental) => rental.status === "ativo" && rental.endDate <= thirtyDaysFromNow,
    ).length,
    activitiesTodayCount: activities.filter((activity) => activity.scheduledAt?.startsWith(today) && !activity.doneAt)
      .length,
    recentClientsCount: clients.filter((client) => client.createdAt >= thirtyDaysAgo).length,
    failedAutomationsCount: automationRuns.filter((run) => run.status === "error").length,
  };
}

export const buildSimplifiedDashboardData = buildDashboardData;
