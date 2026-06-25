import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { guardPage } from "@/lib/guard-page";
import { salesRepository } from "@/lib/repositories/sales.repository";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { formatBRL, formatDate } from "@/lib/utils";

export default async function SaleDetailPage({ params }: { params: { id: string } }) {
  const { ctx } = await guardPage("sales");
  const listing = await salesRepository.getListing(ctx, params.id);
  if (!listing) notFound();

  const property = await propertiesRepository.get(ctx, listing.propertyId);
  const proposals = await salesRepository.listProposals(ctx, listing.id);
  const buyers = await Promise.all(proposals.map((p) => clientsRepository.get(ctx, p.buyerClientId)));

  return (
    <div className="space-y-4">
      <PageHeader
        title={property?.address ?? "Listagem"}
        description={`${formatBRL(listing.askingPrice)} · comissão ${listing.commissionPct}%`}
        action={<StatusBadge status={listing.status} />}
      />

      <Card>
        <CardHeader><CardTitle>Propostas</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {proposals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem propostas registradas.</p>
          ) : (
            proposals.map((p, index) => {
              const buyer = buyers[index];
              return (
                <div key={p.id} className="space-y-2 rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{buyer?.name ?? "Comprador"}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-sm">Oferta: <span className="font-semibold">{formatBRL(p.offeredPrice)}</span></p>
                  {p.conditions ? <p className="text-xs text-muted-foreground">{p.conditions}</p> : null}
                  <div className="space-y-1 border-t border-border/60 pt-2">
                    {p.history.map((h, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                        <span>{h.by === "buyer" ? "Comprador" : "Vendedor"} · {formatDate(h.at)}</span>
                        <span>{formatBRL(h.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
