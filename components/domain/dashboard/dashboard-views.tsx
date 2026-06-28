import Link from "next/link";
import { ArrowUpRight, BarChart3, BellRing, Building2, Handshake, KeyRound, MessageCircle, Users } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { FUNNEL_STAGE_LABELS } from "@/lib/types/domain";
import { routes } from "@/lib/routes";
import { formatBRL, formatDate } from "@/lib/utils";
import type { DashboardData } from "./dashboard-data";

const QUICK_ACTIONS = [
  { href: routes.rentals, label: "Locação", icon: KeyRound },
  { href: routes.finance, label: "Boletos", icon: BellRing },
  { href: routes.whatsapp, label: "WhatsApp", icon: MessageCircle },
  { href: routes.clients, label: "Clientes", icon: Users },
  { href: routes.properties, label: "Imóveis", icon: Building2 },
  { href: routes.sales, label: "Vendas", icon: Handshake },
  { href: routes.calendar, label: "Agenda", icon: BarChart3 },
];

const FUNNEL_BAR = {
  novo: "bg-sky-400/70",
  qualificado: "bg-cyan-400/70",
  visita_agendada: "bg-violet-400/70",
  proposta: "bg-amber-400/70",
  fechado_ganho: "bg-emerald-400/70",
  fechado_perdido: "bg-rose-400/70",
};

function QuickActions() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
      {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="group flex flex-col items-center gap-2 rounded-xl border border-primary/14 bg-[#102f4d]/60 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/45 hover:bg-primary/8 hover:shadow-glow-sm"
        >
          <span className="grid size-9 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          <span className="text-xs text-muted-foreground group-hover:text-foreground">{label}</span>
        </Link>
      ))}
    </div>
  );
}

function ReportsShortcut({ data }: { data: DashboardData }) {
  const alertCount = [
    data.overdueAmount > 0,
    data.pendingRepasses > 0,
    data.pendingCommissions > 0,
    data.condoOverdueAmount > 0,
    data.upcomingMeetings > 0,
  ].filter(Boolean).length;

  return (
    <Link href={routes.reports} className="group block">
      <Card className="relative overflow-hidden border-primary/25 bg-card/90 p-5 transition hover:-translate-y-0.5 hover:border-primary/55 hover:shadow-glow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <BellRing className="size-4" />
              <p className="section-label">Pendências da operação</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Veja vencimentos, inadimplência, repasses e próximos compromissos.
            </p>
          </div>
          <ArrowUpRight className="size-4 text-primary opacity-70 transition group-hover:opacity-100" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-primary/10 pt-4 text-center">
          <div>
            <p className="font-display text-xl font-semibold text-destructive">{alertCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">alertas</p>
          </div>
          <div>
            <p className="font-display text-xl font-semibold text-primary">{data.overdue.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">atrasos</p>
          </div>
          <div>
            <p className="font-display text-xl font-semibold text-[hsl(var(--warning))]">{data.openProposals}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">propostas</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function FunnelSummary({ data }: { data: DashboardData }) {
  const total = data.funnel.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(1, ...data.funnel.map((item) => item.count));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Leads no funil</CardTitle>
        <span className="text-sm text-muted-foreground">{total} no total</span>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {data.funnel.map((item) => (
          <div key={item.stage} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{FUNNEL_STAGE_LABELS[item.stage]}</span>
              <span className="font-semibold text-foreground">{item.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-background/40">
              <div
                className={`h-full rounded-full ${FUNNEL_BAR[item.stage]} transition-all`}
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
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
          <p className="text-sm text-muted-foreground">Nenhuma inadimplência.</p>
        ) : (
          data.overdue.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">Venc. {formatDate(item.dueDate)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatBRL(item.amount)}</p>
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
      <QuickActions />
      <Card className="border-primary/20 bg-card/88 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="section-label text-primary/80">Hoje na imobiliária</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Priorize cobrança, WhatsApp, locações e repasses antes de relatórios avançados.
            </p>
          </div>
          <Link href={routes.finance} className="inline-flex items-center gap-2 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15">
            Abrir cobranças <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </Card>
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
      <ReportsShortcut data={data} />
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Comissões a pagar" value={formatBRL(data.pendingCommissions)} accent="warning" />
        <StatCard label="Repasses pendentes" value={formatBRL(data.pendingRepasses)} accent="warning" />
      </div>
      <div>
        <p className="section-label mb-3 text-primary/80">Operacional</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Cobranças hoje" value={String(data.chargesTodayCount)} hint="boletos a vencer hoje" />
          <StatCard label="Inadimplência" value={String(data.overdueChargesCount)} hint="cobranças vencidas" accent="destructive" />
          <StatCard label="Conversas abertas" value={String(data.unreadConversationsCount)} hint="WhatsApp pendente" accent="gold" />
          <StatCard label="Repasses a fazer" value={String(data.pendingRepassesCount)} hint="repasses pendentes" accent="warning" />
          <StatCard label="Locações a vencer" value={String(data.expiringRentalsCount)} hint="contratos encerrando" accent="warning" />
          <StatCard label="Atividades hoje" value={String(data.activitiesTodayCount)} hint="agenda do dia" />
          <StatCard label="Clientes recentes" value={String(data.recentClientsCount)} hint="últimos 30 dias" />
          <StatCard label="Automações com erro" value={String(data.failedAutomationsCount)} hint="falhas recentes" accent="destructive" />
        </div>
      </div>
    </div>
  );
}

export function BrokerDashboard({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-4">
      <QuickActions />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Meus leads" value={String(data.myLeads)} />
        <StatCard label="Visitas da semana" value={String(data.visitsThisWeek)} accent="gold" />
        <StatCard label="Propostas em aberto" value={String(data.openProposals)} accent="warning" />
        <StatCard label="Imóveis disponíveis" value={String(data.availableProperties)} accent="success" />
      </div>
      <ReportsShortcut data={data} />
      <FunnelSummary data={data} />
    </div>
  );
}

export function ViewerDashboard({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-4">
      <QuickActions />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Imóveis" value={String(data.propertyCount)} />
        <StatCard label="Clientes" value={String(data.clientCount)} />
        <StatCard label="Contratos de locação" value={String(data.rentalCount)} />
        <StatCard label="Leads" value={String(data.leadCount)} />
      </div>
      <ReportsShortcut data={data} />
    </div>
  );
}

export function Dashboard({ data, isSimplifiedMode }: { data: DashboardData; isSimplifiedMode: boolean }) {
  return isSimplifiedMode ? <ViewerDashboard data={data} /> : <AdminDashboard data={data} />;
}
