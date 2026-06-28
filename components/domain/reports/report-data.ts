import type { FunnelStage } from "@/lib/types/domain";
import { FUNNEL_ORDER } from "@/lib/types/domain";
import type { RepoContext } from "@/lib/repositories/base";
import { billingRepository } from "@/lib/repositories/billing.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { condosRepository } from "@/lib/repositories/condos.repository";
import { crmRepository } from "@/lib/repositories/crm.repository";
import { financeRepository } from "@/lib/repositories/finance.repository";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { salesRepository } from "@/lib/repositories/sales.repository";
import { routes } from "@/lib/routes";

export type AlertSeverity = "critical" | "warning" | "info";

export interface ReportAlert {
  id: string;
  severity: AlertSeverity;
  area: string;
  title: string;
  description: string;
  href: string;
}

export interface ReportRow {
  id: string;
  label: string;
  detail: string;
  amount?: number;
  date?: string;
  href: string;
}

export interface ReportsData {
  generatedAt: string;
  kpis: {
    occupancyPct: number;
    activeRentals: number;
    availableProperties: number;
    receivableThisMonth: number;
    overdueAmount: number;
    pendingRepasses: number;
    pendingCommissions: number;
    openCharges: number;
    overdueCharges: number;
    openLeads: number;
    openProposals: number;
  };
  alerts: ReportAlert[];
  funnel: { stage: FunnelStage; count: number }[];
  finance: {
    overdueCharges: ReportRow[];
    dueSoonCharges: ReportRow[];
    overdueInstallments: ReportRow[];
  };
  operations: {
    contractsEndingSoon: ReportRow[];
    visitsNext7Days: ReportRow[];
    overdueCondoFees: ReportRow[];
  };
}

