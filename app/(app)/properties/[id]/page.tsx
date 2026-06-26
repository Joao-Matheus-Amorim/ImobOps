import { notFound } from "next/navigation";
import Link from "next/link";
import {
  BedDouble,
  Bath,
  Car,
  Ruler,
  Pencil,
  Building2,
  User,
  ImageIcon,
  ArrowUpRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { guardPage } from "@/lib/guard-page";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { salesRepository } from "@/lib/repositories/sales.repository";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { NewPropertyDialog } from "@/components/domain/properties/new-property-dialog";
import { formatBRL } from "@/lib/utils";
import { routes } from "@/lib/routes";

const AVAILABILITY_LABEL: Record<string, string> = {
  locacao: "Para locação",
  venda: "Para venda",
  locacao_venda: "Locação e venda",
  indisponivel: "Indisponível",
};

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const { ctx } = await guardPage("properties");
  const property = await propertiesRepository.get(ctx, params.id);
  if (!property) notFound();
  const owner = property.ownerClientId
    ? await clientsRepository.get(ctx, property.ownerClientId)
    : null;

  // The key number: active rent for this property, else its sale asking price.
  const [rentals, listings] = await Promise.all([
    rentalsRepository.list(ctx),
    salesRepository.listListings(ctx),
  ]);
  const rental = rentals.find((r) => r.propertyId === property.id && r.status === "ativo");
  const listing = listings.find((l) => l.propertyId === property.id);

  const keyValue = rental
    ? { label: "Aluguel mensal", amount: rental.monthlyValue, suffix: "/mês", href: routes.rental(rental.id) }
    : listing
      ? { label: "Valor pedido", amount: listing.askingPrice, suffix: "", href: routes.sale(listing.id) }
      : null;

  const cover = property.photos?.[0] ?? null;

  const specs = [
    { icon: Ruler, label: "Área", value: property.areaM2 ? `${property.areaM2} m²` : "—" },
    { icon: BedDouble, label: "Dorm.", value: String(property.bedrooms ?? 0) },
    { icon: Bath, label: "Banh.", value: String(property.bathrooms ?? 0) },
    { icon: Car, label: "Vagas", value: String(property.parkingSpots ?? 0) },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={property.address}
        description={property.kind}
        action={
          <div className="flex items-center gap-3">
            <StatusBadge status={property.status} />
            <NewPropertyDialog
              property={property}
              trigger={
                <Button size="sm" variant="outline">
                  <Pencil /> Editar
                </Button>
              }
            />
          </div>
        }
      />

      {/* Hero: cover + key value */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden rounded-[1.35rem] border border-primary/14 bg-[#102f4d]/70">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={property.address} className="h-64 w-full object-cover" />
          ) : (
            <div className="flex h-64 w-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageIcon className="size-10 opacity-50" />
              <span className="text-xs">Sem foto cadastrada</span>
            </div>
          )}
          <div className="absolute left-4 top-4 flex gap-2">
            <Badge>{AVAILABILITY_LABEL[property.availability] ?? property.availability}</Badge>
          </div>
        </div>

        <Card className="flex flex-col justify-between rounded-[1.35rem] border-primary/18 bg-[#102f4d]/82 p-6 shadow-[0_34px_110px_-72px_hsl(var(--primary)/0.9)]">
          {keyValue ? (
            <Link href={keyValue.href} className="group">
              <p className="section-label text-primary/80">{keyValue.label}</p>
              <p className="mt-2 font-display text-4xl font-semibold text-primary">
                {formatBRL(keyValue.amount)}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  {keyValue.suffix}
                </span>
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground transition group-hover:text-primary">
                ver contrato <ArrowUpRight className="size-3.5" />
              </span>
            </Link>
          ) : (
            <div>
              <p className="section-label text-primary/80">Sem valor ativo</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Este imóvel ainda não tem contrato de locação nem anúncio de venda.
              </p>
            </div>
          )}

          {/* Specs as pills */}
          <div className="mt-6 grid grid-cols-2 gap-2">
            {specs.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-xl border border-primary/12 bg-background/30 px-3 py-2"
              >
                <Icon className="size-4 text-primary" />
                <div className="leading-tight">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold text-foreground">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Details in two columns */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Proprietário & vínculo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Relation
              icon={<User className="size-4" />}
              label="Proprietário"
              value={owner?.name ?? "—"}
              href={owner ? routes.client(owner.id) : undefined}
            />
            <Relation
              icon={<Building2 className="size-4" />}
              label="Condomínio"
              value={property.condoId ? "Unidade administrada" : "Não vinculado"}
              href={property.condoId ? routes.condo(property.condoId) : undefined}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {property.description ?? "Sem descrição cadastrada."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Relation({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <div className="flex items-center justify-between rounded-xl border border-primary/10 bg-background/25 px-3 py-2.5 transition hover:border-primary/35 hover:bg-primary/8">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="font-medium text-foreground">{value}</p>
        </div>
      </div>
      {href ? <ArrowUpRight className="size-4 text-primary" /> : null}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
