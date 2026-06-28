// Builds the rich data context used by all report builders.

import { billingRepository } from "../../../lib/repositories/billing.repository";
import { clientsRepository } from "../../../lib/repositories/clients.repository";
import { condosRepository } from "../../../lib/repositories/condos.repository";
import { crmRepository } from "../../../lib/repositories/crm.repository";
import { documentsRepository } from "../../../lib/repositories/documents.repository";
import { financeRepository } from "../../../lib/repositories/finance.repository";
import { propertiesRepository } from "../../../lib/repositories/properties.repository";
import { rentalsRepository } from "../../../lib/repositories/rentals.repository";
import { salesRepository } from "../../../lib/repositories/sales.repository";
import { usersRepository } from "../../../lib/repositories/users.repository";
import type { RepoContext } from "../../../lib/repositories/base";
import type { ReportsContext } from "./types";

export async function buildReportContext(ctx: RepoContext): Promise<ReportsContext> {
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

  const today = new Date().toISOString().slice(0, 10);

  return {
    today,
    todayMonth: today.slice(0, 7),
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
    propertyById: new Map(properties.map((p) => [p.id, p])),
    clientById: new Map(clients.map((c) => [c.id, c])),
    rentalById: new Map(rentals.map((r) => [r.id, r])),
    listingById: new Map(listings.map((l) => [l.id, l])),
    userById: new Map(users.map((u) => [u.id, u])),
    condoById: new Map(condos.map((c) => [c.id, c])),
    condoUnitById: new Map(condoUnits.map((u) => [u.id, u])),
  };
}
