import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { guardPage } from "@/lib/guard-page";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { EditRentalDialog } from "@/components/domain/rentals/edit-rental-dialog";
import { formatBRL, formatDate, formatReferenceMonth } from "@/lib/utils";

export default async function RentalDetailPage({ params }: { params: { id: string } }) {
  const { ctx } = await guardPage("rentals");
  const contract = await rentalsRepository.get(ctx, params.id);
  if (!contract) notFound();

  const property = await propertiesRepository.get(ctx, contract.propertyId);
  const landlord = await clientsRepository.get(ctx, contract.landlordClientId);
  const tenant = await clientsRepository.get(ctx, contract.tenantClientId);
  const installments = await rentalsRepository.listInstallments(ctx, contract.id);

  return (
    <div className="space-y-4">
      <PageHeader
        title={property?.address ?? "Contrato de locação"}
        description={`${formatBRL(contract.monthlyValue)}/mês · taxa adm ${contract.adminFeePct}%`}
        action={
          <div className="flex items-center gap-3">
            <StatusBadge status={contract.status} />
            <EditRentalDialog
              contract={contract}
              trigger={
                <Button size="sm" variant="outline">
                  <Pencil /> Editar
                </Button>
              }
            />
          </div>
        }
      />

      <Card>
        <CardHeader><CardTitle>Partes e prazo</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Line label="Locador" value={landlord?.name ?? "—"} />
          <Line label="Locatário" value={tenant?.name ?? "—"} />
          <Line label="Vigência" value={`${formatDate(contract.startDate)} → ${formatDate(contract.endDate)}`} />
          <Line label="Vencimento" value={`Dia ${contract.dueDay}`} />
          <Line label="Índice de reajuste" value={contract.indexType.toUpperCase()} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Parcelas ({installments.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {installments.map((i) => (
            <div key={i.id} className="flex items-center justify-between border-b border-border/60 pb-2 text-sm last:border-0">
              <div>
                <p className="font-medium">{formatReferenceMonth(i.referenceMonth)}</p>
                <p className="text-xs text-muted-foreground">Venc. {formatDate(i.dueDate)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{formatBRL(i.amount)}</span>
                <StatusBadge status={i.status} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
