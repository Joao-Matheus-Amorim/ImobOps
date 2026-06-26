import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { guardPage } from "@/lib/guard-page";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { financeRepository } from "@/lib/repositories/finance.repository";
import { billingRepository } from "@/lib/repositories/billing.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { INSTALLMENT_STATUS_LABELS } from "@/lib/types/domain";
import {
  BillingPanel,
  type BillingRow,
} from "@/components/domain/finance/billing-panel";
import { NewChargeForm } from "@/components/domain/finance/new-charge-form";
import {
  CommissionsPanel,
  type CommissionRow,
} from "@/components/domain/finance/commissions-panel";
import { usersRepository } from "@/lib/repositories/users.repository";
import { formatBRL, formatDate, formatReferenceMonth } from "@/lib/utils";

export const metadata = { title: "Finanças" };

export default async function FinancePage() {
  const { ctx } = await guardPage("finance");
  const summary = await financeRepository.summary(ctx);
  const overdue = await rentalsRepository.listOverdue(ctx);

  const commissions = await financeRepository.listCommissions(ctx);
  const brokerNames = await usersRepository.displayNames(ctx);
  const commissionRows: CommissionRow[] = commissions.map((c) => {
    return {
      id: c.id,
      brokerName: brokerNames.get(c.brokerUserId) ?? "Corretor",
      amountLabel: formatBRL(c.amount),
      pctLabel: `${c.pct}% de comissão`,
      status: c.status,
      paidAtLabel: c.paidAt ? formatDate(c.paidAt) : null,
    };
  });
  const repasses = await financeRepository.listRepasses(ctx);

  // Billing rows: unpaid installments + any charge already emitted for them.
  const allInstallments = await rentalsRepository.listInstallments(ctx);
  const openInstallments = allInstallments.filter(
    (i) => i.status !== "pago" && i.status !== "cancelado",
  );
  const installmentCharges = await Promise.all(
    openInstallments.map((i) => billingRepository.forInstallment(ctx, i.id)),
  );
  const installmentLate = await Promise.all(
    openInstallments.map((i) => billingRepository.lateBreakdownForInstallment(ctx, i.id)),
  );
  const billingRows: BillingRow[] = openInstallments.map((i, index) => {
    const charge = installmentCharges[index];
    const late = installmentLate[index];
    return {
        installmentId: i.id,
        referenceLabel: formatReferenceMonth(i.referenceMonth),
        dueDateLabel: formatDate(i.dueDate),
        amountLabel: formatBRL(i.amount),
        installmentStatus: INSTALLMENT_STATUS_LABELS[i.status],
        lateLabel: late
          ? `+ multa/juros ${late.daysLate}d · total ${formatBRL(late.total)}`
          : null,
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

      <NewChargeForm
        clients={(await clientsRepository.list(ctx)).map((c) => ({ id: c.id, name: c.name }))}
      />

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

      <CommissionsPanel rows={commissionRows} />
    </div>
  );
}
