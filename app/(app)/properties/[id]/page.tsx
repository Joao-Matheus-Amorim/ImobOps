import { notFound } from "next/navigation";
import { BedDouble, Bath, Car, Ruler } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { guardPage } from "@/lib/guard-page";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  const { ctx } = guardPage("properties");
  const property = propertiesRepository.get(ctx, params.id);
  if (!property) notFound();
  const owner = property.ownerClientId ? clientsRepository.get(ctx, property.ownerClientId) : null;

  return (
    <div className="space-y-4">
      <PageHeader title={property.address} description={property.kind} action={<StatusBadge status={property.status} />} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Feature icon={<Ruler className="size-4" />} label="Área" value={`${property.areaM2 ?? "—"} m²`} />
        <Feature icon={<BedDouble className="size-4" />} label="Dormitórios" value={String(property.bedrooms ?? 0)} />
        <Feature icon={<Bath className="size-4" />} label="Banheiros" value={String(property.bathrooms ?? 0)} />
        <Feature icon={<Car className="size-4" />} label="Vagas" value={String(property.parkingSpots ?? 0)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Line label="Disponibilidade" value={property.availability} />
          <Line label="Proprietário" value={owner?.name ?? "—"} />
          <Line label="Condomínio" value={property.condoId ? "Unidade de condomínio administrado" : "—"} />
          <p className="pt-2 text-muted-foreground">{property.description ?? "Sem descrição."}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Feature({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-xs">{label}</span></div>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </Card>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
