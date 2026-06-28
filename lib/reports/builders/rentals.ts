// Rentals report builders: contracts, expiring, overdue, available properties

import { routes } from "@/lib/routes";
import { reportDefinition } from "../definitions";
import type { BuiltReport, ReportsContext } from "./types";
import { money, addDaysISO, daysBetween, inRange } from "./helpers";

export function buildContractsReport(context: ReportsContext): BuiltReport {
  const activeRentals = context.rentals.filter((r) => r.status === "ativo");
  const rows: BuiltReport["rows"] = activeRentals.map((rental) => {
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
    };
  });

  return {
    definition: reportDefinition("rentals.contracts"),
    generatedAt: new Date().toISOString(),
    totals: {
      count: activeRentals.length,
      valorTotal: money(activeRentals.reduce((sum, r) => sum + r.monthlyValue, 0)),
    },
    rows,
  };
}

export function buildExpiringContractsReport(context: ReportsContext): BuiltReport {
  const today = context.today;
  const soon = addDaysISO(today, 90);
  const expiring = context.rentals.filter((r) => r.status === "ativo" && inRange(r.endDate, today, soon));

  const rows: BuiltReport["rows"] = expiring.map((rental) => {
    const property = context.propertyById.get(rental.propertyId);
    const landlord = context.clientById.get(rental.landlordClientId);
    const tenant = context.clientById.get(rental.tenantClientId);
    return {
      id: `expiring-${rental.id}`,
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
    };
  });

  return {
    definition: reportDefinition("rentals.expiring"),
    generatedAt: new Date().toISOString(),
    totals: {
      count: rows.length,
      valorTotal: money(expiring.reduce((sum, r) => sum + r.monthlyValue, 0)),
    },
    rows,
  };
}

export function buildRentalsOverdueReport(context: ReportsContext): BuiltReport {
  const overdueByContract = new Map<string, import("@/lib/types/domain-rental").Installment[]>();
  for (const installment of context.installments.filter((i) => i.status === "atrasado")) {
    const arr = overdueByContract.get(installment.contractId) ?? [];
    arr.push(installment);
    overdueByContract.set(installment.contractId, arr);
  }

  const rows: BuiltReport["rows"] = [...overdueByContract.entries()].map(([contractId, installments]) => {
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
        total: money(installments.reduce((sum, i) => sum + i.amount, 0)),
        status: rental?.status ?? "inadimplente",
      },
    };
  });

  return {
    definition: reportDefinition("rentals.overdue"),
    generatedAt: new Date().toISOString(),
    totals: {
      contratos: rows.length,
      total: money([...overdueByContract.values()].flat().reduce((sum, i) => sum + i.amount, 0)),
    },
    rows,
  };
}

export function buildAvailablePropertiesReport(context: ReportsContext): BuiltReport {
  const available = context.properties.filter(
    (p) => p.status === "disponivel" && (p.availability === "locacao" || p.availability === "ambos")
  );

  const rows: BuiltReport["rows"] = available.map((property) => ({
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
  }));

  return {
    definition: reportDefinition("rentals.available_properties"),
    generatedAt: new Date().toISOString(),
    totals: {
      imoveis: rows.length,
    },
    rows,
  };
}
