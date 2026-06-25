"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Contact, Pencil, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { routes } from "@/lib/routes";
import { BUSINESS_ROLE_LABELS, type Client } from "@/lib/types/domain";
import { formatBRL } from "@/lib/utils";

type ClientHealth = {
  openAmount: number;
  overdueAmount: number;
  nextDue: string;
  score: "saudavel" | "atencao" | "critico";
  paymentLabel: string;
};

type StatusFilter = "todos" | "ativos" | "em_dia" | "atrasados";

export function ClientsTable({
  clients,
  health,
}: {
  clients: Client[];
  health: Record<string, ClientHealth>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      const h = health[c.id];
      if (q) {
        const haystack = [c.name, c.document ?? "", c.email ?? "", c.phone ?? ""]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (status === "atrasados" && h?.score !== "critico") return false;
      if (status === "em_dia" && h?.score !== "saudavel") return false;
      if (status === "ativos" && h?.paymentLabel === "Sem ciclo ativo") return false;
      return true;
    });
  }, [clients, health, query, status]);

  async function handleDelete(client: Client) {
    if (!confirm(`Remover ${client.name}? Esta ação não pode ser desfeita.`)) return;
    setRemovingId(client.id);
    const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    setRemovingId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      alert(body?.error ?? "Não foi possível remover o cliente.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary/80" />
          <input
            className="h-12 w-full rounded-2xl border border-primary/18 bg-card/55 px-12 text-sm text-foreground shadow-[inset_0_1px_0_hsl(var(--primary)/0.08)] outline-none transition placeholder:text-muted-foreground focus:border-primary/55 focus:shadow-glow-sm"
            placeholder="Buscar cliente, documento ou funcao..."
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="h-12 rounded-2xl border border-primary/18 bg-card/55 px-4 text-sm font-medium text-foreground outline-none transition focus:border-primary/55 focus:shadow-glow-sm lg:w-48"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
        >
          <option value="todos">Todos os status</option>
          <option value="ativos">Ativos</option>
          <option value="em_dia">Em dia</option>
          <option value="atrasados">Atrasados</option>
        </select>
        <Button
          variant="outline"
          className="h-12 px-5"
          onClick={() => {
            setQuery("");
            setStatus("todos");
          }}
        >
          <SlidersHorizontal /> Limpar filtros
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          description="Ajuste sua busca ou cadastre um novo cliente."
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
              {filtered.map((c) => {
                const primaryRole = c.rolesInBusiness[0];
                const h = health[c.id];
                const healthBadge = h?.score === "critico" ? "destructive" : "default";

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
                        {h?.paymentLabel} | {c.email ?? c.phone ?? "sem contato"}
                      </span>
                    </Link>
                    <span className="truncate text-muted-foreground">
                      {primaryRole ? BUSINESS_ROLE_LABELS[primaryRole] : "Cliente"}
                    </span>
                    <Badge variant={healthBadge}>
                      {h?.score === "critico"
                        ? "Atrasado"
                        : h?.score === "atencao"
                          ? "Atencao"
                          : "Em dia"}
                    </Badge>
                    <span className="font-semibold text-foreground">
                      {formatBRL(h?.openAmount ?? 0)}
                    </span>
                    <span className={(h?.overdueAmount ?? 0) > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>
                      {formatBRL(h?.overdueAmount ?? 0)}
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <span className="font-medium text-foreground">{h?.nextDue ?? "-"}</span>
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
                        className="grid size-10 place-items-center rounded-full border border-primary/20 bg-card/35 text-muted-foreground transition hover:border-primary/50 hover:text-primary hover:shadow-glow-sm disabled:opacity-50"
                        aria-label={`Remover ${c.name}`}
                        type="button"
                        disabled={removingId === c.id}
                        onClick={() => handleDelete(c)}
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
