import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { guardPage } from "@/lib/guard-page";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { financeRepository } from "@/lib/repositories/finance.repository";
import { formatBRL, formatDate, formatReferenceMonth } from "@/lib/utils";

export const metadata = { title: "Finanças" };

export default function FinancePage() {
  const { ctx } = guardPage("finance");
  const summary = financeRepository.summary(ctx);
  const overdue = rentalsRepository.listOverdue(ctx);
  const repasses = financeRepository.listRepasses(ctx);

  return (
    <div className="space-y-5">
      <PageHeader badge="Financeiro" title="Finanças" description="A receber, inadimplência e repasses" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="A receber (mês)" value={formatBRL(summary.receivableThisMonth)} />
        <StatCard label="Inadimplência" value={formatBRL(summary.overdueAmount)} accent="destructive" />
        <StatCard label="Repasses pendentes" value={formatBRL(summary.pendingRepasses)} accent="warning" />
        <StatCard label="Comissões a pagar" value={formatBRL(summary.pendingCommissions)} accent="warning" />
      </div>

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
