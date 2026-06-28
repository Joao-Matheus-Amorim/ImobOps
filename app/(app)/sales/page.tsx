import { Handshake } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityCard } from "@/components/ui/entity-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { guardPage } from "@/lib/guard-page";
import { salesRepository } from "@/lib/repositories/sales.repository";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { formatBRL } from "@/lib/utils";
import { routes } from "@/lib/routes";
import { NewListingDialog } from "@/components/domain/sales/new-listing-dialog";

export const metadata = { title: "Vendas" };

export default async function SalesPage() {
  const { ctx } = await guardPage("sales");
  const listings = await salesRepository.listListings(ctx);
  const properties = await Promise.all(listings.map((l) => propertiesRepository.get(ctx, l.propertyId)));
  const proposalLists = await Promise.all(listings.map((l) => salesRepository.listProposals(ctx, l.id)));
  const allProperties = await propertiesRepository.list(ctx);
  const allClients = await clientsRepository.list(ctx);
  const clientById = new Map(allClients.map((client) => [client.id, client]));
  const saleProperties = allProperties.filter(
    (property) =>
      property.ownerClientId &&
      (property.availability === "venda" || property.availability === "ambos") &&
      property.status !== "vendido" &&
      property.status !== "inativo",
  );

  return (
    <div className="space-y-4">
      <PageHeader
        badge="Vendas"
        title="Vendas"
        description={`${listings.length} listagens`}
        action={
          <NewListingDialog
            properties={saleProperties.map((p) => ({
              id: p.id,
              address: p.address,
              ownerName: clientById.get(p.ownerClientId!)?.name ?? "Cliente",
            }))}
          />
        }
      />
      {listings.length === 0 ? (
        <EmptyState title="Nenhuma listagem de venda" icon={<Handshake className="size-8" />} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {listings.map((l, index) => {
            const property = properties[index];
            const proposals = proposalLists[index];
            return (
              <EntityCard
                key={l.id}
                href={routes.sale(l.id)}
                icon={<Handshake className="size-5" />}
                title={property?.address ?? "Imóvel"}
                subtitle={`comissão ${l.commissionPct}%`}
                status={<StatusBadge status={l.status} />}
                meta={[{ label: "Propostas", value: proposals.length }]}
                highlightLabel="Valor pedido"
                highlight={formatBRL(l.askingPrice)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
