import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { guardPage } from "@/lib/guard-page";
import { condosRepository } from "@/lib/repositories/condos.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { billingRepository } from "@/lib/repositories/billing.repository";
import {
  CondoFeesPanel,
  type CondoFeeRow,
} from "@/components/domain/condos/condo-fees-panel";
import { formatBRL, formatDate, formatReferenceMonth } from "@/lib/utils";

export default async function CondoDetailPage({ params }: { params: { id: string } }) {
  const { ctx } = await guardPage("condos");
  const condo = condosRepository.get(ctx, params.id);
  if (!condo) notFound();

  const units = condosRepository.listUnits(ctx, condo.id);
  const fees = condosRepository.listFees(ctx, condo.id);
  const expenses = condosRepository.listExpenses(ctx, condo.id);
  const meetings = condosRepository.listMeetings(ctx, condo.id);

  const feeRows: CondoFeeRow[] = fees.map((f) => {
    const unit = units.find((u) => u.id === f.unitId);
    const charge = billingRepository.forCondoFee(ctx, f.id);
    return {
      feeId: f.id,
      label: `${unit?.label ?? "Unidade"} · ${formatReferenceMonth(f.referenceMonth)} · venc. ${formatDate(f.dueDate)}`,
      amountLabel: formatBRL(f.amount),
      status: f.status,
      charge: charge
        ? {
            id: charge.id,
            method: charge.method,
            effectiveStatus: charge.effectiveStatus,
            boletoUrl: charge.boletoUrl,
          }
        : null,
    };
  });

  return (
    <div className="space-y-4">
      <PageHeader title={condo.name} description={condo.address} />

      <Card>
        <CardHeader><CardTitle>Unidades ({units.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {units.map((u) => {
            const owner = u.ownerClientId ? clientsRepository.get(ctx, u.ownerClientId) : null;
            return (
              <div key={u.id} className="flex justify-between border-b border-border/60 pb-2 last:border-0">
                <div>
                  <p className="font-medium">{u.label}</p>
                  <p className="text-xs text-muted-foreground">{owner?.name ?? "Sem proprietário"} · fração {u.fractionPct}%</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <CondoFeesPanel rows={feeRows} />

      <Card>
        <CardHeader><CardTitle>Despesas</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
              <div>
                <p className="font-medium">{e.description}</p>
                <p className="text-xs text-muted-foreground">Rateio: {e.apportionment === "igual" ? "igualitário" : "fração ideal"}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{formatBRL(e.totalAmount)}</span>
                <StatusBadge status={e.status} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Assembleias</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {meetings.map((m) => (
            <div key={m.id} className="border-b border-border/60 pb-2 last:border-0">
              <p className="font-medium">{m.kind === "ordinaria" ? "Ordinária" : "Extraordinária"} · {formatDate(m.date)}</p>
              <p className="text-xs text-muted-foreground">{m.summary ?? "Sem resumo."}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