const OPEN_LEAD_STAGES: FunnelStage[] = ["novo", "qualificado", "visita_agendada", "proposta"];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function inDateRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export async function buildReportsData(ctx: RepoContext): Promise<ReportsData> {
  const today = todayISO();
  const next7 = addDaysISO(today, 7);
  const next30 = addDaysISO(today, 30);

  const [
    properties,
    rentals,
    overdueInstallments,
    summary,
    charges,
    repasses,
    commissions,
    leads,
    activities,
    proposals,
    condoFees,
    clients,
  ] = await Promise.all([
    propertiesRepository.list(ctx),
    rentalsRepository.list(ctx),
    rentalsRepository.listOverdue(ctx),
    financeRepository.summary(ctx),
    billingRepository.list(ctx),
    financeRepository.listRepasses(ctx),
    financeRepository.listCommissions(ctx),
    crmRepository.listLeads(ctx),
    crmRepository.listActivities(ctx),
    salesRepository.listProposals(ctx),
    condosRepository.listFees(ctx),
    clientsRepository.list(ctx),
  ]);

  const clientName = new Map(clients.map((client) => [client.id, client.name]));
  const rentalById = new Map(rentals.map((rental) => [rental.id, rental]));
  const rentedCount = properties.filter((property) => property.status === "alugado").length;
  const occupancyPct = properties.length ? Math.round((rentedCount / properties.length) * 100) : 0;

  const openCharges = charges.filter((charge) =>
    charge.effectiveStatus !== "paga" && charge.effectiveStatus !== "cancelada",
  );
  const overdueCharges = charges.filter((charge) => charge.effectiveStatus === "vencida");
  const dueSoonCharges = openCharges.filter((charge) => inDateRange(charge.dueDate, today, next7));
  const pendingRepasses = repasses.filter((repasse) => repasse.status === "pendente");
  const pendingCommissions = commissions.filter((commission) => commission.status === "pendente");
  const openLeads = leads.filter((lead) => OPEN_LEAD_STAGES.includes(lead.funnelStage));
  const openProposals = proposals.filter((proposal) => proposal.status !== "aceita" && proposal.status !== "recusada");
  const contractsEndingSoon = rentals.filter((rental) =>
    rental.status === "ativo" && inDateRange(rental.endDate, today, next30),
  );
  const visitsNext7Days = activities.filter((activity) => {
    if (activity.kind !== "visita" || !activity.scheduledAt || activity.doneAt) return false;
    return inDateRange(activity.scheduledAt.slice(0, 10), today, next7);
  });
  const overdueCondoFees = condoFees.filter((fee) => fee.status === "atrasado");

  const alerts: ReportAlert[] = [];
  if (summary.overdueAmount > 0 || overdueCharges.length > 0) {
    alerts.push({
      id: "finance-overdue",
      severity: "critical",
      area: "Financeiro",
      title: "Inadimplência exige ação",
      description: `${overdueInstallments.length} parcela(s) e ${overdueCharges.length} cobrança(s) vencidas.`,
      href: routes.finance,
    });
  }
  if (dueSoonCharges.length > 0) {
    alerts.push({
      id: "charges-due-soon",
      severity: "warning",
      area: "Cobrança",
      title: "Cobranças vencem nos próximos 7 dias",
      description: `${dueSoonCharges.length} cobrança(s) abertas para acompanhar ou enviar pelo WhatsApp.`,
      href: routes.finance,
    });
  }
  if (pendingRepasses.length > 0) {
    alerts.push({
      id: "repasses-pending",
      severity: "warning",
      area: "Repasses",
      title: "Repasses pendentes",
      description: `${pendingRepasses.length} repasse(s) aguardando baixa aos proprietários.`,
      href: routes.finance,
    });
  }
  if (pendingCommissions.length > 0) {
    alerts.push({
      id: "commissions-pending",
      severity: "info",
      area: "Vendas",
      title: "Comissões em aberto",
      description: `${pendingCommissions.length} comissão(ões) pendente(s) de pagamento.`,
      href: routes.finance,
    });
  }
  if (contractsEndingSoon.length > 0) {
    alerts.push({
      id: "contracts-ending",
      severity: "warning",
      area: "Locação",
      title: "Contratos terminando em até 30 dias",
      description: `${contractsEndingSoon.length} contrato(s) precisam de renovação ou encerramento.`,
      href: routes.rentals,
    });
  }
  if (visitsNext7Days.length > 0) {
    alerts.push({
      id: "visits-next-week",
      severity: "info",
      area: "CRM",
      title: "Visitas agendadas na semana",
      description: `${visitsNext7Days.length} visita(s) para acompanhar no CRM/calendário.`,
      href: routes.crm,
    });
  }
  if (overdueCondoFees.length > 0) {
    alerts.push({
      id: "condo-fees-overdue",
      severity: "warning",
      area: "Condomínio",
      title: "Taxas de condomínio em atraso",
      description: `${overdueCondoFees.length} taxa(s) atrasada(s) para cobrança.`,
      href: routes.condos,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      occupancyPct,
      activeRentals: rentals.filter((rental) => rental.status === "ativo").length,
      availableProperties: properties.filter((property) => property.status === "disponivel").length,
      receivableThisMonth: summary.receivableThisMonth,
      overdueAmount: summary.overdueAmount,
      pendingRepasses: summary.pendingRepasses,
      pendingCommissions: summary.pendingCommissions,
      openCharges: openCharges.length,
      overdueCharges: overdueCharges.length,
      openLeads: openLeads.length,
      openProposals: openProposals.length,
    },
    alerts,
    funnel: FUNNEL_ORDER.map((stage) => ({
      stage,
      count: leads.filter((lead) => lead.funnelStage === stage).length,
    })),
    finance: {
      overdueCharges: overdueCharges.slice(0, 6).map((charge) => ({
        id: charge.id,
        label: charge.customerName ?? charge.description ?? "Cobrança",
        detail: `${charge.method.toUpperCase()} · venc. ${charge.dueDate}`,
        amount: charge.amount,
        date: charge.dueDate,
        href: routes.finance,
      })),
      dueSoonCharges: dueSoonCharges.slice(0, 6).map((charge) => ({
        id: charge.id,
        label: charge.customerName ?? charge.description ?? "Cobrança",
        detail: `${charge.method.toUpperCase()} · vence ${charge.dueDate}`,
        amount: charge.amount,
        date: charge.dueDate,
        href: routes.finance,
      })),
      overdueInstallments: overdueInstallments.slice(0, 6).map((installment) => {
        const rental = rentalById.get(installment.contractId);
        const tenant = rental ? clientName.get(rental.tenantClientId) : null;
        return {
          id: installment.id,
          label: tenant ?? `Parcela ${installment.referenceMonth}`,
          detail: `Locação ${installment.referenceMonth} · venc. ${installment.dueDate}`,
          amount: installment.amount,
          date: installment.dueDate,
          href: routes.rental(installment.contractId),
        };
      }),
    },
    operations: {
      contractsEndingSoon: contractsEndingSoon.slice(0, 6).map((rental) => ({
        id: rental.id,
        label: clientName.get(rental.tenantClientId) ?? "Contrato de locação",
        detail: `Termina em ${rental.endDate}`,
        date: rental.endDate,
        href: routes.rental(rental.id),
      })),
      visitsNext7Days: visitsNext7Days.slice(0, 6).map((activity) => ({
        id: activity.id,
        label: activity.description || "Visita agendada",
        detail: activity.scheduledAt ? `Agendada para ${activity.scheduledAt}` : "Sem horário definido",
        date: activity.scheduledAt ?? undefined,
        href: routes.crm,
      })),
      overdueCondoFees: overdueCondoFees.slice(0, 6).map((fee) => ({
        id: fee.id,
        label: `Taxa ${fee.referenceMonth}`,
        detail: `Venc. ${fee.dueDate}`,
        amount: fee.amount,
        date: fee.dueDate,
        href: routes.condos,
      })),
    },
  };
}
