import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityCard } from "@/components/ui/entity-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { guardPage } from "@/lib/guard-page";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { filterAllowed, getPrincipalCan } from "@/components/domain/_helpers";
import { routes } from "@/lib/routes";
import { NewPropertyDialog } from "@/components/domain/properties/new-property-dialog";

export const metadata = { title: "Imóveis" };

export default async function PropertiesPage() {
  const { ctx } = await guardPage("properties");
  const principal = await getPrincipalCan();
  const properties = filterAllowed(principal, "properties", await propertiesRepository.list(ctx));

  return (
    <div className="space-y-4">
      <PageHeader
        badge="Carteira"
        title="Imóveis"
        description={`${properties.length} na carteira`}
        action={<NewPropertyDialog />}
      />
      {properties.length === 0 ? (
        <EmptyState title="Nenhum imóvel" icon={<Building2 className="size-8" />} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((p) => (
            <EntityCard
              key={p.id}
              href={routes.property(p.id)}
              icon={<Building2 className="size-5" />}
              title={p.address}
              subtitle={p.kind}
              status={<StatusBadge status={p.status} />}
              meta={[
                { label: "Área", value: p.areaM2 ? `${p.areaM2} m²` : "—" },
                { label: "Dorm.", value: p.bedrooms ?? 0 },
                { label: "Vagas", value: p.parkingSpots ?? 0 },
              ]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
