import { KeyRound } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityCard } from "@/components/ui/entity-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { guardPage } from "@/lib/guard-page";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { formatBRL } from "@/lib/utils";
import { routes } from "@/lib/routes";
import { NewRentalDialog } from "@/components/domain/rentals/new-rental-dialog";
import { DeleteResourceButton } from "@/components/domain/delete-resource-button";

export const metadata = { title: "Locação" };

export default async function RentalsPage() {
  const { ctx } = await guardPage("rentals");
  const contracts = await rentalsRepository.list(ctx);
  // Options for the "new rental" form.
  const allProperties = await propertiesRepository.list(ctx);
  const allClients = await clientsRepository.list(ctx);
  const clientById = new Map(allClients.map((client) => [client.id, client]));
  const rentalProperties = allProperties.filter(
    (property) =>
      property.ownerClientId &&
      (property.availability === "locacao" || property.availability === "ambos") &&
      property.status === "disponivel",
  );
  // Fetch related properties + tenants in two bulk queries instead of one per
  // contract (was N+1).
  const propertyById = new Map(
    (await propertiesRepository.byIds(ctx, contracts.map((c) => c.propertyId))).map((p) => [p.id, p]),
  );
  const tenantById = new Map(
    (await clientsRepository.byIds(ctx, contracts.map((c) => c.tenantClientId))).map((t) => [t.id, t]),
  );
  const properties = contracts.map((c) => propertyById.get(c.propertyId) ?? null);
  const tenants = contracts.map((c) => tenantById.get(c.tenantClientId) ?? null);

  return (
    <div className="space-y-4">
      <PageHeader
        badge="Locação"
        title="Locação"
        description={`${contracts.length} contratos`}
        action={
          <NewRentalDialog
            properties={rentalProperties.map((p) => ({
              id: p.id,
              address: p.address,
              ownerClientId: p.ownerClientId!,
              ownerName: clientById.get(p.ownerClientId!)?.name ?? "Cliente",
            }))}
            clients={allClients.map((c) => ({ id: c.id, name: c.name }))}
          />
        }
      />
      {contracts.length === 0 ? (
        <EmptyState title="Nenhum contrato de locação" icon={<KeyRound className="size-8" />} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {contracts.map((c, index) => {
            const property = properties[index];
            const tenant = tenants[index];
            return (
              <div key={c.id} className="space-y-2">
                <EntityCard
                  href={routes.rental(c.id)}
                  icon={<KeyRound className="size-5" />}
                  title={property?.address ?? "Imóvel"}
                  subtitle={`Inquilino: ${tenant?.name ?? "—"}`}
                  status={<StatusBadge status={c.status} />}
                  meta={[{ label: "Venc.", value: `dia ${c.dueDay}` }]}
                  highlightLabel="Aluguel"
                  highlight={`${formatBRL(c.monthlyValue)}`}
                />
                <div className="flex justify-end px-1">
                  <DeleteResourceButton endpoint={`/api/rentals/${c.id}`} label={`locação de ${property?.address ?? "imóvel"}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
