import { KeyRound } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ListItem } from "@/components/ui/list-item";
import { StatusBadge } from "@/components/ui/status-badge";
import { guardPage } from "@/lib/guard-page";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { formatBRL } from "@/lib/utils";
import { routes } from "@/lib/routes";

export const metadata = { title: "Locação" };

export default async function RentalsPage() {
  const { ctx } = await guardPage("rentals");
  const contracts = await rentalsRepository.list(ctx);
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
      <PageHeader badge="Locação" title="Locação" description={`${contracts.length} contratos`} />
      {contracts.length === 0 ? (
        <EmptyState title="Nenhum contrato de locação" icon={<KeyRound className="size-8" />} />
      ) : (
        <div className="space-y-2">
          {contracts.map((c, index) => {
            const property = properties[index];
            const tenant = tenants[index];
            return (
              <ListItem
                key={c.id}
                href={routes.rental(c.id)}
                title={property?.address ?? "Imóvel"}
                subtitle={`Inquilino: ${tenant?.name ?? "—"} · ${formatBRL(c.monthlyValue)}/mês`}
                trailing={<StatusBadge status={c.status} />}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
