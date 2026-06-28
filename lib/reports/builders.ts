import { billingRepository } from "@/lib/repositories/billing.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { condosRepository } from "@/lib/repositories/condos.repository";
import { crmRepository } from "@/lib/repositories/crm.repository";
import { documentsRepository } from "@/lib/repositories/documents.repository";
import { financeRepository } from "@/lib/repositories/finance.repository";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { salesRepository } from "@/lib/repositories/sales.repository";
import { usersRepository } from "@/lib/repositories/users.repository";
import type { RepoContext } from "@/lib/repositories/base";
import { routes } from "@/lib/routes";
import type { ReportDefinition, ReportId } from "./definitions";
import { reportDefinition } from "./definitions";
import { DOCUMENT_KIND_LABELS, DOCUMENT_STATUS_LABELS, FUNNEL_ORDER, FUNNEL_STAGE_LABELS } from "@/lib/types/domain";

export type ReportValue = string | number | null;

export interface ReportRowData {
  id: string;
  href?: string;
  values: Record<string, ReportValue>;
}

export interface BuiltReport {
  definition: ReportDefinition;
  generatedAt: string;
  totals: Record<string, number>;
  rows: ReportRowData[];
}

export interface ReportsDashboardData {
  generatedAt: string;
  overview: {
    kpis: Record<string, number>;
    alerts: ReportRowData[];
    executive: BuiltReport;
  };
  finance: {
    receivables: BuiltReport;
    overdue: BuiltReport;
    repasses: BuiltReport;
    commissions: BuiltReport;
  };
  rentals: {
    contracts: BuiltReport;
    expiring: BuiltReport;
    overdue: BuiltReport;
    availableProperties: BuiltReport;
  };
  sales: {
    listings: BuiltReport;
    contracts: BuiltReport;
    proposals: BuiltReport;
  };
  crm: {
    funnel: BuiltReport;
    activities: BuiltReport;
  };
  documents: {
    status: BuiltReport;
    expiring: BuiltReport;
  };
  condos: {
    fees: BuiltReport;
    expenses: BuiltReport;
    meetings: BuiltReport;
  };
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  const startTime = new Date(`${start}T00:00:00Z`).getTime();
  const endTime = new Date(`${end}T00:00:00Z`).getTime();
  return Math.round((endTime - startTime) / 86_400_000);
}

