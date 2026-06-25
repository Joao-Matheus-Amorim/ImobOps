import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ListItem } from "@/components/ui/list-item";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { guardPage } from "@/lib/guard-page";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { filterAllowed, getPrincipalCan } from "@/components/domain/_helpers";
import { routes } from "@/lib/routes";

export const metadata = { title: "Imóveis" };

export default async function PropertiesPage() {
  const { ctx } = await guardPage("properties");
  const principal = await getPrincipalCan();
  const properties = filterAllowed(principal, "properties", propertiesRepository.list(ctx));

  return (
    <div className="space-y-4">
      <PageHeader
        badge="Carteira"
        title="Imóveis"
        description={`${properties.length} na carteira`}
        action={<Button size="sm">Novo imóvel</Button>}
      />
      {properties.length === 0 ? (
        <EmptyState title="Nenhum imóvel" icon={<Building2 className="size-8" />} />
      ) : (
        <div className="space-y-2">
          {properties.map((p) => (
            <ListItem
              key={p.id}
              href={routes.property(p.id)}
              title={p.address}
              subtitle={`${p.kind} · ${p.areaM2 ?? "?"} m² · ${p.bedrooms ?? 0} dorm.`}
              trailing={<StatusBadge status={p.status} />}
            />
          ))}
        </div>
      )}
    </div>
  );
}
