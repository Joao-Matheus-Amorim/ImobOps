import { Handshake } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ListItem } from "@/components/ui/list-item";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { guardPage } from "@/lib/guard-page";
import { salesRepository } from "@/lib/repositories/sales.repository";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { formatBRL } from "@/lib/utils";
import { routes } from "@/lib/routes";

export const metadata = { title: "Vendas" };

export default function SalesPage() {
  const { ctx } = guardPage("sales");
  const listings = salesRepository.listListings(ctx);

  return (
    <div className="space-y-4">
      <PageHeader badge="Vendas" title="Vendas" description={`${listings.length} listagens`} action={<Button size="sm">Nova listagem</Button>} />
      {listings.length === 0 ? (
        <EmptyState title="Nenhuma listagem de venda" icon={<Handshake className="size-8" />} />
      ) : (
        <div className="space-y-2">
          {listings.map((l) => {
            const property = propertiesRepository.get(ctx, l.propertyId);
            const proposals = salesRepository.listProposals(ctx, l.id);
            return (
              <ListItem
                key={l.id}
                href={routes.sale(l.id)}
                title={property?.address ?? "Imóvel"}
                subtitle={`${formatBRL(l.askingPrice)} · ${proposals.length} proposta(s) · comissão ${l.commissionPct}%`}
                trailing={<StatusBadge status={l.status} />}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
