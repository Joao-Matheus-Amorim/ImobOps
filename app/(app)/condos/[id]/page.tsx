import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, Home, AlertTriangle, Receipt, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { guardPage } from "@/lib/guard-page";
import { condosRepository } from "@/lib/repositories/condos.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { billingRepository } from "@/lib/repositories/billing.repository";
import {
  CondoFeesPanel,
  type CondoFeeRow,
} from "@/components/domain/condos/condo-fees-panel";
import { NewCondoDialog } from "@/components/domain/condos/new-condo-dialog";
import { CondoActions } from "@/components/domain/condos/condo-actions";
import { formatBRL, formatDate, formatReferenceMonth } from "@/lib/utils";
import { routes } from "@/lib/routes";

export default async function CondoDetailPage({ params }: { params: { id: string } }) {
  const { ctx } = await guardPage("condos");
  const condo = await condosRepository.get(ctx, params.id);
  if (!condo) notFound();

  const units = await condosRepository.listUnits(ctx, condo.id);
  const fees = await condosRepository.listFees(ctx, condo.id);
  const expenses = await condosRepository.listExpenses(ctx, condo.id);
  const meetings = await condosRepository.listMeetings(ctx, condo.id);
  const feeCharges = await Promise.all(fees.map((f) => billingRepository.forCondoFee(ctx, f.id)));
  const unitOwners = await Promise.all(
    units.map((u) => (u.ownerClientId ? clientsRepository.get(ctx, u.ownerClientId) : null)),
  );

  const feeRows: CondoFeeRow[] = fees.map((f, index) => {
    const unit = units.find((u) => u.id === f.unitId);
    const charge = feeCharges[index];
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

  // KPIs: overdue fees and current-month expenses.
  const overdueFees = fees.filter((f) => f.status === "atrasado");
  const overdueAmount = overdueFees.reduce((s, f) => s + f.amount, 0);
  const month = new Date().toISOString().slice(0, 7);
  const monthExpenses = expenses
    .filter((e) => e.referenceMonth === month)
    .reduce((s, e) => s + e.totalAmount, 0);

  const kpis = [
    { label: "Unidades", value: String(units.length), icon: Home, tone: "neutral" as const },
    { label: "Taxas atrasadas", value: formatBRL(overdueAmount), icon: AlertTriangle, tone: overdueAmount > 0 ? ("risk" as const) : ("ok" as const) },
    { label: "Despesas do mês", value: formatBRL(monthExpenses), icon: Receipt, tone: "neutral" as const },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={condo.name}
        description={condo.address}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <NewCondoDialog
              condo={condo}
              trigger={
                <Button size="sm" variant="outline">
                  <Pencil /> Editar
                </Button>
              }
            />
            <CondoActions condoId={condo.id} unitCount={units.length} />
          </div>
        }
      />

      {/* KPI hero */}
      <div className="grid grid-cols-3 gap-3">
        {kpis.map(({ label, value, icon: Icon, tone }) => (
          <Card
            key={label}
            className={`rounded-[1.25rem] p-4 ${
              tone === "risk"
                ? "border-destructive/40 bg-destructive/8"
                : tone === "ok"
                  ? "border-emerald-500/30 bg-emerald-500/8"
                  : "border-primary/14 bg-[#102f4d]/70"
            }`}
          >
            <div className={`flex items-center gap-2 ${tone === "risk" ? "text-destructive" : tone === "ok" ? "text-emerald-400" : "text-primary"}`}>
              <Icon className="size-4" />
              <p className="text-[10px] uppercase tracking-wide">{label}</p>
            </div>
            <p className={`mt-2 font-display text-2xl font-semibold ${tone === "risk" ? "text-destructive" : tone === "ok" ? "text-emerald-400" : "text-foreground"}`}>
              {value}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Unidades ({units.length})</CardTitle></CardHeader>
        <CardContent>
          {units.length === 0 ? (
            <EmptyState title="Nenhuma unidade" icon={<Home className="size-7" />} />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {units.map((u, index) => {
                const owner = unitOwners[index];
                const inner = (
                  <div className="flex items-center justify-between rounded-xl border border-primary/12 bg-background/25 px-3 py-2.5 transition hover:border-primary/35 hover:bg-primary/8">
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.label}</p>
                      <p className="text-xs text-muted-foreground">{owner?.name ?? "Sem proprietário"} · fração {u.fractionPct}%</p>
                    </div>
                    {owner ? <ArrowUpRight className="size-4 text-primary" /> : null}
                  </div>
                );
                return owner ? (
                  <Link key={u.id} href={routes.client(owner.id)}>{inner}</Link>
                ) : (
                  <div key={u.id}>{inner}</div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CondoFeesPanel rows={feeRows} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Despesas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {expenses.length === 0 ? (
              <EmptyState title="Nenhuma despesa lançada" icon={<Receipt className="size-7" />} />
            ) : (
              expenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-primary/12 bg-background/25 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{e.description}</p>
                    <p className="text-xs text-muted-foreground">Rateio: {e.apportionment === "igual" ? "igualitário" : "fração ideal"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm font-semibold text-foreground">{formatBRL(e.totalAmount)}</span>
                    <StatusBadge status={e.status} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Assembleias</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {meetings.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma assembleia registrada.</p>
            ) : (
              meetings.map((m) => (
                <div key={m.id} className="rounded-xl border border-primary/12 bg-background/25 px-3 py-2.5">
                  <p className="text-sm font-medium text-foreground">{m.kind === "ordinaria" ? "Ordinária" : "Extraordinária"} · {formatDate(m.date)}</p>
                  <p className="text-xs text-muted-foreground">{m.summary ?? "Sem resumo."}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
