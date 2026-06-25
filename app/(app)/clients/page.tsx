import Link from "next/link";
import {
  Contact,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { guardPage } from "@/lib/guard-page";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { filterAllowed, getPrincipalCan } from "@/components/domain/_helpers";
import { routes } from "@/lib/routes";
import { BUSINESS_ROLE_LABELS } from "@/lib/types/domain";
import { formatBRL } from "@/lib/utils";

export const metadata = { title: "Clientes" };

type ClientHealth = {
  openAmount: number;
  overdueAmount: number;
  nextDue: string;
  score: "saudavel" | "atencao" | "critico";
  paymentLabel: string;
};

async function buildClientHealth(
  ctx: { tenancyId: string; userId: string },
  clientId: string,
): Promise<ClientHealth> {
  const allContracts = await rentalsRepository.list(ctx);
  const contracts = allContracts.filter(
    (c) => c.tenantClientId === clientId || c.landlordClientId === clientId,
  );
  const installmentLists = await Promise.all(
    contracts.map((contract) => rentalsRepository.listInstallments(ctx, contract.id)),
  );
  const installments = installmentLists.flat();
  const open = installments.filter((i) => i.status === "a_vencer" || i.status === "atrasado");
  const overdue = installments.filter((i) => i.status === "atrasado");
  const next = open.find((i) => i.status === "a_vencer") ?? open[0];
  const overdueAmount = overdue.reduce((sum, i) => sum + i.amount, 0);
  const openAmount = open.reduce((sum, i) => sum + i.amount, 0);
  const score = overdueAmount > 0 ? "critico" : openAmount > 0 ? "atencao" : "saudavel";

  return {
    openAmount,
    overdueAmount,
    nextDue: next ? next.dueDate.slice(5).split("-").reverse().join("/") : "-",
    score,
    paymentLabel: contracts.length > 0 ? "Boleto / PIX" : "Sem ciclo ativo",
  };
}

export default async function ClientsPage() {
  const { ctx } = await guardPage("clients");
  const principal = await getPrincipalCan();
  const clients = filterAllowed(principal, "clients", await clientsRepository.list(ctx));
  const canCreate = Boolean(principal);
  const healthByClient = new Map(
    await Promise.all(clients.map(async (c) => [c.id, await buildClientHealth(ctx, c.id)] as const)),
  );

  return (
    <div className="space-y-7">
      <PageHeader
        badge="Carteira"
        title="Clientes"
        description="Saude financeira, boletos, PIX e relacionamento por cliente."
        action={
          canCreate ? (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Upload /> POP Cliente Novo
              </Button>
              <Button size="lg">
                <Plus /> Novo cliente
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary/80" />
          <input
            className="h-12 w-full rounded-2xl border border-primary/18 bg-card/55 px-12 text-sm text-foreground shadow-[inset_0_1px_0_hsl(var(--primary)/0.08)] outline-none transition placeholder:text-muted-foreground focus:border-primary/55 focus:shadow-glow-sm"
            placeholder="Buscar cliente, documento ou funcao..."
            type="search"
          />
        </div>
        <select className="h-12 rounded-2xl border border-primary/18 bg-card/55 px-4 text-sm font-medium text-foreground outline-none transition focus:border-primary/55 focus:shadow-glow-sm lg:w-48">
          <option>Todos os status</option>
          <option>Ativos</option>
          <option>Em dia</option>
          <option>Atrasados</option>
        </select>
        <Button variant="outline" className="h-12 px-5">
          <SlidersHorizontal /> Filtrar
        </Button>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          title="Nenhum cliente visivel"
          description="Ajuste seu escopo ou cadastre um novo cliente."
          icon={<Contact className="size-8" />}
        />
      ) : (
        <Card className="overflow-x-auto rounded-[1.35rem] border-primary/18 bg-[#102f4d]/82 p-0 shadow-[0_34px_110px_-72px_hsl(var(--primary)/0.9)]">
          <div className="min-w-[1040px]">
            <div className="grid grid-cols-[1.25fr_0.95fr_0.85fr_0.8fr_0.8fr_0.85fr_108px] gap-4 border-b border-primary/12 bg-primary/5 px-5 py-4 section-label text-muted-foreground">
              <span>Cliente</span>
              <span>Funcao</span>
              <span>Saude</span>
              <span>Em aberto</span>
              <span>Atrasado</span>
              <span>Prox. venc.</span>
              <span className="text-right">Acoes</span>
            </div>
            <div className="divide-y divide-primary/10">
              {clients.map((c) => {
                const primaryRole = c.rolesInBusiness[0];
                const health = healthByClient.get(c.id)!;
                const healthBadge = health.score === "critico" ? "destructive" : "default";

                return (
                  <div
                    key={c.id}
                    className="grid grid-cols-[1.25fr_0.95fr_0.85fr_0.8fr_0.8fr_0.85fr_108px] items-center gap-4 px-5 py-5 text-sm transition hover:bg-primary/7"
                  >
                    <Link href={routes.client(c.id)} className="min-w-0">
                      <span className="block truncate text-base font-semibold text-foreground">
                        {c.name}
                      </span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">
                        {health.paymentLabel} | {c.email ?? c.phone ?? "sem contato"}
                      </span>
                    </Link>
                    <span className="truncate text-muted-foreground">
                      {primaryRole ? BUSINESS_ROLE_LABELS[primaryRole] : "Cliente"}
                    </span>
                    <Badge variant={healthBadge}>
                      {health.score === "critico"
                        ? "Atrasado"
                        : health.score === "atencao"
                          ? "Atencao"
                          : "Em dia"}
                    </Badge>
                    <span className="font-semibold text-foreground">
                      {formatBRL(health.openAmount)}
                    </span>
                    <span className={health.overdueAmount > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>
                      {formatBRL(health.overdueAmount)}
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <span className="font-medium text-foreground">{health.nextDue}</span>
                      <span className="text-xs text-muted-foreground">boleto/PIX</span>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Link
                        href={routes.client(c.id)}
                        className="grid size-10 place-items-center rounded-full border border-primary/20 bg-primary/8 text-primary transition hover:border-primary/55 hover:shadow-glow-sm"
                        aria-label={`Editar ${c.name}`}
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <button
                        className="grid size-10 place-items-center rounded-full border border-primary/20 bg-card/35 text-muted-foreground transition hover:border-primary/50 hover:text-primary hover:shadow-glow-sm"
                        aria-label={`Remover ${c.name}`}
                        type="button"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
