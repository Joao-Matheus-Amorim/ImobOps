import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { guardPage } from "@/lib/guard-page";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { financeRepository } from "@/lib/repositories/finance.repository";
import { billingRepository } from "@/lib/repositories/billing.repository";
import { INSTALLMENT_STATUS_LABELS } from "@/lib/types/domain";
import {
  BillingPanel,
  type BillingRow,
} from "@/components/domain/finance/billing-panel";
import { formatBRL, formatDate, formatReferenceMonth } from "@/lib/utils";

export const metadata = { title: "Finanças" };

export default function FinancePage() {
  const { ctx } = guardPage("finance");
  const summary = financeRepository.summary(ctx);
  const overdue = rentalsRepository.listOverdue(ctx);
  const repasses = financeRepository.listRepasses(ctx);

  // Billing rows: unpaid installments + any charge already emitted for them.
  const billingRows: BillingRow[] = rentalsRepository
    .listInstallments(ctx)
    .filter((i) => i.status !== "pago" && i.status !== "cancelado")
    .map((i) => {
      const charge = billingRepository.forInstallment(ctx, i.id);
      return {
        installmentId: i.id,
        referenceLabel: formatReferenceMonth(i.referenceMonth),
        dueDateLabel: formatDate(i.dueDate),
        amountLabel: formatBRL(i.amount),
        installmentStatus: INSTALLMENT_STATUS_LABELS[i.status],
        charge: charge
          ? {
              id: charge.id,
              method: charge.method,
              effectiveStatus: charge.effectiveStatus,
              boletoUrl: charge.boletoUrl,
              pixPayload: charge.pixPayload,
            }
          : null,
      };
    });

  return (
    <div className="space-y-5">
      <PageHeader badge="Financeiro" title="Finanças" description="A receber, inadimplência e repasses" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="A receber (mês)" value={formatBRL(summary.receivableThisMonth)} />
        <StatCard label="Inadimplência" value={formatBRL(summary.overdueAmount)} accent="destructive" />
        <StatCard label="Repasses pendentes" value={formatBRL(summary.pendingRepasses)} accent="warning" />
        <StatCard label="Comissões a pagar" value={formatBRL(summary.pendingCommissions)} accent="warning" />
      </div>

      <BillingPanel rows={billingRows} />

      <Card>
        <CardHeader><CardTitle>Parcelas em atraso</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {overdue.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma parcela em atraso.</p>
          ) : (
            overdue.map((i) => (
              <div key={i.id} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
                <span>{formatReferenceMonth(i.referenceMonth)} · venc. {formatDate(i.dueDate)}</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatBRL(i.amount)}</span>
                  <StatusBadge status={i.status} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Repasses aos proprietários</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {repasses.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
              <div>
                <p className="font-medium">{formatReferenceMonth(r.referenceMonth)}</p>
                <p className="text-xs text-muted-foreground">Bruto {formatBRL(r.grossAmount)} · taxa {formatBRL(r.adminFeeAmount)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{formatBRL(r.netAmount)}</span>
                <StatusBadge status={r.status} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
