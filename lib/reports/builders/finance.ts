// Finance report builders: receivables, overdue, repasses, commissions

import { routes } from "@/lib/routes";
import { reportDefinition } from "../definitions";
import type { BuiltReport, ReportsContext } from "./types";
import { money, daysBetween } from "./helpers";

export function buildReceivablesReport(context: ReportsContext): BuiltReport {
  const rows: BuiltReport["rows"] = context.charges
    .filter((c) => (c as any).effectiveStatus !== "paga" && (c as any).effectiveStatus !== "cancelada")
    .map((charge) => ({
      id: `receivable-${charge.id}`,
      href: routes.finance,
      values: {
        cliente: charge.customerName ?? "-",
        descricao: charge.description ?? "Cobrança",
        origem: charge.sourceType,
        metodo: charge.method.toUpperCase(),
        vencimento: charge.dueDate,
        valor: money(charge.amount),
        status: (charge as any).effectiveStatus,
      },
    }));

  return {
    definition: reportDefinition("finance.receivables"),
    generatedAt: new Date().toISOString(),
    totals: {
      total: money(context.charges.reduce((sum, charge) => sum + charge.amount, 0)),
      aberto: money(context.charges.filter((c) => (c as any).effectiveStatus !== "paga" && (c as any).effectiveStatus !== "cancelada").reduce((sum, c) => sum + c.amount, 0)),
      vencido: money(context.charges.filter((c) => (c as any).effectiveStatus === "vencida").reduce((sum, c) => sum + c.amount, 0)),
    },
    rows,
  };
}

export function buildFinanceOverdueReport(context: ReportsContext): BuiltReport {
  const today = context.today;
  const overdue = context.installments
    .filter((i) => i.status === "atrasado")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const rows: BuiltReport["rows"] = overdue.map((installment) => {
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
    };
  });

  return {
    definition: reportDefinition("finance.overdue"),
    generatedAt: new Date().toISOString(),
    totals: {
      parcelas: rows.length,
      valor: money(overdue.reduce((sum, i) => sum + i.amount, 0)),
    },
    rows,
  };
}

export function buildRepassesReport(context: ReportsContext): BuiltReport {
  const rows: BuiltReport["rows"] = context.repasses
    .filter((r) => r.status === "pendente")
    .map((repasse) => {
      const rental = context.rentalById.get(repasse.contractId);
      const property = rental ? context.propertyById.get(rental.propertyId) : null;
      return {
        id: `repasse-${repasse.id}`,
        href: rental ? routes.rental(rental.id) : routes.finance,
        values: {
          proprietario: context.clientById.get(rental?.landlordClientId ?? "")?.name ?? "-",
          imovel: property?.address ?? "-",
          referencia: repasse.referenceMonth,
          bruto: money(repasse.grossAmount),
          taxaAdmin: money(repasse.adminFeeAmount),
          liquido: money(repasse.netAmount),
          status: repasse.status,
          pagoEm: repasse.paidAt ?? "-",
        },
      };
    });

  return {
    definition: reportDefinition("finance.repasses"),
    generatedAt: new Date().toISOString(),
    totals: {
      bruto: money(context.repasses.reduce((sum, r) => sum + r.grossAmount, 0)),
      liquidoPendente: money(context.repasses.filter((r) => r.status === "pendente").reduce((sum, r) => sum + r.netAmount, 0)),
    },
    rows,
  };
}

export function buildCommissionsReport(context: ReportsContext): BuiltReport {
  const rows: BuiltReport["rows"] = context.commissions
    .filter((c) => c.status === "pendente")
    .map((commission) => {
      const saleContract = context.saleContracts.find((c) => c.id === commission.saleContractId);
      const listing = saleContract ? context.listingById.get(saleContract.listingId) : null;
      const property = listing ? context.propertyById.get(listing.propertyId) : null;
      const broker = context.userById.get(commission.brokerUserId);
      return {
        id: `commission-${commission.id}`,
        href: listing ? routes.sale(listing.id) : routes.finance,
        values: {
          venda: property?.address ?? commission.saleContractId,
          corretor: broker?.displayName ?? "-",
          percentual: commission.pct,
          valor: money(commission.amount),
          status: commission.status,
          pagoEm: commission.paidAt ?? "-",
        },
      };
    });

  return {
    definition: reportDefinition("finance.commissions"),
    generatedAt: new Date().toISOString(),
    totals: {
      pendente: money(context.commissions.filter((c) => c.status === "pendente").reduce((sum, c) => sum + c.amount, 0)),
      pago: money(context.commissions.filter((c) => c.status === "paga").reduce((sum, c) => sum + c.amount, 0)),
    },
    rows,
  };
}
