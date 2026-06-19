import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatBRL, formatDate } from "@/lib/utils";
import { FUNNEL_STAGE_LABELS } from "@/lib/types/domain";
import type { DashboardData } from "./dashboard-data";

function FunnelSummary({ data }: { data: DashboardData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads no funil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.funnel.map((f) => (
          <div key={f.stage} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{FUNNEL_STAGE_LABELS[f.stage]}</span>
            <span className="font-semibold">{f.count}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function OverdueList({ data }: { data: DashboardData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top inadimplentes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.overdue.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma inadimplência. 🎉</p>
        ) : (
          data.overdue.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-2 text-sm">
              <div>
                <p className="font-medium">{o.label}</p>
                <p className="text-xs text-muted-foreground">Venc. {formatDate(o.dueDate)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatBRL(o.amount)}</p>
                <StatusBadge status="atrasado" />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function AdminDashboard({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Ocupação da carteira" value={`${data.occupancyPct}%`} hint={`${data.rentedCount}/${data.propertyCount} imóveis`} accent="success" />
        <StatCard label="GMV do mês" value={formatBRL(data.gmvMonth)} accent="gold" />
        <StatCard label="A receber (mês)" value={formatBRL(data.receivableMonth)} />
        <StatCard label="Inadimplência" value={formatBRL(data.overdueAmount)} accent="destructive" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <OverdueList data={data} />
        <FunnelSummary data={data} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Comissões a pagar" value={formatBRL(data.pendingCommissions)} accent="warning" />
        <StatCard label="Repasses pendentes" value={formatBRL(data.pendingRepasses)} accent="warning" />
      </div>
    </div>
  );
}

export function BrokerDashboard({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Meus leads" value={String(data.myLeads)} />
        <StatCard label="Visitas da semana" value={String(data.visitsThisWeek)} accent="gold" />
        <StatCard label="Propostas em aberto" value={String(data.openProposals)} accent="warning" />
        <StatCard label="Imóveis disponíveis" value={String(data.availableProperties)} accent="success" />
      </div>
      <FunnelSummary data={data} />
    </div>
  );
}

export function FinanceDashboard({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="A receber (mês)" value={formatBRL(data.receivableMonth)} />
        <StatCard label="Inadimplência total" value={formatBRL(data.overdueAmount + data.condoOverdueAmount)} accent="destructive" hint="aluguel + condomínio" />
        <StatCard label="Repasses pendentes" value={formatBRL(data.pendingRepasses)} accent="warning" />
        <StatCard label="Comissões a pagar" value={formatBRL(data.pendingCommissions)} accent="warning" />
      </div>
      <OverdueList data={data} />
    </div>
  );
}

export function CondoDashboard({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Condomínios" value={String(data.condoCount)} />
        <StatCard label="Inadimplência condomínio" value={formatBRL(data.condoOverdueAmount)} accent="destructive" />
        <StatCard label="Despesas do mês" value={formatBRL(data.condoExpensesMonth)} />
        <StatCard label="Próximas assembleias" value={String(data.upcomingMeetings)} accent="gold" />
      </div>
    </div>
  );
}

export function ViewerDashboard({ data }: { data: DashboardData }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard label="Imóveis" value={String(data.propertyCount)} />
      <StatCard label="Clientes" value={String(data.clientCount)} />
      <StatCard label="Contratos de locação" value={String(data.rentalCount)} />
      <StatCard label="Leads" value={String(data.leadCount)} />
    </div>
  );
}
