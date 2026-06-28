import { S } from "@/lib/status";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, User, UserCheck, CalendarRange, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { guardPage } from "@/lib/guard-page";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { EditRentalDialog } from "@/components/domain/rentals/edit-rental-dialog";
import { DocumentPanel } from "@/components/domain/documents/document-panel";
import { type InstallmentStatus } from "@/lib/types/domain";
import { formatBRL, formatDate, formatReferenceMonth } from "@/lib/utils";
import { routes } from "@/lib/routes";

// Timeline marker color per installment status.
const DOT: Record<InstallmentStatus, string> = {
  pago: "bg-emerald-400 border-emerald-400",
  a_vencer: "bg-transparent border-primary/50",
  atrasado: "bg-destructive border-destructive",
  cancelado: "bg-muted border-muted",
};

export default async function RentalDetailPage({ params }: { params: { id: string } }) {
  const { ctx, user } = await guardPage("rentals");
  const contract = await rentalsRepository.get(ctx, params.id);
  if (!contract) notFound();

  const [property, landlord, tenant, installments] = await Promise.all([
    propertiesRepository.get(ctx, contract.propertyId),
    clientsRepository.get(ctx, contract.landlordClientId),
    clientsRepository.get(ctx, contract.tenantClientId),
    rentalsRepository.listInstallments(ctx, contract.id),
  ]);

  const paid = installments.filter((i) => i.status === S.PAGO);
  const paidAmount = paid.reduce((s, i) => s + (i.paidAmount ?? i.amount), 0);
  const totalAmount = installments
    .filter((i) => i.status !== S.CANCELADO)
    .reduce((s, i) => s + i.amount, 0);
  const progress = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  return (
    <div className="space-y-5">
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

      {/* Hero: parties + payment progress */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="rounded-[1.35rem] border-primary/18 bg-[#102f4d]/82 p-6">
          <p className="section-label text-primary/80">Partes e prazo</p>
          <div className="mt-4 space-y-2">
            <PartyRow icon={<User className="size-4" />} label="Locador" name={landlord?.name} href={landlord ? routes.client(landlord.id) : undefined} />
            <PartyRow icon={<UserCheck className="size-4" />} label="Locatário" name={tenant?.name} href={tenant ? routes.client(tenant.id) : undefined} />
            <div className="flex items-center gap-2.5 rounded-xl border border-primary/10 bg-background/25 px-3 py-2.5">
              <span className="grid size-8 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                <CalendarRange className="size-4" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Vigência · venc. dia {contract.dueDay} · {contract.indexType.toUpperCase()}</p>
                <p className="text-sm font-medium text-foreground">{formatDate(contract.startDate)} → {formatDate(contract.endDate)}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.35rem] border-primary/18 bg-[#102f4d]/82 p-6">
          <p className="section-label text-primary/80">Pagamentos</p>
          <p className="mt-2 font-display text-3xl font-semibold text-primary">
            {formatBRL(paidAmount)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              de {formatBRL(totalAmount)}
            </span>
          </p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-background/40">
            <div className="h-full rounded-full bg-emerald-400/80 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 flex justify-between text-xs text-muted-foreground">
            <span>{paid.length}/{installments.filter((i) => i.status !== S.CANCELADO).length} parcelas pagas</span>
            <span className="font-semibold text-foreground">{progress}%</span>
          </div>
        </Card>
      </div>

      {/* Installments as a payment timeline */}
      <Card>
        <CardHeader><CardTitle>Linha do tempo de parcelas ({installments.length})</CardTitle></CardHeader>
        <CardContent>
          <ol className="relative space-y-4 border-l border-primary/15 pl-6">
            {installments.map((i) => (
              <li key={i.id} className="relative">
                <span
                  className={`absolute -left-[31px] top-1 size-3.5 rounded-full border-2 ${DOT[i.status]}`}
                  aria-hidden
                />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{formatReferenceMonth(i.referenceMonth)}</p>
                    <p className="text-xs text-muted-foreground">
                      Venc. {formatDate(i.dueDate)}
                      {i.paidAt ? ` · pago em ${formatDate(i.paidAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm font-semibold text-foreground">{formatBRL(i.amount)}</span>
                    <StatusBadge status={i.status} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <DocumentPanel entityType="rental_contract" entityId={contract.id} userRole={user.role} />
    </div>
  );
}

function PartyRow({
  icon,
  label,
  name,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  name?: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center justify-between rounded-xl border border-primary/10 bg-background/25 px-3 py-2.5 transition hover:border-primary/35 hover:bg-primary/8">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">{icon}</span>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-sm font-medium text-foreground">{name ?? "—"}</p>
        </div>
      </div>
      {href ? <ArrowUpRight className="size-4 text-primary" /> : null}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
