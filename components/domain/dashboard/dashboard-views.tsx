import Link from "next/link";
import { BarChart3, BellRing, Building2, Handshake, KeyRound, MessageCircle, Users } from "lucide-react";
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

export function Dashboard({ data, isSimplifiedMode }: { data: DashboardData; isSimplifiedMode: boolean }) {
  return (
    <div className="space-y-4">
      <QuickActions />
      <Card className="border-primary/20 bg-card/88 p-5">
        <p className="section-label text-primary/80">
          {isSimplifiedMode ? "Operação Simplificada" : "Visão Geral"}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Principais indicadores da operação comercial, locação e financeiro.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Imóveis" value={String(data.propertyCount)} accent="success" />
        <StatCard label="Clientes" value={String(data.clientCount)} accent="success" />
        <StatCard label="Leads" value={String(data.leadCount)} accent="gold" />
        <StatCard label="Minha carteira" value={String(data.myLeads)} accent="gold" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Ocupação" value={`${data.occupancyPct}%`} hint="imóveis alugados" accent="success" />
        <StatCard label="Vencidas" value={String(data.overdueChargesCount)} hint={formatBRL(data.overdueAmount)} accent="destructive" />
        <StatCard label="Repasses" value={String(data.pendingRepassesCount)} hint="pendentes" accent="warning" />
        <StatCard label="WhatsApp" value={String(data.unreadConversationsCount)} hint="conversas abertas" accent="gold" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FunnelSummary data={data} />
        <OverdueList data={data} />
      </div>
    </div>
  );
}
