import type { FunnelStage } from "@/lib/types/domain";
import { FUNNEL_ORDER } from "@/lib/types/domain";
import type { RepoContext } from "@/lib/repositories/base";
import { automationRepository } from "@/lib/repositories/automation.repository";
import { billingRepository } from "@/lib/repositories/billing.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { crmRepository } from "@/lib/repositories/crm.repository";
import { financeRepository } from "@/lib/repositories/finance.repository";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";

export interface DashboardData {
  propertyCount: number;
  clientCount: number;
  rentalCount: number;
  leadCount: number;
  rentedCount: number;
  occupancyPct: number;
  availableProperties: number;
  myLeads: number;
  chargesTodayCount: number;
  overdueChargesCount: number;
  unreadConversationsCount: number;
  pendingRepassesCount: number;
  expiringRentalsCount: number;
  activitiesTodayCount: number;
  recentClientsCount: number;
  failedAutomationsCount: number;
  overdue: { id: string; label: string; amount: number; dueDate: string }[];
  funnel: { stage: FunnelStage; count: number }[];
  gmvMonth: number;
  receivableMonth: number;
  overdueAmount: number;
  pendingRepasses: number;
}

export async function buildDashboardData(ctx: RepoContext): Promise<DashboardData> {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [properties, clients, rentals, leads, charges, conversations, repasses, activities, runs] =
    await Promise.all([
      propertiesRepository.list(ctx),
      clientsRepository.list(ctx),
      rentalsRepository.list(ctx),
      crmRepository.listLeads(ctx),
      billingRepository.list(ctx),
      whatsappRepository.listConversations(ctx),
      financeRepository.listRepasses(ctx),
      crmRepository.listActivities(ctx),
      automationRepository.listRuns(ctx),
    ]);

  const propertyCount = properties.length;
  const clientCount = clients.length;
  const rentalCount = rentals.length;
  const leadCount = leads.length;
  const rentedCount = properties.filter((property) => property.status === "alugado").length;
  const occupancyPct = propertyCount ? Math.round((rentedCount / propertyCount) * 100) : 0;

  const pendingCharges = charges.filter((charge) => charge.effectiveStatus === "pendente");
  const overdueCharges = charges.filter((charge) => charge.effectiveStatus === "vencida");
  const pendingRepassesCount = repasses.filter((repasse) => repasse.status === "pendente").length;

  return {
    propertyCount,
    clientCount,
    rentalCount,
    leadCount,
    rentedCount,
    occupancyPct,
    availableProperties: propertyCount - rentedCount,
    myLeads: leads.filter((lead) => lead.assignedToUserId === ctx.userId).length,
    chargesTodayCount: pendingCharges.filter((charge) => charge.dueDate === today).length,
    overdueChargesCount: overdueCharges.length,
    unreadConversationsCount: conversations.length,
    pendingRepassesCount,
    expiringRentalsCount: rentals.filter(
      (rental) => rental.status === "ativo" && rental.endDate <= thirtyDaysFromNow,
    ).length,
    activitiesTodayCount: activities.filter((activity) => activity.scheduledAt?.slice(0, 10) === today).length,
    recentClientsCount: clientCount,
    failedAutomationsCount: runs.filter((run) => run.status === "error").length,
    overdue: overdueCharges.map((charge) => ({
      id: charge.id,
      label: charge.customerName ?? charge.description ?? "Cobrança vencida",
      amount: charge.amount,
      dueDate: charge.dueDate,
    })),
    funnel: FUNNEL_ORDER.map((stage) => ({
      stage,
      count: leads.filter((lead) => lead.funnelStage === stage).length,
    })),
    gmvMonth: charges.reduce((sum, charge) => sum + charge.amount, 0),
    receivableMonth: charges
      .filter((charge) => charge.effectiveStatus !== "paga")
      .reduce((sum, charge) => sum + charge.amount, 0),
    overdueAmount: overdueCharges.reduce((sum, charge) => sum + charge.amount, 0),
    pendingRepasses: pendingRepassesCount,
  };
}

export const buildSimplifiedDashboardData = buildDashboardData;