function addDaysISO(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function buildReportContext(ctx: RepoContext) {
  const [
    properties,
    clients,
    rentals,
    installments,
    charges,
    repasses,
    commissions,
    listings,
    saleContracts,
    proposals,
    leads,
    activities,
    documents,
    users,
    condos,
    condoFees,
    condoMeetings,
  ] = await Promise.all([
    propertiesRepository.list(ctx),
    clientsRepository.list(ctx),
    rentalsRepository.list(ctx),
    rentalsRepository.listInstallments(ctx),
    billingRepository.list(ctx),
    financeRepository.listRepasses(ctx),
    financeRepository.listCommissions(ctx),
    salesRepository.listListings(ctx),
    salesRepository.listSaleContracts(ctx),
    salesRepository.listProposals(ctx),
    crmRepository.listLeads(ctx),
    crmRepository.listActivities(ctx),
    documentsRepository.list(ctx).catch(() => []),
    usersRepository.list(ctx),
    condosRepository.list(ctx),
    condosRepository.listFees(ctx),
    condosRepository.listMeetings(ctx),
  ]);
  const condoUnits = (await Promise.all(condos.map((condo) => condosRepository.listUnits(ctx, condo.id)))).flat();
  const condoExpenses = (await Promise.all(condos.map((condo) => condosRepository.listExpenses(ctx, condo.id)))).flat();

  return {
    properties,
    clients,
    rentals,
    installments,
    charges,
    repasses,
    commissions,
    listings,
    saleContracts,
    proposals,
    leads,
    activities,
    documents,
    users,
    condos,
    condoUnits,
    condoFees,
    condoExpenses,
    condoMeetings,
    propertyById: new Map(properties.map((property) => [property.id, property])),
    clientById: new Map(clients.map((client) => [client.id, client])),
    rentalById: new Map(rentals.map((rental) => [rental.id, rental])),
    listingById: new Map(listings.map((listing) => [listing.id, listing])),
    userById: new Map(users.map((user) => [user.id, user])),
    condoById: new Map(condos.map((condo) => [condo.id, condo])),
    condoUnitById: new Map(condoUnits.map((unit) => [unit.id, unit])),
  };
}

function buildReceivablesReport(context: Awaited<ReturnType<typeof buildReportContext>>): BuiltReport {
  const rows: ReportRowData[] = context.charges.map((charge) => ({
    id: charge.id,
    href: routes.finance,
    values: {
      cliente: charge.customerName ?? "-",
      descricao: charge.description ?? "Cobrança",
      origem: charge.sourceType,
      metodo: charge.method.toUpperCase(),
      vencimento: charge.dueDate,
      valor: money(charge.amount),
      status: charge.effectiveStatus,
    },
  }));
  return {
    definition: reportDefinition("finance.receivables"),
    generatedAt: new Date().toISOString(),
    totals: {
      total: money(context.charges.reduce((sum, charge) => sum + charge.amount, 0)),
      aberto: money(context.charges.filter((charge) => charge.effectiveStatus !== "paga" && charge.effectiveStatus !== "cancelada").reduce((sum, charge) => sum + charge.amount, 0)),
      vencido: money(context.charges.filter((charge) => charge.effectiveStatus === "vencida").reduce((sum, charge) => sum + charge.amount, 0)),
    },
    rows,
  };
}

function buildFinanceOverdueReport(context: Awaited<ReturnType<typeof buildReportContext>>): BuiltReport {
  const today = todayISO();
  const rows = context.installments
    .filter((installment) => installment.status === "atrasado")
    .map((installment) => {
      const rental = context.rentalById.get(installment.contractId);
      const property = rental ? context.propertyById.get(rental.propertyId) : null;
      const tenant = rental ? context.clientById.get(rental.tenantClientId) : null;
      return {
        id: installment.id,
        href: routes.rental(installment.contractId),
        values: {
          cliente: tenant?.name ?? "-",
          imovel: property?.address ?? "-",
          contrato: installment.contractId,
          referencia: installment.referenceMonth,
          vencimento: installment.dueDate,
          diasAtraso: Math.max(0, daysBetween(installment.dueDate, today)),
          valor: money(installment.amount),
          status: installment.status,
        },
      } satisfies ReportRowData;
    });
  return {
    definition: reportDefinition("finance.overdue"),
    generatedAt: new Date().toISOString(),
    totals: {
      parcelas: rows.length,
      valor: money(context.installments.filter((installment) => installment.status === "atrasado").reduce((sum, installment) => sum + installment.amount, 0)),
    },
    rows,
  };
}

function buildRepassesReport(context: Awaited<ReturnType<typeof buildReportContext>>): BuiltReport {
  const rows = context.repasses.map((repasse) => {
    const rental = context.rentalById.get(repasse.contractId);
    const property = rental ? context.propertyById.get(rental.propertyId) : null;
    const landlord = rental ? context.clientById.get(rental.landlordClientId) : null;
    return {
      id: repasse.id,
      href: rental ? routes.rental(rental.id) : routes.finance,
      values: {
        proprietario: landlord?.name ?? "-",
        imovel: property?.address ?? "-",
        referencia: repasse.referenceMonth,
        bruto: money(repasse.grossAmount),
        taxaAdmin: money(repasse.adminFeeAmount),
        liquido: money(repasse.netAmount),
        status: repasse.status,
        pagoEm: repasse.paidAt ?? "-",
      },
    } satisfies ReportRowData;
  });
  return {
    definition: reportDefinition("finance.repasses"),
    generatedAt: new Date().toISOString(),
    totals: {
      bruto: money(context.repasses.reduce((sum, repasse) => sum + repasse.grossAmount, 0)),
      liquidoPendente: money(context.repasses.filter((repasse) => repasse.status === "pendente").reduce((sum, repasse) => sum + repasse.netAmount, 0)),
    },
    rows,
  };
}

function buildCommissionsReport(context: Awaited<ReturnType<typeof buildReportContext>>): BuiltReport {
  const rows = context.commissions.map((commission) => {
    const saleContract = context.saleContracts.find((contract) => contract.id === commission.saleContractId);
    const listing = saleContract ? context.listingById.get(saleContract.listingId) : null;
    const property = listing ? context.propertyById.get(listing.propertyId) : null;
    const broker = context.userById.get(commission.brokerUserId);
    return {
      id: commission.id,
      href: listing ? routes.sale(listing.id) : routes.finance,
      values: {
        venda: property?.address ?? commission.saleContractId,
        corretor: broker?.displayName ?? "-",
        percentual: commission.pct,
        valor: money(commission.amount),
        status: commission.status,
        pagoEm: commission.paidAt ?? "-",
      },
    } satisfies ReportRowData;
  });
  return {
    definition: reportDefinition("finance.commissions"),
    generatedAt: new Date().toISOString(),
    totals: {
      pendente: money(context.commissions.filter((commission) => commission.status === "pendente").reduce((sum, commission) => sum + commission.amount, 0)),
      pago: money(context.commissions.filter((commission) => commission.status === "paga").reduce((sum, commission) => sum + commission.amount, 0)),
    },
    rows,
  };
}

function buildContractsReport(context: Awaited<ReturnType<typeof buildReportContext>>): BuiltReport {
  const rows = context.rentals.map((rental) => {
    const property = context.propertyById.get(rental.propertyId);
    const landlord = context.clientById.get(rental.landlordClientId);
    const tenant = context.clientById.get(rental.tenantClientId);
    return {
      id: rental.id,
      href: routes.rental(rental.id),
      values: {
        imovel: property?.address ?? "-",
        locador: landlord?.name ?? "-",
        locatario: tenant?.name ?? "-",
        inicio: rental.startDate,
        fim: rental.endDate,
        aluguel: money(rental.monthlyValue),
        vencimento: `Dia ${rental.dueDay}`,
        status: rental.status,
      },
    } satisfies ReportRowData;
  });
  return {
    definition: reportDefinition("rentals.contracts"),
    generatedAt: new Date().toISOString(),
    totals: {
      contratos: rows.length,
      aluguelMensal: money(context.rentals.filter((rental) => rental.status === "ativo").reduce((sum, rental) => sum + rental.monthlyValue, 0)),
    },
    rows,
  };
}

function buildExpiringContractsReport(context: Awaited<ReturnType<typeof buildReportContext>>): BuiltReport {
  const today = todayISO();
  const end = addDaysISO(today, 90);
  const expiring = context.rentals.filter((rental) => rental.status === "ativo" && inRange(rental.endDate, today, end));
  const rows = expiring.map((rental) => {
    const property = context.propertyById.get(rental.propertyId);
    const landlord = context.clientById.get(rental.landlordClientId);
    const tenant = context.clientById.get(rental.tenantClientId);
    return {
      id: rental.id,
      href: routes.rental(rental.id),
      values: {
        imovel: property?.address ?? "-",
        locador: landlord?.name ?? "-",
        locatario: tenant?.name ?? "-",
        fim: rental.endDate,
        diasRestantes: daysBetween(today, rental.endDate),
        aluguel: money(rental.monthlyValue),
        status: rental.status,
      },
    } satisfies ReportRowData;
  });
  return {
    definition: reportDefinition("rentals.expiring"),
    generatedAt: new Date().toISOString(),
    totals: { contratos: rows.length },
    rows,
  };
}

function buildRentalsOverdueReport(context: Awaited<ReturnType<typeof buildReportContext>>): BuiltReport {
  const overdueByContract = new Map<string, typeof context.installments>();
  for (const installment of context.installments.filter((item) => item.status === "atrasado")) {
    overdueByContract.set(installment.contractId, [...(overdueByContract.get(installment.contractId) ?? []), installment]);
  }
  const rows = [...overdueByContract.entries()].map(([contractId, installments]) => {
    const rental = context.rentalById.get(contractId);
    const property = rental ? context.propertyById.get(rental.propertyId) : null;
    const landlord = rental ? context.clientById.get(rental.landlordClientId) : null;
    const tenant = rental ? context.clientById.get(rental.tenantClientId) : null;
    const oldest = installments.toSorted((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    return {
      id: contractId,
      href: routes.rental(contractId),
      values: {
        imovel: property?.address ?? "-",
        locador: landlord?.name ?? "-",
        locatario: tenant?.name ?? "-",
        parcelas: installments.length,
        vencimentoMaisAntigo: oldest?.dueDate ?? "-",
        total: money(installments.reduce((sum, installment) => sum + installment.amount, 0)),
        status: rental?.status ?? "inadimplente",
      },
    } satisfies ReportRowData;
  });
  return {
    definition: reportDefinition("rentals.overdue"),
    generatedAt: new Date().toISOString(),
    totals: {
      contratos: rows.length,
      total: money([...overdueByContract.values()].flat().reduce((sum, installment) => sum + installment.amount, 0)),
    },
    rows,
  };
}

function buildAvailablePropertiesReport(context: Awaited<ReturnType<typeof buildReportContext>>): BuiltReport {
  const available = context.properties.filter(
    (property) => property.status === "disponivel" && (property.availability === "locacao" || property.availability === "ambos"),
  );
  const rows = available.map((property) => ({
    id: property.id,
    href: routes.property(property.id),
    values: {
      imovel: property.address,
      proprietario: property.ownerClientId ? context.clientById.get(property.ownerClientId)?.name ?? "-" : "-",
      tipo: property.kind,
      area: property.areaM2 ? `${property.areaM2} m²` : "-",
      dormitorios: property.bedrooms ?? 0,
      status: property.status,
    },
  } satisfies ReportRowData));
  return {
    definition: reportDefinition("rentals.available_properties"),
    generatedAt: new Date().toISOString(),
    totals: { imoveis: rows.length },
    rows,
  };
}

function buildSalesListingsReport(context: Awaited<ReturnType<typeof buildReportContext>>): BuiltReport {
  const rows = context.listings.map((listing) => {
    const property = context.propertyById.get(listing.propertyId);
    const owner = property?.ownerClientId ? context.clientById.get(property.ownerClientId) : null;
    const proposalCount = context.proposals.filter((proposal) => proposal.listingId === listing.id).length;
    return {
      id: listing.id,
      href: routes.sale(listing.id),
      values: {
        imovel: property?.address ?? "-",
        proprietario: owner?.name ?? "-",
        valorPedido: money(listing.askingPrice),
        comissao: listing.commissionPct,
        propostas: proposalCount,
        status: listing.status,
      },
    } satisfies ReportRowData;
  });
  return {
    definition: reportDefinition("sales.listings"),
    generatedAt: new Date().toISOString(),
    totals: {
      listagens: rows.length,
      valorPedido: money(context.listings.reduce((sum, listing) => sum + listing.askingPrice, 0)),
    },
    rows,
  };
}

function buildSalesContractsReport(context: Awaited<ReturnType<typeof buildReportContext>>): BuiltReport {
  const rows = context.saleContracts.map((contract) => {
    const listing = context.listingById.get(contract.listingId);
    const property = listing ? context.propertyById.get(listing.propertyId) : null;
    return {
      id: contract.id,
      href: listing ? routes.sale(listing.id) : routes.sales,
      values: {
        imovel: property?.address ?? "-",
        comprador: context.clientById.get(contract.buyerClientId)?.name ?? "-",
        vendedor: context.clientById.get(contract.sellerClientId)?.name ?? "-",
        valorFinal: money(contract.finalPrice),
        assinadoEm: contract.signedAt ?? "-",
        status: contract.status,
      },
    } satisfies ReportRowData;
  });
  return {
    definition: reportDefinition("sales.contracts"),
    generatedAt: new Date().toISOString(),
    totals: {
      contratos: rows.length,
      valorFinal: money(context.saleContracts.reduce((sum, contract) => sum + contract.finalPrice, 0)),
    },
    rows,
  };
}

function buildSalesProposalsReport(context: Awaited<ReturnType<typeof buildReportContext>>): BuiltReport {
  const rows = context.proposals.map((proposal) => {
    const listing = context.listingById.get(proposal.listingId);
    const property = listing ? context.propertyById.get(listing.propertyId) : null;
    const broker = context.userById.get(proposal.brokerUserId);
    return {
      id: proposal.id,
      href: listing ? routes.sale(listing.id) : routes.sales,
      values: {
        imovel: property?.address ?? "-",
        comprador: context.clientById.get(proposal.buyerClientId)?.name ?? "-",
        corretor: broker?.displayName ?? "-",
        valor: money(proposal.offeredPrice),
        status: proposal.status,
        condicoes: proposal.conditions ?? "-",
      },
    } satisfies ReportRowData;
  });
  return {
    definition: reportDefinition("sales.proposals"),
    generatedAt: new Date().toISOString(),
    totals: {
      propostas: rows.length,
      abertas: context.proposals.filter((proposal) => proposal.status !== "aceita" && proposal.status !== "recusada").length,
    },
    rows,
  };
}

function buildCrmFunnelReport(context: Awaited<ReturnType<typeof buildReportContext>>): BuiltReport {
  const rows = FUNNEL_ORDER.map((stage) => {
    const leads = context.leads.filter((lead) => lead.funnelStage === stage);
    return {
      id: stage,
      href: routes.crm,
      values: {
        etapa: FUNNEL_STAGE_LABELS[stage],
        quantidade: leads.length,
        locacao: leads.filter((lead) => lead.interest === "locacao").length,
        venda: leads.filter((lead) => lead.interest === "venda").length,
        condominio: leads.filter((lead) => lead.interest === "condominio").length,
        outro: leads.filter((lead) => lead.interest === "outro").length,
      },
    } satisfies ReportRowData;
  });
  return {
    definition: reportDefinition("crm.funnel"),
    generatedAt: new Date().toISOString(),
    totals: { leads: context.leads.length, abertos: context.leads.filter((lead) => lead.funnelStage !== "fechado_ganho" && lead.funnelStage !== "fechado_perdido").length },
    rows,
  };
}

function buildCrmActivitiesReport(context: Awaited<ReturnType<typeof buildReportContext>>): BuiltReport {
  const leadById = new Map(context.leads.map((lead) => [lead.id, lead]));
  const rows = context.activities.map((activity) => {
    const lead = leadById.get(activity.leadId);
    const client = lead?.clientId ? context.clientById.get(lead.clientId) : null;
    const user = activity.byUserId ? context.userById.get(activity.byUserId) : null;
    return {
      id: activity.id,
      href: routes.crm,
      values: {
        lead: client?.name ?? lead?.id ?? "Lead",
        tipo: activity.kind,
        descricao: activity.description ?? "-",
        agendadoPara: activity.scheduledAt ?? "-",
        concluidoEm: activity.doneAt ?? "-",
        responsavel: user?.displayName ?? "-",
      },
    } satisfies ReportRowData;
  });
  return {
    definition: reportDefinition("crm.activities"),
    generatedAt: new Date().toISOString(),
    totals: { atividades: rows.length, visitasPendentes: context.activities.filter((activity) => activity.kind === "visita" && activity.scheduledAt && !activity.doneAt).length },
    rows,
  };
}

function documentOrigin(context: Awaited<ReturnType<typeof buildReportContext>>, entityType: string, entityId: string): { label: string; href?: string } {
  if (entityType === "client") return { label: context.clientById.get(entityId)?.name ?? entityId, href: routes.client(entityId) };
  if (entityType === "property") return { label: context.propertyById.get(entityId)?.address ?? entityId, href: routes.property(entityId) };
  if (entityType === "rental_contract") {
    const rental = context.rentalById.get(entityId);
    const property = rental ? context.propertyById.get(rental.propertyId) : null;
    return { label: property?.address ?? entityId, href: routes.rental(entityId) };
  }
  if (entityType === "sale_contract") return { label: entityId, href: routes.sales };
  if (entityType === "condo") return { label: context.condoById.get(entityId)?.name ?? entityId, href: routes.condo(entityId) };
  if (entityType === "lead") return { label: entityId, href: routes.crm };
  return { label: entityId };
}

function buildDocumentsStatusReport(context: Awaited<ReturnType<typeof buildReportContext>>): BuiltReport {
  const rows = context.documents.map((document) => {
    const origin = documentOrigin(context, document.entityType, document.entityId);
    return {
      id: document.id,
      href: origin.href,
      values: {
        entidade: document.entityType,
        origem: origin.label,
        tipo: DOCUMENT_KIND_LABELS[document.kind],
        titulo: document.title,
        status: DOCUMENT_STATUS_LABELS[document.status],
        validade: document.expiresAt ?? "-",
        enviadoEm: document.createdAt,
      },
    } satisfies ReportRowData;
  });
  return {
    definition: reportDefinition("documents.status"),
    generatedAt: new Date().toISOString(),
    totals: {
      documentos: rows.length,
      pendentes: context.documents.filter((document) => document.status === "pendente").length,
      rejeitados: context.documents.filter((document) => document.status === "rejeitado").length,
      vencidos: context.documents.filter((document) => document.status === "vencido").length,
    },
    rows,
  };
}

function buildDocumentsExpiringReport(context: Awaited<ReturnType<typeof buildReportContext>>): BuiltReport {
  const today = todayISO();
  const next30 = addDaysISO(today, 30);
  const expiring = context.documents.filter((document) => document.expiresAt && document.expiresAt <= next30);
  const rows = expiring.map((document) => {
    const origin = documentOrigin(context, document.entityType, document.entityId);
    return {
      id: document.id,
      href: origin.href,
      values: {
        entidade: document.entityType,
        origem: origin.label,
        tipo: DOCUMENT_KIND_LABELS[document.kind],
        titulo: document.title,
        validade: document.expiresAt ?? "-",
        dias: document.expiresAt ? daysBetween(today, document.expiresAt) : 0,
        status: DOCUMENT_STATUS_LABELS[document.status],
      },
    } satisfies ReportRowData;
  });
  return {
    definition: reportDefinition("documents.expiring"),
    generatedAt: new Date().toISOString(),
    totals: { documentos: rows.length, vencidos: rows.filter((row) => Number(row.values.dias) < 0).length },
    rows,
  };
}

function buildCondoFeesReport(context: Awaited<ReturnType<typeof buildReportContext>>): BuiltReport {
  const rows = context.condoFees.map((fee) => {
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
    } satisfies ReportRowData;
  });
  return {
    definition: reportDefinition("condos.fees"),
    generatedAt: new Date().toISOString(),
    totals: { taxas: rows.length, atrasado: money(context.condoFees.filter((fee) => fee.status === "atrasado").reduce((sum, fee) => sum + fee.amount, 0)) },
    rows,
  };
}

function buildCondoExpensesReport(context: Awaited<ReturnType<typeof buildReportContext>>): BuiltReport {
  const rows = context.condoExpenses.map((expense) => ({
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
  } satisfies ReportRowData));
  return {
    definition: reportDefinition("condos.expenses"),
    generatedAt: new Date().toISOString(),
    totals: { despesas: rows.length, valor: money(context.condoExpenses.reduce((sum, expense) => sum + expense.totalAmount, 0)) },
    rows,
  };
}

function buildCondoMeetingsReport(context: Awaited<ReturnType<typeof buildReportContext>>): BuiltReport {
  const rows = context.condoMeetings.map((meeting) => ({
    id: meeting.id,
    href: routes.condo(meeting.condoId),
    values: {
      condominio: context.condoById.get(meeting.condoId)?.name ?? "-",
      data: meeting.date,
      tipo: meeting.kind,
      resumo: meeting.summary ?? "-",
      ata: meeting.ataDocumentId ? "Sim" : "Não",
    },
  } satisfies ReportRowData));
  return {
    definition: reportDefinition("condos.meetings"),
    generatedAt: new Date().toISOString(),
    totals: { assembleias: rows.length, futuras: context.condoMeetings.filter((meeting) => meeting.date >= todayISO()).length },
    rows,
  };
}

function buildExecutiveReport(context: Awaited<ReturnType<typeof buildReportContext>>, financeOverdue: BuiltReport): BuiltReport {
  const activeRentals = context.rentals.filter((rental) => rental.status === "ativo");
  const rented = context.properties.filter((property) => property.status === "alugado").length;
  const occupancy = context.properties.length ? Math.round((rented / context.properties.length) * 100) : 0;
  const openCharges = context.charges.filter((charge) => charge.effectiveStatus !== "paga" && charge.effectiveStatus !== "cancelada");
  const pendingRepasses = context.repasses.filter((repasse) => repasse.status === "pendente").reduce((sum, repasse) => sum + repasse.netAmount, 0);
  const pendingCommissions = context.commissions.filter((commission) => commission.status === "pendente").reduce((sum, commission) => sum + commission.amount, 0);
  const documentsAttention = context.documents.filter((document) => document.status === "pendente" || document.status === "rejeitado" || document.status === "vencido").length;
  const rows: ReportRowData[] = [
    { id: "receivable", values: { area: "Financeiro", indicador: "A receber", valor: money(openCharges.reduce((sum, charge) => sum + charge.amount, 0)), detalhe: `${openCharges.length} cobrança(s) abertas` } },
    { id: "overdue", values: { area: "Financeiro", indicador: "Inadimplência", valor: financeOverdue.totals.valor ?? 0, detalhe: `${financeOverdue.rows.length} parcela(s) em atraso` } },
    { id: "occupancy", values: { area: "Locações", indicador: "Ocupação", valor: `${occupancy}%`, detalhe: `${activeRentals.length} contrato(s) ativos` } },
    { id: "repasses", values: { area: "Financeiro", indicador: "Repasses pendentes", valor: money(pendingRepasses), detalhe: "Valor líquido a pagar a proprietários" } },
    { id: "commissions", values: { area: "Vendas", indicador: "Comissões pendentes", valor: money(pendingCommissions), detalhe: "Comissões aguardando pagamento" } },
    { id: "leads", values: { area: "CRM", indicador: "Leads abertos", valor: context.leads.filter((lead) => lead.funnelStage !== "fechado_ganho" && lead.funnelStage !== "fechado_perdido").length, detalhe: "Oportunidades em andamento" } },
    { id: "documents", values: { area: "Documentos", indicador: "Atenção documental", valor: documentsAttention, detalhe: "Pendentes, rejeitados ou vencidos" } },
  ];
  return {
    definition: reportDefinition("overview.executive"),
    generatedAt: new Date().toISOString(),
    totals: { ocupacao: occupancy, alertas: rows.filter((row) => Number(row.values.valor) > 0).length },
    rows,
  };
}

export async function buildReportsDashboardData(ctx: RepoContext): Promise<ReportsDashboardData> {
  const context = await buildReportContext(ctx);
  const receivables = buildReceivablesReport(context);
  const financeOverdue = buildFinanceOverdueReport(context);
  const repasses = buildRepassesReport(context);
  const commissions = buildCommissionsReport(context);
  const contracts = buildContractsReport(context);
  const expiring = buildExpiringContractsReport(context);
  const rentalsOverdue = buildRentalsOverdueReport(context);
  const availableProperties = buildAvailablePropertiesReport(context);
  const salesListings = buildSalesListingsReport(context);
  const salesContracts = buildSalesContractsReport(context);
  const salesProposals = buildSalesProposalsReport(context);
  const crmFunnel = buildCrmFunnelReport(context);
  const crmActivities = buildCrmActivitiesReport(context);
  const documentsStatus = buildDocumentsStatusReport(context);
  const documentsExpiring = buildDocumentsExpiringReport(context);
  const condoFees = buildCondoFeesReport(context);
  const condoExpenses = buildCondoExpensesReport(context);
  const condoMeetings = buildCondoMeetingsReport(context);
  const executive = buildExecutiveReport(context, financeOverdue);
  const alerts = [
    ...financeOverdue.rows.slice(0, 4),
    ...expiring.rows.slice(0, 3),
    ...rentalsOverdue.rows.slice(0, 3),
  ];

  return {
    generatedAt: new Date().toISOString(),
    overview: {
      kpis: {
        receivableOpen: receivables.totals.aberto ?? 0,
        overdueAmount: financeOverdue.totals.valor ?? 0,
        occupancyPct: executive.totals.ocupacao ?? 0,
        activeRentals: context.rentals.filter((rental) => rental.status === "ativo").length,
        availableProperties: availableProperties.rows.length,
        pendingRepasses: repasses.totals.liquidoPendente ?? 0,
        pendingCommissions: commissions.totals.pendente ?? 0,
        openLeads: context.leads.filter((lead) => lead.funnelStage !== "fechado_ganho" && lead.funnelStage !== "fechado_perdido").length,
      },
      alerts,
      executive,
    },
    finance: { receivables, overdue: financeOverdue, repasses, commissions },
    rentals: { contracts, expiring, overdue: rentalsOverdue, availableProperties },
    sales: { listings: salesListings, contracts: salesContracts, proposals: salesProposals },
    crm: { funnel: crmFunnel, activities: crmActivities },
    documents: { status: documentsStatus, expiring: documentsExpiring },
    condos: { fees: condoFees, expenses: condoExpenses, meetings: condoMeetings },
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
