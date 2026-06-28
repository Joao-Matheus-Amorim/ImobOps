// Sales report builders: listings, contracts, proposals

import { routes } from "@/lib/routes";
import { S } from "@/lib/status";
import { reportDefinition } from "../definitions";
import type { BuiltReport, ReportsContext } from "./types";
import { money } from "./helpers";

export function buildSalesListingsReport(context: ReportsContext): BuiltReport {
  const rows: BuiltReport["rows"] = context.listings
    .filter((l) => l.status === S.ATIVA || l.status === S.SOB_PROPOSTA)
    .map((listing) => {
      const property = context.propertyById.get(listing.propertyId);
      const owner = property?.ownerClientId ? context.clientById.get(property.ownerClientId) : null;
      const proposalCount = context.proposals.filter((p) => p.listingId === listing.id).length;
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
      };
    });

  return {
    definition: reportDefinition("sales.listings"),
    generatedAt: new Date().toISOString(),
    totals: {
      listagens: rows.length,
      valorPedido: money(context.listings.filter((l) => l.status === S.ATIVA || l.status === S.SOB_PROPOSTA).reduce((sum, l) => sum + l.askingPrice, 0)),
    },
    rows,
  };
}

export function buildSalesContractsReport(context: ReportsContext): BuiltReport {
  const rows: BuiltReport["rows"] = context.saleContracts
    .filter((c) => c.status === S.EM_ANDAMENTO || c.status === S.FECHADO)
    .map((contract) => {
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
      };
    });

  return {
    definition: reportDefinition("sales.contracts"),
    generatedAt: new Date().toISOString(),
    totals: {
      contratos: rows.length,
      valorFinal: money(context.saleContracts.filter((c) => c.status === S.EM_ANDAMENTO || c.status === S.FECHADO).reduce((sum, c) => sum + c.finalPrice, 0)),
    },
    rows,
  };
}

export function buildSalesProposalsReport(context: ReportsContext): BuiltReport {
  const rows: BuiltReport["rows"] = context.proposals
    .filter((p) => p.status === "em_analise" || p.status === "contraproposta")
    .map((proposal) => {
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
      };
    });

  return {
    definition: reportDefinition("sales.proposals"),
    generatedAt: new Date().toISOString(),
    totals: {
      propostas: rows.length,
      abertas: context.proposals.filter((p) => p.status !== "aceita" && p.status !== "recusada").length,
    },
    rows,
  };
}
