import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, Tag, Users, TrendingUp, Building2, ArrowUpRight, Handshake } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { guardPage } from "@/lib/guard-page";
import { salesRepository } from "@/lib/repositories/sales.repository";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { EditListingDialog } from "@/components/domain/sales/edit-listing-dialog";
import { ListingActions } from "@/components/domain/sales/listing-actions";
import { usersRepository } from "@/lib/repositories/users.repository";
import { formatBRL, formatDate } from "@/lib/utils";
import { routes } from "@/lib/routes";

export default async function SaleDetailPage({ params }: { params: { id: string } }) {
  const { ctx } = await guardPage("sales");
  const listing = await salesRepository.getListing(ctx, params.id);
  if (!listing) notFound();

  const property = await propertiesRepository.get(ctx, listing.propertyId);
  const proposals = await salesRepository.listProposals(ctx, listing.id);
  const buyers = await Promise.all(proposals.map((p) => clientsRepository.get(ctx, p.buyerClientId)));
  const allClients = await clientsRepository.list(ctx);
  const brokers = await usersRepository.listByRole(ctx, "broker");

  const bestOffer = proposals.reduce((max, p) => Math.max(max, p.offeredPrice), 0);
  const bestPct = listing.askingPrice > 0 ? Math.round((bestOffer / listing.askingPrice) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title={property?.address ?? "Listagem"}
        description={`comissão ${listing.commissionPct}%`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={listing.status} />
            <EditListingDialog
              listing={listing}
              trigger={
                <Button size="sm" variant="outline">
                  <Pencil /> Editar
                </Button>
              }
            />
            <ListingActions
              listingId={listing.id}
              clients={allClients.map((c) => ({ id: c.id, name: c.name }))}
              brokers={brokers.map((b) => ({ id: b.id, name: b.displayName }))}
            />
          </div>
        }
      />

      {/* Hero: asking price + offer KPIs */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="rounded-[1.35rem] border-primary/18 bg-[#102f4d]/82 p-6 shadow-[0_34px_110px_-72px_hsl(var(--primary)/0.9)]">
          <div className="flex items-center gap-2 text-primary/80">
            <Tag className="size-4" />
            <p className="section-label">Valor pedido</p>
          </div>
          <p className="mt-2 font-display text-5xl font-semibold text-primary">{formatBRL(listing.askingPrice)}</p>
          {property ? (
            <Link href={routes.property(property.id)} className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-primary">
              <Building2 className="size-3.5" /> {property.address} <ArrowUpRight className="size-3.5" />
            </Link>
          ) : null}
        </Card>

        <Card className="grid grid-cols-2 gap-3 rounded-[1.35rem] border-primary/18 bg-[#102f4d]/82 p-6">
          <div className="rounded-xl border border-primary/12 bg-background/30 p-3 text-center">
            <Users className="mx-auto size-5 text-primary" />
            <p className="mt-2 font-display text-2xl font-semibold text-foreground">{proposals.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Propostas</p>
          </div>
          <div className="rounded-xl border border-primary/12 bg-background/30 p-3 text-center">
            <TrendingUp className="mx-auto size-5 text-primary" />
            <p className="mt-2 font-display text-xl font-semibold text-foreground">{bestOffer > 0 ? formatBRL(bestOffer) : "—"}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Melhor oferta{bestOffer > 0 ? ` · ${bestPct}%` : ""}
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Propostas ({proposals.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {proposals.length === 0 ? (
            <EmptyState title="Sem propostas registradas" icon={<Handshake className="size-7" />} />
          ) : (
            proposals.map((p, index) => {
              const buyer = buyers[index];
              const isBest = p.offeredPrice === bestOffer && bestOffer > 0;
              return (
                <div
                  key={p.id}
                  className={`space-y-2 rounded-xl border p-3 ${isBest ? "border-primary/40 bg-primary/8" : "border-primary/12 bg-background/25"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {buyer ? (
                        <Link href={routes.client(buyer.id)} className="font-medium text-foreground hover:text-primary">
                          {buyer.name}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">Comprador</span>
                      )}
                      {isBest ? <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">melhor oferta</span> : null}
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="font-display text-lg font-semibold text-foreground">{formatBRL(p.offeredPrice)}</p>
                  {p.conditions ? <p className="text-xs text-muted-foreground">{p.conditions}</p> : null}
                  {p.history.length > 0 ? (
                    <div className="space-y-1 border-t border-primary/10 pt-2">
                      {p.history.map((h, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                          <span>{h.by === "buyer" ? "Comprador" : "Vendedor"} · {formatDate(h.at)}</span>
                          <span>{formatBRL(h.price)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
