import { S } from "@/lib/status";
import Link from "next/link";
import { TrendingUp, AlertTriangle, Send, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/routes";
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
import { SendChargeButton } from "@/components/domain/finance/send-charge-button";
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

  // Every charge ever emitted (boleto/PIX), incl. standalone ones created by the
  // AI assistant — so they're visible here, not only the installment-linked ones.
  const allCharges = await billingRepository.list(ctx);

  // Billing rows: unpaid installments + any charge already emitted for them.
  const allInstallments = await rentalsRepository.listInstallments(ctx);
  const openInstallments = allInstallments.filter(
    (i) => i.status !== S.PAGO && i.status !== S.CANCELADO,
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

      {/* Financial hero: the money in vs the money at risk */}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="rounded-[1.35rem] border-primary/18 bg-[#102f4d]/82 p-6 shadow-[0_34px_110px_-72px_hsl(var(--primary)/0.9)]">
          <div className="flex items-center gap-2 text-primary/80">
            <TrendingUp className="size-4" />
            <p className="section-label">A receber neste mês</p>
          </div>
          <p className="mt-2 font-display text-5xl font-semibold text-primary">
            {formatBRL(summary.receivableThisMonth)}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-primary/10 pt-4">
            <SecondaryStat icon={<Send className="size-4" />} label="Repasses pendentes" value={formatBRL(summary.pendingRepasses)} />
            <SecondaryStat icon={<Wallet className="size-4" />} label="Comissões a pagar" value={formatBRL(summary.pendingCommissions)} />
          </div>
        </Card>

        <Card
          className={`rounded-[1.35rem] p-6 ${
            summary.overdueAmount > 0
              ? "border-destructive/45 bg-destructive/8"
              : "border-emerald-500/35 bg-emerald-500/8"
          }`}
        >
          <div className={`flex items-center gap-2 ${summary.overdueAmount > 0 ? "text-destructive" : "text-emerald-400"}`}>
            <AlertTriangle className="size-4" />
            <p className="section-label">Inadimplência</p>
          </div>
          <p className={`mt-2 font-display text-4xl font-semibold ${summary.overdueAmount > 0 ? "text-destructive" : "text-emerald-400"}`}>
            {formatBRL(summary.overdueAmount)}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            {overdue.length > 0
              ? `${overdue.length} parcela(s) em atraso`
              : "Tudo em dia. 🎉"}
          </p>
        </Card>
      </div>

      <NewChargeForm
        clients={(await clientsRepository.list(ctx)).map((c) => ({ id: c.id, name: c.name }))}
      />

      <BillingPanel rows={billingRows} />

      <Card>
        <CardHeader><CardTitle>Todas as cobranças ({allCharges.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {allCharges.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma cobrança emitida ainda. Crie uma acima ou peça ao Assistente IA.
            </p>
          ) : (
            allCharges.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-primary/12 bg-background/25 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {c.customerName ?? c.description ?? "Cobrança"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.method.toUpperCase()} · venc. {formatDate(c.dueDate)}
                    {c.sourceType === "avulsa" ? " · avulsa" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {c.boletoUrl ? (
                    <a href={c.boletoUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                      boleto
                    </a>
                  ) : null}
                  {c.clientId ? <SendChargeButton chargeId={c.id} /> : null}
                  <span className="font-display text-sm font-semibold text-foreground">{formatBRL(c.amount)}</span>
                  <StatusBadge status={c.effectiveStatus} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Parcelas em atraso</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {overdue.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma parcela em atraso. 🎉</p>
            ) : (
              overdue.map((i) => (
                <Link
                  key={i.id}
                  href={routes.rental(i.contractId)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/8 px-3 py-2.5 transition hover:border-destructive/50"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{formatReferenceMonth(i.referenceMonth)}</p>
                    <p className="text-xs text-muted-foreground">venc. {formatDate(i.dueDate)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-semibold text-destructive">{formatBRL(i.amount)}</span>
                    <StatusBadge status={i.status} />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Repasses aos proprietários</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {repasses.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum repasse no período.</p>
            ) : (
              repasses.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-primary/12 bg-background/25 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{formatReferenceMonth(r.referenceMonth)}</p>
                    <p className="text-xs text-muted-foreground">Bruto {formatBRL(r.grossAmount)} · taxa {formatBRL(r.adminFeeAmount)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-semibold text-foreground">{formatBRL(r.netAmount)}</span>
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <CommissionsPanel rows={commissionRows} />
    </div>
  );
}

function SecondaryStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-primary/12 bg-background/30 px-3 py-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate font-display text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
